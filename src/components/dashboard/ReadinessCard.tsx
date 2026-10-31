"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { DashboardStats } from "./CoupleDashboard";

type Pillar = {
    label: string;
    value: number; // 0..1
    weight: number;
    detail: string;
};

type Suggestion = { text: string; href: string };

function ratio(part: number, whole: number) {
    return whole > 0 ? Math.min(part / whole, 1) : 0;
}

/**
 * Turns the overview stats into one readiness score plus the next few steps
 * that would move it the most. Weights favour the work that takes longest.
 */
export function computeReadiness(stats: DashboardStats, daysToGo: number | null) {
    const tasksDone = stats.tasksDone ?? 0;
    const tasksTotal = stats.tasksTotal ?? 0;
    const vendorsBooked = stats.vendorsBooked ?? 0;
    const vendorsTotal = stats.vendorsTotal ?? 0;
    const responded = stats.confirmedGuest + (stats.declinedGuest ?? 0);
    const paid = stats.paidBudget ?? 0;

    const pillars: Pillar[] = [
        { label: "Checklist", value: ratio(tasksDone, tasksTotal), weight: 35, detail: `${tasksDone}/${tasksTotal} tasks` },
        { label: "Vendors", value: ratio(vendorsBooked, vendorsTotal), weight: 25, detail: `${vendorsBooked}/${vendorsTotal} booked` },
        { label: "RSVPs", value: ratio(responded, stats.guestCount), weight: 20, detail: `${responded}/${stats.guestCount} replied` },
        { label: "Payments", value: ratio(paid, stats.totalBudget), weight: 20, detail: `${Math.round(ratio(paid, stats.totalBudget) * 100)}% paid` },
    ];

    const score = Math.round(pillars.reduce((acc, p) => acc + p.value * p.weight, 0));

    const suggestions: Suggestion[] = [];
    if (tasksTotal === 0) suggestions.push({ text: "Build your checklist", href: "/dashboard/checklist?new=true" });
    if (vendorsTotal === 0) suggestions.push({ text: "Add your first vendor", href: "/dashboard/vendors" });
    if (stats.guestCount === 0) suggestions.push({ text: "Start your guest list", href: "/dashboard/guests" });
    if (stats.estBudget === 0) suggestions.push({ text: "Set a total budget", href: "/dashboard/settings" });
    if (stats.pendingGuest > 0 && daysToGo !== null && daysToGo < 60)
        suggestions.push({ text: `Chase ${stats.pendingGuest} pending RSVPs`, href: "/dashboard/guests" });
    if (vendorsTotal > 0 && vendorsBooked < vendorsTotal)
        suggestions.push({ text: `Confirm ${vendorsTotal - vendorsBooked} vendors`, href: "/dashboard/vendors" });
    if (stats.estBudget > 0 && stats.totalBudget > stats.estBudget)
        suggestions.push({ text: "Planned costs exceed your budget", href: "/dashboard/budget" });

    return { score, pillars, suggestions: suggestions.slice(0, 3) };
}

function scoreLabel(score: number) {
    if (score >= 90) return "Ready to say I do";
    if (score >= 65) return "Looking great";
    if (score >= 35) return "Coming together";
    return "Just getting started";
}

export function ReadinessCard({ stats, daysToGo }: { stats: DashboardStats; daysToGo: number | null }) {
    const { score, pillars, suggestions } = computeReadiness(stats, daysToGo);

    const radius = 52;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="rounded-3xl border-2 border-border bg-white p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex items-center gap-5">
                    <div className="relative h-32 w-32 flex-shrink-0">
                        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`Wedding readiness ${score} percent`}>
                            <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-gray-100" />
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="none"
                                strokeWidth="10"
                                strokeLinecap="round"
                                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - score / 100)}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-foreground tabular-nums">{score}%</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ready</span>
                        </div>
                    </div>
                    <div className="md:hidden">
                        <h3 className="font-serif text-xl font-bold text-foreground">{scoreLabel(score)}</h3>
                        <p className="text-sm text-muted-foreground">Your wedding readiness</p>
                    </div>
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                    <div className="hidden md:block">
                        <h3 className="font-serif text-xl font-bold text-foreground">{scoreLabel(score)}</h3>
                        <p className="text-sm text-muted-foreground">Your wedding readiness, based on tasks, vendors, RSVPs and payments.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                        {pillars.map((p) => (
                            <div key={p.label}>
                                <div className="flex items-baseline justify-between text-xs">
                                    <span className="font-semibold text-foreground">{p.label}</span>
                                    <span className="text-muted-foreground tabular-nums">{p.detail}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-700"
                                        style={{ width: `${Math.round(p.value * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:w-64 md:border-l md:border-border md:pl-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next steps</p>
                    {suggestions.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" /> You're on track. Enjoy it!
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {suggestions.map((s) => (
                                <li key={s.text}>
                                    <Link
                                        href={s.href}
                                        className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                                    >
                                        <span className="truncate">{s.text}</span>
                                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-transform" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
