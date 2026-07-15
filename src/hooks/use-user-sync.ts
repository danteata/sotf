import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";

// Module-scoped so navigating between protected routes (which remounts this
// hook's component) doesn't re-trigger a sync/loading flash for a user
// that's already been synced this session.
let syncedUserId: string | null = null;

// Syncs the signed-in Clerk user into Convex (creating the `users` row and
// applying any pending invitation). Returns true once the sync attempt has
// settled, so callers can gate org-scoped rendering until organization_id
// (if any) has actually been attached — avoiding a render race where
// dashboard queries fire before the user's org is set.
export function useUserSync() {
    const { user, isLoaded } = useUser();
    const storeUser = useMutation(api.users.store);
    const [searchParams] = useSearchParams();
    // True once we already know there's nothing left to sync for this user
    // (or there's no user at all) — computed at render time, no state needed.
    const knownSynced = isLoaded && (!user || syncedUserId === user.id);
    // Only flips once the in-flight mutation settles.
    const [asyncSynced, setAsyncSynced] = useState(false);
    const startedForUserId = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded || !user) return;
        if (syncedUserId === user.id) return;
        if (startedForUserId.current === user.id) return; // already in flight

        startedForUserId.current = user.id;

        const tokenFromUrl = searchParams.get('token') || undefined;
        let tokenFromStorage: string | undefined;
        try {
            if (tokenFromUrl) {
                localStorage.setItem("pending_invitation_token", tokenFromUrl);
            }
            tokenFromStorage = localStorage.getItem("pending_invitation_token") || undefined;
        } catch {
            tokenFromStorage = undefined;
        }
        const invitationToken = tokenFromUrl || tokenFromStorage;

        storeUser({ invitationToken })
            .catch((err) => {
                console.error("Failed to sync user", err);
            })
            .finally(() => {
                try {
                    localStorage.removeItem("pending_invitation_token");
                } catch {
                    // ignore
                }
                syncedUserId = user.id;
                setAsyncSynced(true);
            });
    }, [isLoaded, user, storeUser, searchParams]);

    return knownSynced || asyncSynced;
}
