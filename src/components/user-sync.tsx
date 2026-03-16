import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";

export function UserSync() {
    const { user, isLoaded } = useUser();
    const storeUser = useMutation(api.users.store);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (isLoaded && user) {
            // Pass invitation token from URL if present
            const tokenFromUrl = searchParams.get('token') || undefined;
            let tokenFromStorage: string | undefined;
            try {
                tokenFromStorage = localStorage.getItem("pending_invitation_token") || undefined;
            } catch {
                tokenFromStorage = undefined;
            }
            const invitationToken = tokenFromUrl || tokenFromStorage;
            storeUser({ invitationToken }).then(() => {
                if (tokenFromStorage) {
                    try {
                        localStorage.removeItem("pending_invitation_token");
                    } catch {
                        // ignore
                    }
                }
            });
        }
    }, [isLoaded, user, storeUser, searchParams]);

    return null;
}
