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
    const [wedding, setWedding] = useState<WeddingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        guestCount: 0,
        targetGuest: 0,
        totalBudget: 0,
        estBudget: 0,
        currency: 'USD'
    });
    const [inviteCode, setInviteCode] = useState("");
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
                        // Fetch Counts concurrently
                        const [guestsResult, budgetResult] = await Promise.all([
                            supabase.from('guests').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingData.id),
                            supabase.from('budget_items').select('estimated_cost').eq('wedding_id', weddingData.id)
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
        <div className="space-y-6">
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
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <h3 className="font-medium text-foreground">Budget (Actual / Est.)</h3>
                    <p className="mt-2 text-2xl font-bold text-primary">
                        {stats.currency} {stats.totalBudget.toLocaleString()} <span className="text-muted-foreground text-lg font-normal">/ {stats.estBudget.toLocaleString()}</span>
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${stats.estBudget > 0 ? Math.min((stats.totalBudget / stats.estBudget) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <h3 className="font-medium text-foreground">Guest Count (Confirmed / Target)</h3>
                    <p className="mt-2 text-2xl font-bold text-secondary-foreground">
                        {stats.guestCount} <span className="text-muted-foreground text-lg font-normal">/ {stats.targetGuest}</span>
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-secondary-foreground rounded-full transition-all"
                            style={{ width: `${stats.targetGuest > 0 ? Math.min((stats.guestCount / stats.targetGuest) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>
                <div className="h-40 rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <h3 className="font-medium text-foreground">Days to Go</h3>
                    <p className="mt-2 text-2xl font-bold text-foreground">{daysToGo > 0 ? daysToGo : "Big Day!"}</p>
                    <p className="text-sm text-muted-foreground mt-1">{new Date(wedding.wedding_date).toDateString()}</p>
                </div>
            </div>
        </div>
    );
}
