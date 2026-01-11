
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";
import { formatLargeNumber, getNumberFontSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlanComparisonModal } from "@/components/dashboard/plan-comparison-modal";
import { useState } from "react";

type WeddingData = {
    id: string;
    couple_name_1: string;
    couple_name_2: string;
    wedding_date: string;
    currency?: string;
    target_guest_count?: number;
    estimated_budget?: number;
    tier?: 'free' | 'premium';
};

type CoupleDashboardProps = {
    wedding: WeddingData;
    stats: {
        guestCount: number;
        confirmedGuest: number;
        pendingGuest: number;
        targetGuest: number;
        totalBudget: number;
        estBudget: number;
        currency: string;
    };
    upcomingTasks: any[];
    pendingPayments: any[];
    pendingGuests: any[];
};

export function CoupleDashboard({ wedding, stats, upcomingTasks, pendingPayments, pendingGuests }: CoupleDashboardProps) {
    const router = useRouter();
    const [showPlanModal, setShowPlanModal] = useState(false);
    const daysToGo = differenceInDays(parseISO(wedding.wedding_date), new Date());

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
                        Welcome Back, {wedding.couple_name_1} & {wedding.couple_name_2}
                    </h2>
                    <p className="mt-1 text-sm md:text-base text-muted-foreground">Here is what is happening with your wedding.</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/checklist?new=true')}
                    className="flex-shrink-0 w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 md:py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                    + Add to Checklist
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
                <Link href="/dashboard/budget" className="block group">
                    <div className="min-h-[160px] md:h-40 rounded-3xl border-2 border-border bg-white p-5 md:p-6 shadow-sm relative overflow-hidden hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl md:text-7xl">💰</span>
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide relative z-10 group-hover:text-primary transition-colors">Budget</h3>
                        <div className="mt-3 relative z-10">
                            <p className={cn("font-bold text-primary leading-none", getNumberFontSize(stats.totalBudget))}>
                                {stats.currency}{formatLargeNumber(stats.totalBudget)}
                            </p>
                            <p className="mt-1 text-xs md:text-sm text-muted-foreground font-medium">
                                of {stats.currency}{formatLargeNumber(stats.estBudget)} estimated
                            </p>
                        </div>
                        <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                                style={{ width: `${stats.estBudget > 0 ? Math.min((stats.totalBudget / stats.estBudget) * 100, 100) : 0}%` }}
                            />
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/guests" className="block group">
                    <div className="min-h-[160px] md:h-40 rounded-3xl border-2 border-border bg-white p-5 md:p-6 shadow-sm relative overflow-hidden hover:shadow-xl hover:border-secondary-foreground/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl md:text-7xl">👥</span>
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide relative z-10 group-hover:text-secondary-foreground transition-colors">Confirmed Guests</h3>
                        <div className="mt-3 relative z-10">
                            <p className={cn("font-bold text-secondary-foreground leading-none", getNumberFontSize(stats.confirmedGuest))}>
                                {formatLargeNumber(stats.confirmedGuest)}
                            </p>
                            <p className="mt-1 text-xs md:text-sm text-muted-foreground font-medium">
                                of {formatLargeNumber(stats.targetGuest)} target
                            </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-muted-foreground relative z-10">
                            <span className="bg-gray-50 px-2 py-1 rounded-full">Total: <span className="font-bold text-foreground">{stats.guestCount}</span></span>
                            <span className="bg-amber-50 px-2 py-1 rounded-full">Pending: <span className="font-bold text-amber-600">{stats.pendingGuest}</span></span>
                        </div>
                        <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                            <div
                                className="h-full bg-gradient-to-r from-secondary-foreground to-secondary-foreground/80 rounded-full transition-all duration-500"
                                style={{ width: `${stats.targetGuest > 0 ? Math.min((stats.confirmedGuest / stats.targetGuest) * 100, 100) : 0}%` }}
                            />
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/itinerary" className="block group">
                    <div className="min-h-[160px] md:h-40 rounded-3xl border-2 border-border bg-white p-5 md:p-6 shadow-sm relative overflow-hidden hover:shadow-xl hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl md:text-7xl">📅</span>
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide relative z-10 group-hover:text-purple-600 transition-colors">Days to Go</h3>
                        <div className="mt-3 relative z-10">
                            <p className={cn("font-bold text-foreground leading-none", daysToGo > 99 ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl")}>
                                {daysToGo > 0 ? daysToGo : "🎉"}
                            </p>
                            <p className="mt-2 text-xs md:text-sm text-muted-foreground font-medium">
                                {daysToGo > 0 ? new Date(wedding.wedding_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "Today's the day!"}
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Actionable Widgets */}
            <div className="pt-2">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6">At a Glance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {/* Widget 1: Upcoming Tasks */}
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 md:p-6 flex flex-col min-h-[280px] hover:shadow-md hover:border-amber-200 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="font-bold text-foreground flex items-center gap-2.5">
                                <span className="bg-amber-100 text-amber-700 p-2 rounded-xl text-lg">📋</span>
                                <span>Upcoming Tasks</span>
                            </h4>
                            <button onClick={() => router.push('/dashboard/checklist')} className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-auto">
                            {upcomingTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                        <span className="text-2xl opacity-40">✅</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">All tasks completed!</p>
                                </div>
                            ) : upcomingTasks.map(task => (
                                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-amber-50/50 transition-colors cursor-pointer group">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{task.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date set'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Widget 2: Pending Payments */}
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 md:p-6 flex flex-col min-h-[280px] hover:shadow-md hover:border-rose-200 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="font-bold text-foreground flex items-center gap-2.5">
                                <span className="bg-rose-100 text-rose-700 p-2 rounded-xl text-lg">💸</span>
                                <span>Pending Payments</span>
                            </h4>
                            <button onClick={() => router.push('/dashboard/budget')} className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-auto">
                            {pendingPayments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-3">
                                        <span className="text-2xl opacity-40">✨</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">All payments settled!</p>
                                </div>
                            ) : pendingPayments.map(payment => (
                                <div key={payment.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-rose-50/50 transition-colors cursor-pointer group">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{payment.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                                            <span className="font-bold text-rose-600">{stats.currency}{formatLargeNumber(payment.estimated_cost)}</span>
                                            {payment.due_date && <span> • {new Date(payment.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Widget 3: Pending RSVPs */}
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 md:p-6 flex flex-col min-h-[280px] hover:shadow-md hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="font-bold text-foreground flex items-center gap-2.5">
                                <span className="bg-blue-100 text-blue-700 p-2 rounded-xl text-lg">📩</span>
                                <span>Pending RSVPs</span>
                            </h4>
                            <button onClick={() => router.push('/dashboard/guests')} className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-auto">
                            {pendingGuests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                        <span className="text-2xl opacity-40">🎉</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">All RSVPs received!</p>
                                </div>
                            ) : pendingGuests.map(guest => (
                                <div key={guest.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50/50 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {guest.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1">{guest.name}</p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide mt-1">
                                            Pending
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <PlanComparisonModal
                isOpen={showPlanModal}
                onClose={() => setShowPlanModal(false)}
            />
        </div>
    );
}
