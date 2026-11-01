"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { getMyPlan } from "@/app/actions/data";
import { cn } from "@/lib/utils";

type Plan = NonNullable<Awaited<ReturnType<typeof getMyPlan>>>;

const daysLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)) : 0);

/** A one-line nudge about the planner's plan: trial days, a failed payment, or the free limit. */
export function PlanBanner({ plan: given }: { plan?: Plan | null }) {
    const [plan, setPlan] = useState<Plan | null>(given ?? null);
    useEffect(() => {
        if (given === undefined) getMyPlan().then(setPlan);
    }, [given]);
    if (!plan?.isPlanner) return null;

    let text: string | null = null;
    let tone = "bg-gray-50 text-gray-700 border-gray-200";
    if (plan.state === "trial") {
        const d = daysLeft(plan.trialEndsAt);
        text = d <= 7 ? `Your Planner Pro trial ends in ${d} ${d === 1 ? "day" : "days"}. Subscribe to keep templates, branding and unlimited weddings.` : `Planner Pro trial: ${d} days left.`;
        tone = d <= 7 ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-violet-50 text-violet-900 border-violet-200";
    } else if (plan.state === "grace") {
        text = "PayHere couldn't take your last Planner Pro payment. Update your card to keep Pro.";
        tone = "bg-rose-50 text-rose-900 border-rose-200";
    } else if (plan.state === "free") {
        text =
            plan.activeWeddings >= plan.freeLimit
                ? `You have ${plan.activeWeddings} client weddings in progress, the free plan's limit. Upgrade to Planner Pro for unlimited weddings.`
                : `Free plan · ${plan.activeWeddings} of ${plan.freeLimit} client weddings in progress.`;
        if (plan.activeWeddings >= plan.freeLimit) tone = "bg-amber-50 text-amber-900 border-amber-200";
    }
    if (!text) return null;

    return (
        <Link href="/dashboard/billing" className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm hover:opacity-90", tone)}>
            <Crown className="h-4 w-4 shrink-0" />
            <span className="flex-1">{text}</span>
            <span className="shrink-0 font-semibold underline underline-offset-4">Billing</span>
        </Link>
    );
}

/** Shown in place of a Pro-only feature for free planners. */
export function UpgradeCard({ feature, detail }: { feature: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-semibold text-amber-900"><Crown className="h-4 w-4" /> {feature} is part of Planner Pro</p>
            <p className="mt-1 text-sm text-amber-900/80">{detail}</p>
            <Link href="/dashboard/billing" className="mt-3 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">See Planner Pro</Link>
        </div>
    );
}
