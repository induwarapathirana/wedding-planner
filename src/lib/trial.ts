"use server";

import { prisma } from "@/lib/prisma";

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

    // Determine effective tier
    const effectiveTier: PlanTier = isPaidPremium || isInTrial ? 'premium' : 'free';

    // AUTO-SYNC DB: If trial has expired and user hasn't paid, update tier to 'free' in DB
    // This keeps the DB tier column in sync for admin visibility
    if (!isPaidPremium && !isInTrial && wedding.tier === 'premium') {
        await prisma.wedding.update({
            where: { id: weddingId },
            data: { tier: 'free' }
        });
    }

    return {
        effectiveTier,
        isInTrial,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        daysRemaining,
        isPaidPremium
    };
}
