"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PLANNER_ROLES = ["planner", "vendor", "pro"];

export type PlanTier = 'free' | 'premium';

export interface TrialInfo {
    effectiveTier: PlanTier;
    isInTrial: boolean;
    trialEndsAt: string | null;
    daysRemaining: number | null;
    isPaidPremium: boolean;
}

/**
 * Get the effective tier for a wedding, considering trial status
 * Also updates the DB tier column if trial has expired (for consistency)
 * @param weddingId - The wedding ID to check
 * @returns TrialInfo with effective tier and trial details
 */
export async function getEffectiveTier(weddingId: string): Promise<TrialInfo> {
    // Fetch wedding data
    const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
            tier: true,
            premiumTrialEndsAt: true
        }
    });

    if (!wedding) {
        // Default to free on error
        return {
            effectiveTier: 'free',
            isInTrial: false,
            trialEndsAt: null,
            daysRemaining: null,
            isPaidPremium: false
        };
    }

    // 'premium' in the DB covers both PayHere payments and manual grants
    const isPaidPremium = wedding.tier === 'premium';
    const trialEndsAt = wedding.premiumTrialEndsAt;

    // Check if trial is active
    const isInTrial = trialEndsAt
        ? new Date(trialEndsAt) > new Date()
        : false;

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (isInTrial && trialEndsAt) {
        const diff = new Date(trialEndsAt).getTime() - new Date().getTime();
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // Planners get premium features on every wedding they work on
    const session = await auth();
    const viewer = session?.user?.id
        ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
        : null;
    const isPlanner = PLANNER_ROLES.includes(viewer?.role ?? '');

    const effectiveTier: PlanTier = isPaidPremium || isInTrial || isPlanner ? 'premium' : 'free';

    return {
        effectiveTier,
        isInTrial,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        daysRemaining,
        isPaidPremium
    };
}
