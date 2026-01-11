"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PlannerSettings } from "@/components/dashboard/settings/PlannerSettings";
import { CoupleSettings } from "@/components/dashboard/settings/CoupleSettings";
import { Loader2 } from "lucide-react";

function SettingsContent() {
    const [role, setRole] = useState<'couple' | 'planner' | 'vendor' | null>(null);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const weddingIdFromUrl = searchParams.get('weddingId');

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

    // If Planner is in a specific Wedding Workspace, show Wedding Settings (CoupleSettings)
    if (role === 'planner' && weddingIdFromUrl) {
        return <CoupleSettings weddingIdProp={weddingIdFromUrl} />;
    }

    if (role === 'planner') {
        return <PlannerSettings />;
    }

    // Default to Couple settings for couples (or fallback)
    return <CoupleSettings />;
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
