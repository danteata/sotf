import { v } from "convex/values";
import { mutation, query, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import {
    requireIdentity,
    requireUser,
    requireOrgAccess,
    isSuperAdmin,
    resolveOrgId,
} from "./auth";
import { requireWriteAccess } from "./scope";
import { requireFeature } from "./entitlements";
import {
    ensureAttendanceRecord,
    markMemberPresent,
    assertEventAppliesToMember,
} from "./attendance";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const TOKEN_ALGO = "sha256";

/** Hash an opaque token with SHA-256 (hex). Uses Web Crypto SubtleCrypto. */
async function hashToken(token: string): Promise<string> {
    const data = new TextEncoder().encode(token);
    const digestBuffer = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digestBuffer);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
}

/** Generate a 32-byte URL-safe opaque token. */
function generateToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // base64url without external dep
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Haversine distance in meters between two lat/long points. */
function haversineMeters(
    lat1: number,
    long1: number,
    lat2: number,
    long2: number,
): number {
    const R = 6371000; // Earth radius (m)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLong = toRad(long2 - long1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLong / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Compute whether a check-in is late relative to event_type.default_time + grace. */
function computeLate(
    eventType: Doc<"event_types"> | null,
    date: string,
    checkedInAt: string,
): { isLate: boolean; minutesLate: number } {
    if (!eventType?.default_time) return { isLate: false, minutesLate: 0 };
    // date is "YYYY-MM-DD", default_time is "HH:mm"
    const startIso = `${date}T${eventType.default_time}:00Z`;
    const startMs = Date.parse(startIso);
    if (Number.isNaN(startMs)) return { isLate: false, minutesLate: 0 };
    const graceMs = (eventType.grace_minutes ?? 0) * 60 * 1000;
    const deadlineMs = startMs + graceMs;
    const checkInMs = Date.parse(checkedInAt);
    if (Number.isNaN(checkInMs)) return { isLate: false, minutesLate: 0 };
    if (checkInMs <= deadlineMs) return { isLate: false, minutesLate: 0 };
    const minutesLate = Math.round((checkInMs - deadlineMs) / 60000);
    return { isLate: true, minutesLate };
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

async function logCheckInAudit(
    ctx: MutationCtx,
    args: {
        session_id: Id<"check_in_sessions">;
        organization_id: Id<"organizations">;
        member_id?: Id<"members">;
        member_name?: string;
        clerk_user_id?: string;
        method: string;
        outcome: string;
        reason?: string;
        device_info?: string;
    },
): Promise<void> {
    await ctx.db.insert("check_in_audit", {
        session_id: args.session_id,
        organization_id: args.organization_id,
        member_id: args.member_id,
        member_name: args.member_name,
        clerk_user_id: args.clerk_user_id,
        method: args.method,
        outcome: args.outcome,
        reason: args.reason,
        device_info: args.device_info,
        timestamp: new Date().toISOString(),
    });
}

// ---------------------------------------------------------------------------
// Member resolution (shared)
// ---------------------------------------------------------------------------

/**
 * Resolve the member linked to the authenticated Clerk identity.
 * Mirrors the fallback chain in scope.ts (by_user_id then by_email) and also
 * consults member_portal_links for explicit links. Returns null if no member
 * can be resolved (caller decides whether that is an error).
 */
async function resolveLinkedMember(
    ctx: QueryCtx,
): Promise<Doc<"members"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Explicit portal link (most authoritative).
    const link = await ctx.db
        .query("member_portal_links")
        .withIndex("by_clerk_user", (q) => q.eq("clerk_user_id", identity.subject))
        .filter((q) => q.eq(q.field("revoked_at"), undefined))
        .first();
    if (link) {
        const member = await ctx.db.get(link.member_id);
        if (member) return member;
    }

    // user_id linkage
    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
        .unique();
    if (user) {
        const byUserId = await ctx.db
            .query("members")
            .withIndex("by_user_id", (q) => q.eq("user_id", user._id))
            .first();
        if (byUserId) return byUserId;
    }

    // email fallback
    if (identity.email) {
        const byEmail = await ctx.db
            .query("members")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();
        if (byEmail) return byEmail;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Admin functions
// ---------------------------------------------------------------------------

export const createOrOpenSession = mutation({
    args: {
        date: v.string(),
        event_type_id: v.id("event_types"),
        event_id: v.optional(v.id("events")),
        closes_at: v.optional(v.string()),
        display_name: v.optional(v.string()),
        location_mode: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        radius_meters: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const orgId = await resolveOrgId(ctx);
        if (!orgId) throw new Error("Organization not set");

        const eventType = await ctx.db.get(args.event_type_id);
        if (!eventType) throw new Error("Event type not found");
        if (eventType.organization_id && eventType.organization_id !== orgId) {
            throw new Error("Event type does not belong to your organization");
        }

        // Geofenced check-in is a Pro feature (soft or strict).
        const locationMode = args.location_mode ?? "none";
        if (locationMode === "soft" || locationMode === "strict") {
            await requireFeature(ctx, "geofenced_check_in", orgId);
        }

        // Idempotent open: reuse an existing open session for (org, event_type, date).
        const existing = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_org_and_date", (q) =>
                q.eq("organization_id", orgId as Id<"organizations">).eq("date", args.date),
            )
            .filter((q) => q.eq(q.field("event_type_id"), args.event_type_id))
            .filter((q) => q.eq(q.field("status"), "open"))
            .first();

        if (existing) {
            // We never store raw tokens; for reuse we must regenerate a fresh
            // token + hash because the original raw token was only returned at
            // creation time. This keeps the QR working for the same session.
            const token = generateToken();
            const tokenHash = await hashToken(token);
            await ctx.db.patch(existing._id, { token_hash: tokenHash, token_algo: TOKEN_ALGO });
            return {
                sessionId: existing._id,
                token,
                qrUrl: buildQrUrl(token),
                created: false,
            };
        }

        // Ensure the attendance record (source of truth) exists.
        const attendanceId = await ensureAttendanceRecord(ctx, {
            orgId: orgId as Id<"organizations">,
            eventTypeId: args.event_type_id,
            date: args.date,
            eventId: args.event_id,
        });

        const token = generateToken();
        const tokenHash = await hashToken(token);
        const now = new Date().toISOString();
        const opensAt = now;
        const closesAt =
            args.closes_at ??
            new Date(
                Date.now() + (eventType.default_duration_minutes ?? 240) * 60_000,
            ).toISOString();

        const sessionId = await ctx.db.insert("check_in_sessions", {
            organization_id: orgId as Id<"organizations">,
            attendance_id: attendanceId,
            event_type_id: args.event_type_id,
            event_id: args.event_id,
            date: args.date,
            token_hash: tokenHash,
            token_algo: TOKEN_ALGO,
            status: "open",
            opens_at: opensAt,
            closes_at: closesAt,
            created_by: user._id,
            created_by_name: user.name,
            created_at: now,
            location_mode: locationMode,
            latitude: args.latitude,
            longitude: args.longitude,
            radius_meters: args.radius_meters,
            display_name:
                args.display_name ?? `${eventType.label} — ${args.date}`,
            check_in_count: 0,
        });

        return { sessionId, token, qrUrl: buildQrUrl(token), created: true };
    },
});

export const closeSession = mutation({
    args: { sessionId: v.id("check_in_sessions") },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        if (session.status === "closed" || session.status === "expired") {
            return { ok: true };
        }

        await ctx.db.patch(args.sessionId, {
            status: "closed",
            closed_at: new Date().toISOString(),
            closed_by: user._id,
        });
        return { ok: true };
    },
});

export const regenerateToken = mutation({
    args: { sessionId: v.id("check_in_sessions") },
    handler: async (ctx, args) => {
        await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        const token = generateToken();
        const tokenHash = await hashToken(token);
        await ctx.db.patch(args.sessionId, {
            token_hash: tokenHash,
            token_algo: TOKEN_ALGO,
        });
        return { token, qrUrl: buildQrUrl(token) };
    },
});

export const getSessionForAttendance = query({
    args: { attendanceId: v.id("attendance") },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const session = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_attendance", (q) => q.eq("attendance_id", args.attendanceId))
            .first();
        if (session) await requireOrgAccess(ctx, session.organization_id);
        return session;
    },
});

