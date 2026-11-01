/* eslint-disable @next/next/no-img-element */
import type { PlannerBrand } from "@/lib/brand";

/** "Planned by" credit with the planner's logo, on guest-facing pages. */
export function PlannerCredit({ planner, tone = "dark" }: { planner: PlannerBrand | null; tone?: "dark" | "light" }) {
    if (!planner) return null;
    const content = (
        <>
            {planner.logoUrl && <img src={planner.logoUrl} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />}
            <span>
                Planned by <b className="font-semibold">{planner.name}</b>
            </span>
        </>
    );
    const cls = `inline-flex items-center gap-2 text-sm ${tone === "light" ? "text-white/80" : "text-stone-500"}`;
    return planner.website ? (
        <a href={planner.website} target="_blank" rel="noreferrer" className={`${cls} hover:underline`}>
            {content}
        </a>
    ) : (
        <span className={cls}>{content}</span>
    );
}
