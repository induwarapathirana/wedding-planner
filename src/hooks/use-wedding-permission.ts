import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { prisma } from "@/lib/prisma";

export type WeddingRole = 'owner' | 'editor' | 'viewer' | null;

// Server action to check permission
async function checkWeddingPermission(weddingId: string): Promise<WeddingRole> {
    "use server";
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user?.id) return null;

    const { prisma: db } = await import("@/lib/prisma");
    const collab = await db.collaborator.findUnique({
        where: {
            weddingId_userId: {
                weddingId,
                userId: session.user.id,
            },
        },
        select: { role: true },
    });

    return (collab?.role as WeddingRole) || null;
}

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
