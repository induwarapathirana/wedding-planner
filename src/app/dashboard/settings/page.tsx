"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getUserProfile } from "@/app/actions/data";
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
        const user = await getUserProfile();
        if (user) {
            setRole(user.role as any);
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
