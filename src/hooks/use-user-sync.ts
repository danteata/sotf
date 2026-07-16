import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";

// Module-scoped so navigating between protected routes (which remounts this
// hook's component) doesn't re-trigger a sync/loading flash for a user
// that's already been synced this session.
let syncedUserId: string | null = null;

// Syncs the signed-in Clerk user into Convex (creating the `users` row and
// applying any pending invitation). Returns whether the sync has settled
// successfully, plus an error/retry surface so callers can avoid stranding a
// user on an infinite spinner when the mutation fails.
export function useUserSync() {
    const { user, isLoaded } = useUser();
    const storeUser = useMutation(api.users.store);
    const [searchParams] = useSearchParams();
    // True once we already know there's nothing left to sync for this user
    // (or there's no user at all) — computed at render time, no state needed.
    const knownSynced = isLoaded && (!user || syncedUserId === user.id);
    // Only flips once the in-flight mutation resolves successfully.
    const [asyncSynced, setAsyncSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const startedForUserId = useRef<string | null>(null);

    const sync = useCallback(() => {
        if (!user) return;
        if (syncedUserId === user.id) return;

        startedForUserId.current = user.id;
        setError(null);

        const tokenFromUrl = searchParams.get("token") || undefined;
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
            .then(() => {
                // Only mark synced on success — a failed sync must NOT ungate
                // org-scoped queries, or downstream hooks receive a null user.
                syncedUserId = user.id;
                setAsyncSynced(true);
            })
            .catch((err: unknown) => {
                console.error("Failed to sync user", err);
                setError(err instanceof Error ? err : new Error("Failed to sync user"));
                // Allow a retry on the next attempt.
                startedForUserId.current = null;
            })
            .finally(() => {
                try {
                    localStorage.removeItem("pending_invitation_token");
                } catch {
                    // ignore
                }
            });
    }, [user, storeUser, searchParams]);

    useEffect(() => {
        if (!isLoaded || !user) return;
        if (syncedUserId === user.id) return;
        if (startedForUserId.current === user.id) return; // already in flight
        sync();
    }, [isLoaded, user, sync]);

    const retry = useCallback(() => {
        startedForUserId.current = null;
        setAsyncSynced(false);
        sync();
    }, [sync]);

    return {
        isSynced: knownSynced || asyncSynced,
        isError: !!error,
        error,
        retry,
    };
}
