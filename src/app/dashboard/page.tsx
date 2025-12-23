"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { PlanComparisonModal } from "@/components/dashboard/plan-comparison-modal";
import { formatLargeNumber, getNumberFontSize } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export default function DashboardPage() {
    const [wedding, setWedding] = useState<WeddingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);

    const [stats, setStats] = useState({
        guestCount: 0,
        confirmedGuest: 0,
        pendingGuest: 0,
        targetGuest: 0,
        totalBudget: 0,
        estBudget: 0,
        currency: 'USD'
    });

    const [inviteCode, setInviteCode] = useState("");
    const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [pendingGuests, setPendingGuests] = useState<any[]>([]);

    const router = useRouter();

    useEffect(() => {
        // Check for welcome param
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('welcome') === 'true') {
                setShowPlanModal(true);
                // Clean URL
                window.history.replaceState({}, '', '/dashboard');
            }
        }

        async function fetchWedding() {
            setLoading(true);
            const weddingId = localStorage.getItem("current_wedding_id");
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            if (!weddingId) {
                // If no stored ID, try to find one
                const { data: collaboration } = await supabase
                    .from('collaborators')
                    .select('wedding_id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .maybeSingle();

                if (collaboration) {
                    localStorage.setItem("current_wedding_id", collaboration.wedding_id);
                    // Recursively call or just let the next render/effect pick it up? 
                    // Better to just continue here with the new ID
                    return fetchWeddingDetails(collaboration.wedding_id);
                } else {
                    setLoading(false); // No wedding found
                    return;
                }
            } else {
                await fetchWeddingDetails(weddingId);
            }
        }

        async function fetchWeddingDetails(id: string) {

            const { data: weddingData, error } = await supabase
                .from('weddings')
                .select('*')
                .eq('id', id)
                .single();

            if (weddingData) {
                setWedding(weddingData as WeddingData);

                try {
                    // Fetch Stats & Widgets concurrently
                    const [guestsResult, budgetResult, tasksRes, paymentsRes, guestsListRes] = await Promise.all([
                        supabase.from('guests').select('rsvp_status, companion_guest_count').eq('wedding_id', id),
                        supabase.from('budget_items').select('estimated_cost').eq('wedding_id', id),
                        // Widget 1: Upcoming Tasks
                        supabase.from('checklist_items')
                            .select('*')
                            .eq('wedding_id', id)
                            .eq('is_completed', false)
                            .order('due_date', { ascending: true, nullsFirst: false })
                            .limit(5),
                        // Widget 2: Pending Payments
                        supabase.from('budget_items')
                            .select('*')
                            .eq('wedding_id', id)
                            .is('paid_at', null)
                            .order('due_date', { ascending: true, nullsFirst: false })
                            .limit(5),
                        // Widget 3: Pending Guests
                        supabase.from('guests')
                            .select('*')
                            .eq('wedding_id', id)
                            .eq('rsvp_status', 'pending')
                            .limit(5)
                    ]);

                    const guestData = guestsResult.data || [];
                    const guestCount = guestData.reduce((acc, g) => acc + 1 + (g.companion_guest_count || 0), 0);
                    const confirmedGuest = guestData
                        .filter(g => g.rsvp_status === 'accepted')
                        .reduce((acc, g) => acc + 1 + (g.companion_guest_count || 0), 0);
                    const pendingGuest = guestData
                        .filter(g => g.rsvp_status === 'pending')
                        .reduce((acc, g) => acc + 1 + (g.companion_guest_count || 0), 0);

                    const totalBudget = budgetResult.data
                        ? budgetResult.data.reduce((acc, item) => acc + item.estimated_cost, 0)
                        : 0;

                    setStats({
                        guestCount,
                        confirmedGuest,
                        pendingGuest,
                        targetGuest: weddingData.target_guest_count || 0,
                        totalBudget,
                        estBudget: weddingData.estimated_budget || 0,
                        currency: weddingData.currency || 'USD'
                    });

                    if (tasksRes.data) setUpcomingTasks(tasksRes.data);
                    if (paymentsRes.data) setPendingPayments(paymentsRes.data);
                    if (guestsListRes.data) setPendingGuests(guestsListRes.data);

                } catch (err) {
                    console.error("Dashboard Stats Error:", err);
                }
            } else {
                // ID might be invalid, clear it
                localStorage.removeItem("current_wedding_id");
            }
            setLoading(false);
        }

        fetchWedding();
    }, [router]);

    if (loading) return <div className="p-10 text-center text-muted-foreground">Loading dashboard...</div>;

    if (!wedding) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-4xl mb-4">
                    ✨
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground">Welcome to Vow & Venue</h2>
                <p className="text-muted-foreground max-w-md">
                    You haven't created or joined a wedding plan yet. Start your journey by creating a new wedding plan.
                </p>
                <button
                    onClick={() => router.push('/onboarding')}
                    className="rounded-xl bg-primary px-8 py-4 text-base font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105"
                >
                    + Create Your Wedding
                </button>

                <div className="pt-8 w-full max-w-sm mx-auto border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-900 mb-4">Collaborate on a Wedding?</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Paste Invitation Code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                        />
                        <button
                            disabled={!inviteCode || loading}
                            onClick={async () => {
                                setLoading(true);
                                const { data, error } = await supabase.rpc('accept_invitation', { lookup_token: inviteCode });
                                if (error || (data && data.error)) {
                                    alert(error?.message || "Invalid Code");
                                    setLoading(false);
                                } else {
                                    window.location.reload(); // Reload to fetch wedding
                                }
                            }}
                            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
                        >
                            {loading && inviteCode ? "Joining..." : "Join"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
