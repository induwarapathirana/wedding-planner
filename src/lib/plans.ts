/** Planner Pro prices and plan contents for screens (the server enforces them in src/lib/billing.ts). */

export const PRO_PRICE = { month: 4900, year: 49000 } as const;
export const FREE_ACTIVE_WEDDINGS = 2;

export const FREE_FEATURES = [
    `Up to ${FREE_ACTIVE_WEDDINGS} client weddings in progress`,
    "Unlimited leads and the pipeline board",
    "Your inquiry form",
    "Every planning tool on each wedding",
];

export const PRO_FEATURES = [
    "Unlimited client weddings",
    "Your own templates for new clients",
    "Your logo and colours on clients' pages",
    "One calendar feed for every wedding",
    "Premium for every client's wedding",
];

export const lkr = (n: number) => `LKR ${n.toLocaleString("en")}`;
