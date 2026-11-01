"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getUserProfile } from "@/app/actions/data";
import { PlannerSettings } from "@/components/dashboard/settings/PlannerSettings";
import { CoupleSettings } from "@/components/dashboard/settings/CoupleSettings";
import { AccountTypeCard } from "@/components/dashboard/settings/AccountTypeCard";
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
            // Older accounts may still carry 'vendor' or 'pro'; both mean planner
            setRole(["planner", "vendor", "pro"].includes(user.role) ? "planner" : "couple");
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
        return (
            <div className="space-y-6">
                <PlannerSettings />
                <div className="mx-auto max-w-4xl"><AccountTypeCard role="planner" /></div>
            </div>
        );
    }

    // Default to Couple settings for couples (or fallback)
    return (
        <div className="space-y-6">
            <CoupleSettings weddingIdProp={weddingIdFromUrl ?? undefined} />
            <div className="container mx-auto max-w-4xl px-4 pb-8"><AccountTypeCard role="couple" /></div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
