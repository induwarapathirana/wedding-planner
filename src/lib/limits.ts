export type PlanTier = 'free' | 'premium';

export const PLAN_LIMITS = {
    free: {
        guests: 10,
        budget_items: 3,
        vendors: 3,
        events: 2, // Itinerary/Timeline
        checklist_items: 3,
        inventory_items: 5,
        collaborators: 0
    },
    premium: {
        guests: Infinity,
        budget_items: Infinity,
        vendors: Infinity,
        events: Infinity,
        checklist_items: Infinity,
        inventory_items: Infinity,
        collaborators: Infinity
    }
} as const;

export function checkLimit(tier: PlanTier = 'free', feature: keyof typeof PLAN_LIMITS.free, currentCount: number): boolean {
    const limit = PLAN_LIMITS[tier][feature];
    return currentCount < limit;
}
