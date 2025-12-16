"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";

type WeddingData = {
    id: string; // Added id for localStorage
    couple_name_1: string;
    couple_name_2: string;
    wedding_date: string;
    currency?: string;
    target_guest_count?: number;
    estimated_budget?: number;
};

export default function DashboardPage() {
    const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [pendingGuests, setPendingGuests] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        async function fetchWedding() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            // Find the wedding this user owns/collaborates on
            const { data: collaboration } = await supabase
                .from('collaborators')
                .select('wedding_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (collaboration) {
                const { data: weddingData } = await supabase.from('weddings').select('*').eq('id', collaboration.wedding_id).single();
                if (weddingData) {
                    setWedding(weddingData as WeddingData);
                    localStorage.setItem("current_wedding_id", weddingData.id);

                    try {
                        // Fetch Stats & Widgets concurrently
                        const [guestsResult, budgetResult, tasksRes, paymentsRes, guestsListRes] = await Promise.all([
                            supabase.from('guests').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingData.id),
                            supabase.from('budget_items').select('estimated_cost').eq('wedding_id', weddingData.id),
                            // Widget 1: Upcoming Tasks
                            supabase.from('checklist_items')
                                .select('*')
                                .eq('wedding_id', weddingData.id)
                                .eq('is_completed', false)
                                .order('due_date', { ascending: true, nullsFirst: false }) // Put no-date items last? Or filter items with due_date? ordered
                                .limit(5),
                            // Widget 2: Pending Payments
                            supabase.from('budget_items')
                                .select('*')
                                .eq('wedding_id', weddingData.id)
                                .is('paid_at', null)
                                .order('due_date', { ascending: true, nullsFirst: false })
                                .limit(5),
                            // Widget 3: Pending Guests
                            supabase.from('guests')
                                .select('*')
                                .eq('wedding_id', weddingData.id)
                                .eq('rsvp_status', 'pending')
                                .limit(5)
                        ]);

                        const guestCount = guestsResult.count || 0;
                        const totalBudget = budgetResult.data
                            ? budgetResult.data.reduce((acc, item) => acc + item.estimated_cost, 0)
                            : 0;

                        setStats({
                            guestCount,
                            targetGuest: weddingData.target_guest_count || 0,
                            totalBudget,
                            estBudget: weddingData.estimated_budget || 0,
                            currency: (weddingData as WeddingData).currency || 'USD'
                        });

                        if (tasksRes.data) setUpcomingTasks(tasksRes.data);
                        if (paymentsRes.data) setPendingPayments(paymentsRes.data);
                        if (guestsListRes.data) setPendingGuests(guestsListRes.data);

                    } catch (err) {
                        console.error("Dashboard Stats Error:", err);
                        // Fallback to basic stats
                        setStats({ guestCount: 0, targetGuest: 0, totalBudget: 0, estBudget: 0, currency: 'USD' });
                    }
                }
            }
            // If no wedding, we simply stay on this page and render the empty state
            setLoading(false);
        }
        fetchWedding();
    }, [router]);

    if (loading) return <div className="p-10 text-center text-muted-foreground">Loading specific details...</div>;

    if (!wedding) {
        return (
            /* ... existing empty state ... */
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
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">
                        Welcome Back, {wedding.couple_name_1} & {wedding.couple_name_2}
                    </h2>
                    <p className="mt-1 text-muted-foreground">Here is what is happening with your wedding.</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/checklist?new=true')}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                    + Add to Checklist
                </button>
            </div>

            {/* Content Placeholder */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl">💰</span>
                    </div>
                    <h3 className="font-medium text-foreground relative z-10">Budget</h3>
                    <p className="mt-2 text-3xl font-bold text-primary relative z-10">
                        {stats.currency}{stats.totalBudget.toLocaleString()} <span className="text-muted-foreground text-lg font-normal">/ {stats.estBudget.toLocaleString()}</span>
                    </p>
                    <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${stats.estBudget > 0 ? Math.min((stats.totalBudget / stats.estBudget) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl">👥</span>
                    </div>
                    <h3 className="font-medium text-foreground relative z-10">Guest Count</h3>
                    <p className="mt-2 text-3xl font-bold text-secondary-foreground relative z-10">
                        {stats.guestCount} <span className="text-muted-foreground text-lg font-normal">/ {stats.targetGuest}</span>
                    </p>
                    <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                        <div
                            className="h-full bg-secondary-foreground rounded-full transition-all"
                            style={{ width: `${stats.targetGuest > 0 ? Math.min((stats.guestCount / stats.targetGuest) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl">📅</span>
                    </div>
                    <h3 className="font-medium text-foreground relative z-10">Days to Go</h3>
                    <p className="mt-2 text-3xl font-bold text-foreground relative z-10">{daysToGo > 0 ? daysToGo : "Big Day!"}</p>
                    <p className="text-sm text-muted-foreground mt-1 relative z-10">{new Date(wedding.wedding_date).toDateString()}</p>
                </div>
            </div>

            {/* Actionable Widgets */}
            <h3 className="font-medium text-lg text-gray-900 border-b pb-2">At a Glance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Widget 1: Upcoming Tasks */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-700 p-1 rounded">📋</span> Upcoming Tasks
                        </h4>
                        <button onClick={() => router.push('/dashboard/checklist')} className="text-xs text-primary hover:underline">View All</button>
                    </div>
                    <div className="space-y-3 flex-1">
                        {upcomingTasks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No upcoming tasks.</p>
                        ) : upcomingTasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 line-clamp-1">{task.title}</p>
                                    <p className="text-xs text-gray-500">
                                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Widget 2: Pending Payments */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="bg-rose-100 text-rose-700 p-1 rounded">💸</span> Pending Payments
                        </h4>
                        <button onClick={() => router.push('/dashboard/budget')} className="text-xs text-primary hover:underline">View All</button>
                    </div>
                    <div className="space-y-3 flex-1">
                        {pendingPayments.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No pending payments.</p>
                        ) : pendingPayments.map(payment => (
                            <div key={payment.id} className="flex items-start gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                <div className="mt-0.5 w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 line-clamp-1">{payment.name}</p>
                                    <p className="text-xs text-gray-500">
                                        Amt: {stats.currency}{payment.estimated_cost.toLocaleString()} • Due: {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'No date'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Widget 3: Pending RSVPs */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 p-1 rounded">📩</span> Pending RSVPs
                        </h4>
                        <button onClick={() => router.push('/dashboard/guests')} className="text-xs text-primary hover:underline">View All</button>
                    </div>
                    <div className="space-y-3 flex-1">
                        {pendingGuests.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">All caught up on RSVPs!</p>
                        ) : pendingGuests.map(guest => (
                            <div key={guest.id} className="flex items-center gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {guest.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 line-clamp-1">{guest.name}</p>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