export const getLiveSessionStats = query({
    args: { sessionId: v.id("check_in_sessions") },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        // Recent check-ins (last 50 by creation time — bounded per Convex guideline)
        const recent = await ctx.db
            .query("member_attendance")
            .withIndex("by_check_in_session", (q) =>
                q.eq("check_in_session_id", args.sessionId),
            )
            .order("desc")
            .take(50);

        const enriched = await Promise.all(
            recent.map(async (ma) => {
                const member = await ctx.db.get(ma.member_id);
                return {
                    member_id: ma.member_id,
                    member_name: member?.name ?? null,
                    source: ma.source,
                    checked_in_at: ma.checked_in_at,
                    is_late: ma.is_late,
                };
            }),
        );

        return {
            sessionId: session._id,
            status: session.status,
            check_in_count: session.check_in_count ?? 0,
            recent: enriched,
        };
    },
});

export const listRecentSessions = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user)
            ? (args.organization_id ?? null)
            : await resolveOrgId(ctx, args.organization_id);

        const limit = Math.min(args.limit ?? 20, 100);

        const sessions = orgId
            ? await ctx.db
                  .query("check_in_sessions")
                  .withIndex("by_org_and_date", (q) =>
                      q.eq("organization_id", orgId as Id<"organizations">),
                  )
                  .order("desc")
                  .take(limit)
            : await ctx.db
                  .query("check_in_sessions")
                  .order("desc")
                  .take(limit);

        // Enrich with event type label
        return await Promise.all(
            sessions.map(async (s) => {
                const eventType = s.event_type_id
                    ? await ctx.db.get(s.event_type_id)
                    : null;
                return {
                    ...s,
                    event_type_label: eventType?.label ?? null,
                };
            }),
        );
    },
});

