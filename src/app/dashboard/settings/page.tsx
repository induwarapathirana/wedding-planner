"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlannerSettings } from "@/components/dashboard/settings/PlannerSettings";
import { CoupleSettings } from "@/components/dashboard/settings/CoupleSettings";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [role, setRole] = useState<'couple' | 'planner' | 'vendor' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkRole();
    }, []);

    async function checkRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data) setRole(data.role);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading settings...</span>
            </div>
        );
    }

    if (role === 'planner') {
        return <PlannerSettings />;
    }

    // Default to Couple settings for couples (or fallback)
    return <CoupleSettings />;
}
