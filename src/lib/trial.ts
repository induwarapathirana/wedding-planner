import { supabase } from "./supabase";

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
    const { data: wedding, error } = await supabase
        .from('weddings')
        .select('tier, premium_trial_ends_at, payment_id')
        .eq('id', weddingId)
        .single();

    if (error || !wedding) {
        // Default to free on error
        return {
            effectiveTier: 'free',
            isInTrial: false,
            trialEndsAt: null,
            daysRemaining: null,
            isPaidPremium: false
        };
    }

    // STRICT CHECK:
    // A user is 'premium' if:
    // 1. They have a verified payment_id
    // 2. OR their trial is still active
    // 3. OR the DB explicitly says 'premium' (Manual Grant)
    const isPaidPremium = !!wedding.payment_id;
    const isManualPremium = wedding.tier === 'premium';
    const trialEndsAt = wedding.premium_trial_ends_at;

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
    // If DB says premium, we trust it (allows manual overrides)
    const effectiveTier: PlanTier = isManualPremium || isPaidPremium || isInTrial ? 'premium' : 'free';

    // AUTO-SYNC LOGIC REMOVED: We no longer auto-downgrade based on payment_id alone,
    // as this breaks manual grants.
    // If we want auto-downgrade for trials, it should be a separate scheduled job, not on read.

    return {
        effectiveTier,
        isInTrial,
        trialEndsAt,
        daysRemaining,
        isPaidPremium
    };
}