// ---------------------------------------------------------------------------
// Kiosk / steward functions
//
// The kiosk device is authenticated as an admin/steward Clerk account. It
// marks attendance on behalf of other people (members by name search, or
// brand-new visitors created as `members` rows with status "visitor"). This
// closes the "no smartphone / no app_access" gap without a separate visitors
// table — visitors simply become members with status "visitor" and can be
// converted to "active" later with no attendance-history migration.
// ---------------------------------------------------------------------------

/**
 * Resolve an open kiosk context for a session: returns safe display info plus
 * the attendance_id (so the kiosk can mark on behalf of members). Requires
 * write access (steward/admin). The token is never exposed to the kiosk UI;
 * the kiosk operates by sessionId only.
 */
export const kioskGetSession = query({
    args: { sessionId: v.id("check_in_sessions") },
    handler: async (ctx, args) => {
        await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        const eventType = session.event_type_id
            ? await ctx.db.get(session.event_type_id)
            : null;
        const org = await ctx.db.get(session.organization_id);

        return {
            sessionId: session._id,
            organization_id: session.organization_id,
            attendance_id: session.attendance_id ?? null,
            display_name: session.display_name ?? eventType?.label ?? "Check-in",
            date: session.date,
            event_type_id: session.event_type_id,
            event_type_label: eventType?.label ?? null,
            organization_name: org?.name ?? null,
            status: session.status,
            opens_at: session.opens_at,
            closes_at: session.closes_at,
            check_in_count: session.check_in_count ?? 0,
        };
    },
});

/**
 * Search members within the session's organization by name, phone, or email.
 * Bounded to 20 results. Used by the kiosk "type a name" autocomplete.
 */
