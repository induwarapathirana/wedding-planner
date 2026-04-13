import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkWeddingPermission } from "@/app/actions/data";

export type WeddingRole = 'owner' | 'editor' | 'viewer' | null;

export function useWeddingPermission(weddingId: string | null) {
    const [role, setRole] = useState<WeddingRole>(null);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();

    useEffect(() => {
        if (!weddingId || !session?.user) {
            setLoading(false);
            return;
        }

        async function check() {
            try {
                const result = await checkWeddingPermission(weddingId!);
                setRole(result);
            } catch (err) {
                console.error("Error checking permission:", err);
                setRole(null);
            } finally {
                setLoading(false);
            }
        }

        check();
    }, [weddingId, session]);

    return {
        role,
        loading,
        canEdit: role === 'owner' || role === 'editor',
        isViewer: role === 'viewer'
    };
}
