/**
 * Public queries for plan entitlements (client UI gates).
 * Enforcement still lives in mutations via entitlements.ts helpers.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getUserSafe, normalizeOrgId, isSuperAdmin } from "./auth";
import { getEntitlementsForOrg, FREE_MEMBER_LIMIT } from "./entitlements";

export const getMyEntitlements = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const user = await getUserSafe(ctx);
        if (!user) {
            return {
                plan: "free" as const,
                isPro: false,
                memberCount: 0,
                memberLimit: FREE_MEMBER_LIMIT,
                features: {
                    geofenced_check_in: false,
                    audit_trail: false,
                    advanced_exports: false,
                    map: false,
                    unlimited_members: false,
                    qr_check_in: true,
                    attendance: true,
                    financial: true,
                },
            };
        }

        if (isSuperAdmin(user) && !args.organization_id && !user.organization_id) {
            return {
                plan: "pro" as const,
                isPro: true,
                memberCount: 0,
                memberLimit: null,
                features: {
                    geofenced_check_in: true,
                    audit_trail: true,
                    advanced_exports: true,
                    map: true,
                    unlimited_members: true,
                    qr_check_in: true,
                    attendance: true,
                    financial: true,
                },
            };
        }

        const orgId =
            normalizeOrgId(ctx, args.organization_id) ??
            normalizeOrgId(ctx, user.organization_id);

        if (!orgId) {
            return {
                plan: "free" as const,
                isPro: false,
                memberCount: 0,
                memberLimit: FREE_MEMBER_LIMIT,
                features: {
                    geofenced_check_in: false,
                    audit_trail: false,
                    advanced_exports: false,
                    map: false,
                    unlimited_members: false,
                    qr_check_in: true,
                    attendance: true,
                    financial: true,
                },
            };
        }

        // Super-admins get full feature access for UX; server mutations still allow them.
        if (isSuperAdmin(user)) {
            const base = await getEntitlementsForOrg(ctx, orgId);
            return {
                ...base,
                isPro: true,
                plan: "pro" as const,
                memberLimit: null,
                features: {
                    ...base.features,
                    geofenced_check_in: true,
                    audit_trail: true,
                    advanced_exports: true,
                    map: true,
                    unlimited_members: true,
                },
            };
        }

        return await getEntitlementsForOrg(ctx, orgId);
    },
});