export const kioskSearchMembers = query({
    args: {
        sessionId: v.id("check_in_sessions"),
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        const q = args.query.trim().toLowerCase();
        if (q.length < 2) return [];

        // Try a phone-prefix match first (most reliable at a kiosk).
        let phoneMatches: Doc<"members">[] = [];
        if (/^[0-9 +]/.test(q)) {
            phoneMatches = await ctx.db
                .query("members")
                .withIndex("by_org_and_phone", (qq) =>
                    qq
                        .eq("organization_id", session.organization_id)
                        .gte("phone", q),
                )
                .take(20);
            // gte on phone is a prefix scan only when the index is ordered by
            // the full string; filter to those that actually start with q.
            phoneMatches = phoneMatches.filter((m) =>
                (m.phone ?? "").toLowerCase().startsWith(q) && !m.archived_at,
            );
        }

        // Name substring + email substring scan (bounded) — for kiosk we
        // accept a short table scan of the org's members since orgs are
        // typically < a few thousand. Filter in-memory (no filter() in query
        // per guidelines would need an index; name substring has no index).
        const orgMembers = await ctx.db
            .query("members")
            .withIndex("by_org", (qq) => qq.eq("organization_id", session.organization_id))
            .take(500);

        const seen = new Set(phoneMatches.map((m) => m._id));
        const nameMatches: Doc<"members">[] = [];
        for (const m of orgMembers) {
            if (seen.has(m._id) || m.archived_at) continue;
            const name = (m.name + " " + (m.other_names ?? "")).toLowerCase();
            const email = (m.email ?? "").toLowerCase();
            const phone = (m.phone ?? "").toLowerCase();
            if (name.includes(q) || email.includes(q) || phone.includes(q)) {
                nameMatches.push(m);
                if (nameMatches.length + phoneMatches.length >= 20) break;
            }
        }

        // For each candidate, indicate whether already checked in to this session.
        const combined = [...phoneMatches, ...nameMatches].slice(0, 20);
        const attendanceId = session.attendance_id;
        const withStatus = await Promise.all(
            combined.map(async (m) => {
                let alreadyCheckedIn = false;
                if (attendanceId) {
                    const existing = await ctx.db
                        .query("member_attendance")
                        .withIndex("by_attendance_and_member", (qq) =>
                            qq.eq("attendance_id", attendanceId).eq("member_id", m._id),
                        )
                        .first();
                    alreadyCheckedIn = !!existing;
                }
                return {
                    member_id: m._id,
                    name: m.name,
                    other_names: m.other_names,
                    email: m.email,
                    phone: m.phone,
                    status: m.status,
                    already_checked_in: alreadyCheckedIn,
                };
            }),
        );

        // Sort: checked-in last, then alphabetical.
        withStatus.sort((a, b) => {
            if (a.already_checked_in !== b.already_checked_in) {
                return a.already_checked_in ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });
        return withStatus;
    },
});

/**
 * Check in an existing member from the kiosk. Steward-only. Marks present with
 * source "kiosk" and the steward's user id as checked_in_by. Idempotent.
 */
export const kioskCheckIn = mutation({
    args: {
        sessionId: v.id("check_in_sessions"),
        memberId: v.id("members"),
        device_info: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        if (session.status !== "open") {
            return { status: "session_closed" as const };
        }

        const member = await ctx.db.get(args.memberId);
        if (!member) {
            return { status: "member_not_found" as const };
        }
        if (member.organization_id !== session.organization_id) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: (await ctx.auth.getUserIdentity())?.subject,
                method: "kiosk",
                outcome: "wrong_org",
                device_info: args.device_info,
            });
            return { status: "wrong_org" as const };
        }

        const applies = await assertEventAppliesToMember(ctx, {
            member,
            eventTypeId: session.event_type_id,
        });
        if (!applies) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: (await ctx.auth.getUserIdentity())?.subject,
                method: "kiosk",
                outcome: "event_not_applicable",
                device_info: args.device_info,
            });
            return { status: "event_not_applicable" as const };
        }

        if (!session.attendance_id) {
            const attendanceId = await ensureAttendanceRecord(ctx, {
                orgId: session.organization_id,
                eventTypeId: session.event_type_id,
                date: session.date,
                eventId: session.event_id ?? undefined,
            });
            await ctx.db.patch(session._id, { attendance_id: attendanceId });
            session.attendance_id = attendanceId;
        }

        const eventType = await ctx.db.get(session.event_type_id);
        const nowIso = new Date().toISOString();
        const late = computeLate(eventType, session.date, nowIso);

        const result = await markMemberPresent(ctx, {
            attendanceId: session.attendance_id,
            memberId: member._id,
            source: "kiosk",
            checkedInBy: user._id,
            sessionId: session._id,
            checkedInAt: nowIso,
            isLate: late.isLate,
            minutesLate: late.minutesLate,
            deviceInfo: args.device_info,
        });

        await logCheckInAudit(ctx, {
            session_id: session._id,
            organization_id: session.organization_id,
            member_id: member._id,
            member_name: member.name,
            clerk_user_id: (await ctx.auth.getUserIdentity())?.subject,
            method: "kiosk",
            outcome: result.alreadyCheckedIn ? "already_checked_in" : "success",
            device_info: args.device_info,
        });

        if (!result.alreadyCheckedIn) {
            await ctx.db.patch(session._id, {
                check_in_count: (session.check_in_count ?? 0) + 1,
            });
        }

        return {
            status: result.alreadyCheckedIn ? ("already_checked_in" as const) : ("checked_in" as const),
            member_name: member.name,
            member_status: member.status,
            is_late: late.isLate,
            minutes_late: late.minutesLate,
        };
    },
});

/**
 * Find-or-create a visitor and check them in. Visitors are stored as
 * `members` rows with status "visitor". Idempotent on phone (then email):
 * returning visitors reuse their existing row and accumulate attendance
 * history on one record, so conversion to "active" member later needs no
 * attendance migration.
 */
