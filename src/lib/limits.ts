export type PlanTier = 'free' | 'premium';

export const PLAN_LIMITS = {
    free: {
        guests: 1000,
        budget_items: 100,
        vendors: 300,
        events: 200, // Itinerary/Timeline
        checklist_items: 3000,
        collaborators: 5
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

export function checkLimit(tier: PlanTier = 'free', feature: keyof typeof PLAN_LIMITS.free, currentCount: number): boolean {
    const limit = PLAN_LIMITS[tier][feature];
    return currentCount < limit;
}
