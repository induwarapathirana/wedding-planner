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
    // A user is 'premium' ONLY if:
    // 1. They have a verified payment_id
    // 2. OR their trial is still active
    // We IGNORE the 'tier' column unless payment_id is present.
    const isPaidPremium = !!wedding.payment_id;
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
    const effectiveTier: PlanTier = isPaidPremium || isInTrial ? 'premium' : 'free';

    return {
        effectiveTier,
        isInTrial,
        trialEndsAt,
        daysRemaining,
        isPaidPremium
    };
}
