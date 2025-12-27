"use client";

import { useEffect, useState } from "react";
import { getEffectiveTier, TrialInfo } from "@/lib/trial";
import { LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";

interface TierGateProps {
    weddingId: string | null;
    children: React.ReactNode;
    featureName?: string;
}

/**
 * Component that blocks page access if user is on free tier
 * Shows upgrade prompt instead of page content
 */
export function TierGate({ weddingId, children, featureName = "This feature" }: TierGateProps) {
    const [loading, setLoading] = useState(true);
    const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);

    useEffect(() => {
        async function checkTier() {
            if (!weddingId) {
                setLoading(false);
                return;
            }
            const info = await getEffectiveTier(weddingId);
            setTrialInfo(info);
            setLoading(false);
        }
        checkTier();
    }, [weddingId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Allow access if premium (paid or trial active)
    if (trialInfo?.effectiveTier === 'premium') {
        return <>{children}</>;
    }

    // Block access - show upgrade prompt
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-full mb-6">
                <LockKeyhole className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Premium Feature
            </h2>
            <p className="text-gray-600 mb-6 max-w-md">
                {featureName} is available on the Premium plan.
                {trialInfo?.trialEndsAt && !trialInfo?.isInTrial && (
                    <span className="block mt-2 text-red-500 font-medium">
                        Your trial has expired.
                    </span>
                )}
            </p>
            <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
            >
                <Sparkles className="w-5 h-5" />
                Upgrade to Premium
            </Link>
            <p className="text-sm text-gray-500 mt-4">
                Unlock unlimited guests, vendors, budget items, and more!
            </p>
        </div>
    );
}

/**
 * Hook to check if user can add more items based on tier limits
 */
export function useCanAddItem(
    tier: 'free' | 'premium',
    feature: 'guests' | 'budget_items' | 'vendors' | 'events' | 'checklist_items' | 'collaborators',
    currentCount: number
): { canAdd: boolean; limit: number } {
    const limits = {
        free: {
            guests: 10,
            budget_items: 3,
            vendors: 3,
            events: 2,
            checklist_items: 3,
            collaborators: 0
        },
        premium: {
            guests: Infinity,
            budget_items: Infinity,
            vendors: Infinity,
            events: Infinity,
            checklist_items: Infinity,
            collaborators: Infinity
        }
    };

    const limit = limits[tier][feature];
    return {
        canAdd: currentCount < limit,
        limit
    };
}
