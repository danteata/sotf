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
            const invitationToken = searchParams.get('token') || undefined;
            storeUser({ invitationToken });
        }
    }, [isLoaded, user, storeUser, searchParams]);

    return null;
}