export const kioskCheckInVisitor = mutation({
    args: {
        sessionId: v.id("check_in_sessions"),
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        device_info: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        if (session.status !== "open") {
            return { status: "session_closed" as const };
        }

        const trimmedName = args.name.trim();
        if (!trimmedName) return { status: "name_required" as const };
        const trimmedPhone = args.phone?.trim() || undefined;
        const trimmedEmail = args.email?.trim().toLowerCase() || undefined;

        // Find existing visitor/member by phone (then email) within the org.
        let member: Doc<"members"> | null = null;
        if (trimmedPhone) {
            member = await ctx.db
                .query("members")
                .withIndex("by_org_and_phone", (qq) =>
                    qq
                        .eq("organization_id", session.organization_id)
                        .eq("phone", trimmedPhone),
                )
                .first() ?? null;
        }
        if (!member && trimmedEmail) {
            member = await ctx.db
                .query("members")
                .withIndex("by_email", (qq) => qq.eq("email", trimmedEmail))
                .first() ?? null;
            // Email index is global; verify same org.
            if (member && member.organization_id !== session.organization_id) {
                member = null;
            }
        }

        const nowIso = new Date().toISOString();
        let createdNew = false;
        let wasVisitor = false;

        if (!member) {
            // Create a new visitor row.
            const memberId = await ctx.db.insert("members", {
                name: trimmedName,
                phone: trimmedPhone,
                email: trimmedEmail,
                status: "visitor",
                organization_id: session.organization_id,
                created_at: nowIso,
                updated_at: nowIso,
            });
            member = (await ctx.db.get(memberId))!;
            createdNew = true;
            wasVisitor = true;
        } else {
            wasVisitor = member.status === "visitor";
        }

        if (!session.attendance_id) {
            const attendanceId = await ensureAttendanceRecord(ctx, {
                orgId: session.organization_id,
                eventTypeId: session.event_type_id,
                date: session.date,
                eventId: session.event_id ?? undefined,
            });
            await ctx.db.patch(session._id, { attendance_id: attendanceId });
            session.attendance_id = attendanceId;
        }

        const eventType = await ctx.db.get(session.event_type_id);
        const late = computeLate(eventType, session.date, nowIso);

        const result = await markMemberPresent(ctx, {
            attendanceId: session.attendance_id,
            memberId: member._id,
            source: "kiosk",
            checkedInBy: user._id,
            sessionId: session._id,
            checkedInAt: nowIso,
            isLate: late.isLate,
            minutesLate: late.minutesLate,
            deviceInfo: args.device_info,
        });

        await logCheckInAudit(ctx, {
            session_id: session._id,
            organization_id: session.organization_id,
            member_id: member._id,
            member_name: member.name,
            clerk_user_id: (await ctx.auth.getUserIdentity())?.subject,
            method: "kiosk",
            outcome: result.alreadyCheckedIn ? "already_checked_in" : "success",
            reason: createdNew ? "new_visitor" : wasVisitor ? "returning_visitor" : "existing_member_via_visitor_form",
            device_info: args.device_info,
        });

        if (!result.alreadyCheckedIn) {
            await ctx.db.patch(session._id, {
                check_in_count: (session.check_in_count ?? 0) + 1,
            });
        }

        return {
            status: result.alreadyCheckedIn ? ("already_checked_in" as const) : ("checked_in" as const),
            member_name: member.name,
            member_status: member.status,
            created_new: createdNew,
            is_late: late.isLate,
            minutes_late: late.minutesLate,
        };
    },
});

/**
 * Live kiosk roster for a session (steward view). Returns the last N check-ins
 * for this session with member names + times, for the "who's here" panel.
 */
export const kioskLiveRoster = query({
    args: { sessionId: v.id("check_in_sessions") },
    handler: async (ctx, args) => {
        await requireWriteAccess(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        await requireOrgAccess(ctx, session.organization_id);

        const recent = await ctx.db
            .query("member_attendance")
            .withIndex("by_check_in_session", (q) =>
                q.eq("check_in_session_id", args.sessionId),
            )
            .order("desc")
            .take(30);

        return await Promise.all(
            recent.map(async (ma) => {
                const member = await ctx.db.get(ma.member_id);
                return {
                    member_id: ma.member_id,
                    member_name: member?.name ?? "Unknown",
                    member_status: member?.status ?? null,
                    source: ma.source,
                    checked_in_at: ma.checked_in_at,
                    is_late: ma.is_late,
                };
            }),
        );
    },
});

// ---------------------------------------------------------------------------
// Member / public functions
// ---------------------------------------------------------------------------

/**
 * Safe pre-auth display info for a scanned QR. Returns only what's needed to
 * render the "Sign in to check in to X" screen. Never returns ids, tokens, or
 * member lists.
 */
export const getSessionByToken = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const tokenHash = await hashToken(args.token);
        const session = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
            .unique();

        if (!session) return null;

        const eventType = session.event_type_id
            ? await ctx.db.get(session.event_type_id)
            : null;
        const org = await ctx.db.get(session.organization_id);

        return {
            display_name: session.display_name ?? eventType?.label ?? "Check-in",
            date: session.date,
            event_type_label: eventType?.label ?? null,
            organization_name: org?.name ?? null,
            status: session.status,
            opens_at: session.opens_at,
            closes_at: session.closes_at,
            requires_auth: true,
        };
    },
});

