export type PlanTier = 'free' | 'premium';

export const PLAN_LIMITS = {
    // Core planning lists are free and unlimited; Premium sells extras, not rows
    free: {
        guests: Infinity,
        budget_items: Infinity,
        vendors: Infinity,
        events: Infinity, // Itinerary/Timeline
        checklist_items: Infinity,
        inventory_items: Infinity,
        collaborators: 1 // Your partner
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
