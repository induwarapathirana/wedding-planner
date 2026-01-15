import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type WeddingRole = 'owner' | 'editor' | 'viewer' | null;

export function useWeddingPermission(weddingId: string | null) {
    const [role, setRole] = useState<WeddingRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!weddingId) {
            setLoading(false);
            return;
        }

        checkPermission();
    }, [weddingId]);

    async function checkPermission() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setRole(null);
                return;
            }

            // 1. Check Global Planner Role (Super Admin for Weddings)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role?.toLowerCase() === 'planner' || profile?.role?.toLowerCase() === 'pro') {
                setRole('owner'); // Treat planner as owner for permission purposes
                return;
            }

            // 2. Check Collaborators Table (Standard Access)
            const { data, error } = await supabase
                .from('collaborators')
                .select('role')
                .eq('wedding_id', weddingId)
                .eq('user_id', user.id)
                .single();

            if (data) {
                setRole(data.role as WeddingRole);
            } else {
                setRole(null);
            }
        } catch (err) {
            console.error("Error checking permission:", err);
            setRole(null);
        } finally {
            setLoading(false);
        }
    }

    return {
        role,
        loading,
        canEdit: role === 'owner' || role === 'editor',
        isViewer: role === 'viewer'
    };
}