/**
 * Core member check-in. Transactional and idempotent. Every failure path
 * writes a check_in_audit row with the appropriate outcome.
 */
export const checkInWithToken = mutation({
    args: {
        token: v.string(),
        method: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        device_info: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);
        const method = args.method ?? "qr";
        const tokenHash = await hashToken(args.token);

        const session = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
            .unique();

        if (!session) {
            return { status: "invalid_token" as const };
        }

        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();

        // Validate session status + window.
        if (session.status !== "open") {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                clerk_user_id: identity.subject,
                method,
                outcome: session.status === "expired" ? "expired" : "session_closed",
                reason: `status=${session.status}`,
                device_info: args.device_info,
            });
            return { status: "session_closed" as const, session_display_name: session.display_name };
        }

        if (nowMs < Date.parse(session.opens_at) || nowMs > Date.parse(session.closes_at)) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                clerk_user_id: identity.subject,
                method,
                outcome: "outside_window",
                reason: `now=${nowIso} window=[${session.opens_at},${session.closes_at}]`,
                device_info: args.device_info,
            });
            return { status: "outside_window" as const };
        }

        // Resolve the linked member.
        const member = await resolveLinkedMember(ctx);
        if (!member) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                clerk_user_id: identity.subject,
                method,
                outcome: "member_not_linked",
                device_info: args.device_info,
            });
            return { status: "member_not_linked" as const };
        }

        // Org membership check.
        if (member.organization_id !== session.organization_id) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: identity.subject,
                method,
                outcome: "wrong_org",
                device_info: args.device_info,
            });
            return { status: "wrong_org" as const };
        }

        // Unit scoping check.
        const applies = await assertEventAppliesToMember(ctx, {
            member,
            eventTypeId: session.event_type_id,
        });
        if (!applies) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: identity.subject,
                method,
                outcome: "event_not_applicable",
                device_info: args.device_info,
            });
            return { status: "event_not_applicable" as const };
        }

        // Member status check (active or visitor).
        if (member.status !== "active" && member.status !== "visitor") {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: identity.subject,
                method,
                outcome: "member_inactive",
                reason: `status=${member.status}`,
                device_info: args.device_info,
            });
            return { status: "member_inactive" as const };
        }

        // Geofence (soft by default).
        if (
            session.location_mode &&
            session.location_mode !== "none" &&
            session.latitude != null &&
            session.longitude != null &&
            session.radius_meters != null &&
            args.latitude != null &&
            args.longitude != null
        ) {
            const distance = haversineMeters(
                session.latitude,
                session.longitude,
                args.latitude,
                args.longitude,
            );
            if (distance > session.radius_meters) {
                if (session.location_mode === "strict") {
                    await logCheckInAudit(ctx, {
                        session_id: session._id,
                        organization_id: session.organization_id,
                        member_id: member._id,
                        member_name: member.name,
                        clerk_user_id: identity.subject,
                        method,
                        outcome: "outside_geofence",
                        reason: `distance=${Math.round(distance)}m radius=${session.radius_meters}m (strict)`,
                        device_info: args.device_info,
                    });
                    return { status: "outside_geofence" as const };
                }
                // soft mode: log but allow
                await logCheckInAudit(ctx, {
                    session_id: session._id,
                    organization_id: session.organization_id,
                    member_id: member._id,
                    member_name: member.name,
                    clerk_user_id: identity.subject,
                    method,
                    outcome: "outside_geofence",
                    reason: `distance=${Math.round(distance)}m radius=${session.radius_meters}m (soft)`,
                    device_info: args.device_info,
                });
            }
        }

        // Idempotent check-in.
        const eventType = await ctx.db.get(session.event_type_id);
        const late = computeLate(eventType, session.date, nowIso);

        if (!session.attendance_id) {
            // Defensive: ensure attendance exists.
            const attendanceId = await ensureAttendanceRecord(ctx, {
                orgId: session.organization_id,
                eventTypeId: session.event_type_id,
                date: session.date,
                eventId: session.event_id ?? undefined,
            });
            await ctx.db.patch(session._id, { attendance_id: attendanceId });
            session.attendance_id = attendanceId;
        }

        const result = await markMemberPresent(ctx, {
            attendanceId: session.attendance_id,
            memberId: member._id,
            source: method as "qr" | "portal" | "kiosk" | "manual",
            sessionId: session._id,
            checkedInAt: nowIso,
            isLate: late.isLate,
            minutesLate: late.minutesLate,
            deviceInfo: args.device_info,
            lat: args.latitude,
            long: args.longitude,
        });

        if (result.alreadyCheckedIn) {
            await logCheckInAudit(ctx, {
                session_id: session._id,
                organization_id: session.organization_id,
                member_id: member._id,
                member_name: member.name,
                clerk_user_id: identity.subject,
                method,
                outcome: "already_checked_in",
                device_info: args.device_info,
            });
            return {
                status: "already_checked_in" as const,
                member_name: member.name,
                session_display_name: session.display_name,
            };
        }

        // Bump denormalized session counter.
        await ctx.db.patch(session._id, {
            check_in_count: (session.check_in_count ?? 0) + 1,
        });

        await logCheckInAudit(ctx, {
            session_id: session._id,
            organization_id: session.organization_id,
            member_id: member._id,
            member_name: member.name,
            clerk_user_id: identity.subject,
            method,
            outcome: "success",
            device_info: args.device_info,
        });

        return {
            status: "checked_in" as const,
            member_name: member.name,
            session_display_name: session.display_name,
            is_late: late.isLate,
            minutes_late: late.minutesLate,
        };
    },
});

