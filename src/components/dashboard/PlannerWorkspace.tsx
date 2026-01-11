
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";
import { formatLargeNumber, getNumberFontSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlanComparisonModal } from "@/components/dashboard/plan-comparison-modal";
import { useState } from "react";
import { BarChart3, TrendingUp, Users } from "lucide-react";

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

type PlannerWorkspaceProps = {
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

export function PlannerWorkspace({ wedding, stats, upcomingTasks, pendingPayments, pendingGuests }: PlannerWorkspaceProps) {
    const router = useRouter();
    const daysToGo = differenceInDays(parseISO(wedding.wedding_date), new Date());

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            {/* Header / Planner Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                <div className="min-w-0 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl">
                        {wedding.couple_name_1.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-serif text-xl font-bold text-gray-900 leading-tight">
                            {wedding.couple_name_1} & {wedding.couple_name_2}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Active Project</span>
                            <span>•</span>
                            <span>{new Date(wedding.wedding_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        onClick={() => router.push('/dashboard/clients')}
                    >
                        Exit Workspace
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/checklist?new=true')}
                        className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
                    >
                        + Add Task
                    </button>

                </div>
            </div>

            {/* B2B Insight Cards (Margins etc) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Projected</span>
                    </div>
                    <p className="text-indigo-100 text-sm font-medium">Profit Margin</p>
                    <p className="text-3xl font-bold mt-1">15%</p>
                    <p className="text-xs text-indigo-200 mt-2">Based on vendor markup</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Total Cost</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">{stats.currency}{formatLargeNumber(stats.totalBudget)}</p>
                    <p className="text-xs text-gray-400 mt-2">Client budget used</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Users className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Headcount</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">{stats.confirmedGuest}</p>
                    <p className="text-xs text-gray-400 mt-2">/{stats.targetGuest} Target</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="bg-gray-100 p-3 rounded-full mb-3">
                        <span className="text-2xl">⚡</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Quick Actions</p>
                    <div className="flex gap-2 mt-3 w-full">
                        <button className="flex-1 text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-lg transition-colors text-gray-700 border border-gray-200">
                            Send Invoice
                        </button>
                        <button className="flex-1 text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-lg transition-colors text-gray-700 border border-gray-200">
                            Email Client
                        </button>
                    </div>
                </div>
            </div>


            {/* Stat Cards Reuse or Modify */}
            {/* We can reuse the widgets but style them differently or pass different props. For now, let's keep the widgets as they are useful for planners too. */}

            {/* Actionable Widgets */}
            <div className="pt-2">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6">Project Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {/* Widget 1: Upcoming Tasks */}
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 md:p-6 flex flex-col min-h-[280px] hover:shadow-md hover:border-amber-200 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="font-bold text-foreground flex items-center gap-2.5">
                                <span className="bg-amber-100 text-amber-700 p-2 rounded-xl text-lg">📋</span>
                                <span>Tasks Due</span>
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
                                <span>Client Payments</span>
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
                                <span>Guest RSVPs</span>
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
        </div>
    );
}
