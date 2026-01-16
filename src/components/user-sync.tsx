import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

export function UserSync() {
    const { user, isLoaded } = useUser();
    const storeUser = useMutation(api.users.store);

    useEffect(() => {
        if (isLoaded && user) {
            storeUser({});
        }
    }, [isLoaded, user, storeUser]);

    return null;
}