// ---------------------------------------------------------------------------
// Portal queries (member-scoped, not admin-scoped)
// ---------------------------------------------------------------------------

export const getMyCheckInStatus = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { authenticated: false as const };

        const tokenHash = await hashToken(args.token);
        const session = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
            .unique();
        if (!session) return { authenticated: true as const, session: null };

        const member = await resolveLinkedMember(ctx);
        if (!member || !session.attendance_id) {
            return {
                authenticated: true as const,
                session: {
                    display_name: session.display_name,
                    status: session.status,
                    am_i_checked_in: false,
                },
            };
        }

        const existing = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance_and_member", (q) =>
                q
                    .eq("attendance_id", session.attendance_id!)
                    .eq("member_id", member._id),
            )
            .first();

        return {
            authenticated: true as const,
            session: {
                display_name: session.display_name,
                status: session.status,
                am_i_checked_in: !!existing,
                checked_in_at: existing?.checked_in_at ?? null,
            },
        };
    },
});

export const getMyAttendanceHistory = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const member = await resolveLinkedMember(ctx);
        if (!member) return [];

        const limit = Math.min(args.limit ?? 50, 100);
        const rows = await ctx.db
            .query("member_attendance")
            .withIndex("by_member", (q) => q.eq("member_id", member._id))
            .order("desc")
            .take(limit);

        return await Promise.all(
            rows.map(async (ma) => {
                const attendance = await ctx.db.get(ma.attendance_id);
                const eventType = attendance?.event_type_id
                    ? await ctx.db.get(attendance.event_type_id)
                    : null;
                return {
                    date: attendance?.date ?? null,
                    event_type_label: eventType?.label ?? null,
                    source: ma.source,
                    checked_in_at: ma.checked_in_at,
                    is_late: ma.is_late,
                };
            }),
        );
    },
});

export const getMyUpcomingSessions = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const member = await resolveLinkedMember(ctx);
        if (!member?.organization_id) return [];

        const limit = Math.min(args.limit ?? 10, 50);
        const today = new Date().toISOString().split("T")[0];
        const sessions = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_org_and_date", (q) =>
                q
                    .eq("organization_id", member.organization_id!)
                    .gte("date", today),
            )
            .take(limit);

        return await Promise.all(
            sessions.map(async (s) => {
                const eventType = s.event_type_id
                    ? await ctx.db.get(s.event_type_id)
                    : null;
                return {
                    sessionId: s._id,
                    display_name: s.display_name,
                    date: s.date,
                    event_type_label: eventType?.label ?? null,
                    status: s.status,
                    opens_at: s.opens_at,
                    closes_at: s.closes_at,
                };
            }),
        );
    },
});

export const getMyProfile = query({
    args: {},
    handler: async (ctx) => {
        const member = await resolveLinkedMember(ctx);
        if (!member) return null;
        const memberUnits = await ctx.db
            .query("member_units")
            .withIndex("by_member", (q) => q.eq("member_id", member._id))
            .collect();
        const unitNames: string[] = [];
        for (const mu of memberUnits) {
            const unit = await ctx.db.get(mu.unit_id);
            if (unit && mu.is_active) unitNames.push(unit.name);
        }

        let avatarUrl = member.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith("http")) {
            avatarUrl = (await ctx.storage.getUrl(avatarUrl as any)) ?? undefined;
        }

        const org = member.organization_id ? await ctx.db.get(member.organization_id) : null;

        return {
            id: member._id,
            name: member.name,
            other_names: member.other_names,
            email: member.email,
            phone: member.phone,
            status: member.status,
            gender: member.gender,
            dob: member.dob,
            avatar_url: avatarUrl,
            address: member.address,
            city: member.city,
            state: member.state,
            country: member.country,
            joined_date: member.joined_date,
            organization_name: org?.name ?? null,
            unit_names: unitNames,
        };
    },
});

// ---------------------------------------------------------------------------
// Portal account linking
// ---------------------------------------------------------------------------

/**
 * Link the authenticated Clerk user to a member record. Looks up the member by
 * email (matching the Clerk identity email) within the caller's organization
 * scope. Idempotent: re-linking updates an existing link.
 */
export const linkMyAccount = mutation({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);
        if (!identity.email) {
            throw new Error("Your Clerk account has no email — cannot link a member record");
        }

        const member = await ctx.db
            .query("members")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!member) {
            return { status: "no_matching_member" as const };
        }
        if (!member.organization_id) {
            return { status: "no_matching_member" as const };
        }

        // Optional org filter: caller can restrict to a specific org.
        if (args.organization_id && member.organization_id !== args.organization_id) {
            return { status: "wrong_org" as const };
        }

        // Reuse existing non-revoked link or create one.
        const existing = await ctx.db
            .query("member_portal_links")
            .withIndex("by_clerk_user", (q) => q.eq("clerk_user_id", identity.subject))
            .filter((q) => q.eq(q.field("revoked_at"), undefined))
            .first();

        if (existing && existing.member_id === member._id) {
            return { status: "already_linked" as const, member_name: member.name };
        }

        if (existing) {
            // Revoke the old link and create a new one (org/member change).
            await ctx.db.patch(existing._id, {
                revoked_at: new Date().toISOString(),
            });
        }

        await ctx.db.insert("member_portal_links", {
            member_id: member._id,
            organization_id: member.organization_id,
            clerk_user_id: identity.subject,
            linked_by: "self_email",
            linked_at: new Date().toISOString(),
        });

        return { status: "linked" as const, member_name: member.name };
    },
});

export const getMyLinkStatus = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { authenticated: false as const };

        const link = await ctx.db
            .query("member_portal_links")
            .withIndex("by_clerk_user", (q) => q.eq("clerk_user_id", identity.subject))
            .filter((q) => q.eq(q.field("revoked_at"), undefined))
            .first();

        if (!link) {
            return {
                authenticated: true as const,
                linked: false as const,
                email: identity.email ?? null,
            };
        }

        const member = await ctx.db.get(link.member_id);
        const org = await ctx.db.get(link.organization_id);
        return {
            authenticated: true as const,
            linked: true as const,
            member_name: member?.name ?? null,
            organization_name: org?.name ?? null,
        };
    },
});

// ---------------------------------------------------------------------------
// Internal: scheduled session expiry (called by convex/crons.ts)
// ---------------------------------------------------------------------------

export const expireSessions = internalMutation({
    args: {},
    handler: async (ctx) => {
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();

        // Process in bounded batches (Convex transaction limits).
        const openSessions = await ctx.db
            .query("check_in_sessions")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .take(100);

        let expired = 0;
        for (const s of openSessions) {
            if (Date.parse(s.closes_at) < nowMs) {
                await ctx.db.patch(s._id, { status: "expired" });
                expired++;
            }
        }

        // If we hit the batch cap, schedule another run to keep going.
        if (openSessions.length === 100) {
            await ctx.scheduler.runAfter(0, internal.check_ins.expireSessions, {});
        }

        return { expired, run_at: nowIso };
    },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQrUrl(token: string): string {
    const origin =
        (typeof process !== "undefined" && process.env?.VITE_APP_URL) ||
        (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/check-in/${token}`;
}