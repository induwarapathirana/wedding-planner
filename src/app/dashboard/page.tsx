"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { PlanComparisonModal } from "@/components/dashboard/plan-comparison-modal";
import { formatLargeNumber, getNumberFontSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlannerWorkspace } from "@/components/dashboard/PlannerWorkspace";
import { CoupleDashboard } from "@/components/dashboard/CoupleDashboard";

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
    const [role, setRole] = useState<'couple' | 'planner' | null>(null);

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

            // Fetch Role
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile) setRole(profile.role);

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

    // ... (previous imports)

    // Planner Dashboard Component (Inline for now, can extract later)
    function PlannerEmptyState({ router }: { router: any }) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-4xl mb-4">
                    💼
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground">Welcome to your Pro Dashboard</h2>
                <p className="text-muted-foreground max-w-md">
                    Manage your clients, leads, and weddings all in one place.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => router.push('/dashboard/clients')}
                        className="rounded-xl bg-gray-900 px-8 py-4 text-base font-medium text-white shadow-lg hover:bg-gray-800 transition-all hover:scale-105"
                    >
                        View Clients
                    </button>
                    <button
                        // Future: Add new client modal
                        onClick={() => router.push('/dashboard/clients?new=true')}
                        className="rounded-xl bg-primary px-8 py-4 text-base font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105"
                    >
                        + Add New Client
                    </button>
                </div>
            </div>
        );
    }

    // ... (imports)

    // Role Selection Component
    function RoleSelectionScreen({ onSelect }: { onSelect: (role: 'couple' | 'planner') => void }) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="max-w-4xl w-full text-center space-y-8">
                    <div className="space-y-2">
                        <h1 className="font-serif text-4xl font-bold text-gray-900">Welcome to Vow & Venue</h1>
                        <p className="text-xl text-gray-500">How will you be using the platform?</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Couple Option */}
                        <button
                            onClick={() => onSelect('couple')}
                            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border-2 border-transparent hover:border-primary/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">
                                💍
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">I'm Planning My Wedding</h3>
                            <p className="text-gray-500">
                                Create your dream wedding, manage guests, budget, and vendors in one place.
                            </p>
                        </button>

                        {/* Planner Option */}
                        <button
                            onClick={() => onSelect('planner')}
                            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border-2 border-transparent hover:border-gray-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">
                                💼
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">I'm a Wedding Professional</h3>
                            <p className="text-gray-500">
                                Manage multiple clients, leads, and streamline your wedding planning business.
                            </p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!role && !loading) {
        // If loading is done and we STILL have no role, it means no profile exists (or no role set).
        // Show Layout for selecting role.
        return <RoleSelectionScreen onSelect={async (selectedRole) => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Manual Profile Creation
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                role: selectedRole,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
                // updated_at removed to prevent schema errors if column is missing
            });

            if (error) {
                console.error("Profile Creation Error:", error);
                alert("Failed to create profile: " + error.message + ". Please ensure you have run the 'allow_profile_insert.sql' script in Supabase.");
                setLoading(false);
            } else {
                setRole(selectedRole);
                window.location.reload(); // Refresh to load full UI
            }
        }} />;
    }

    if (!wedding) {
        // If no wedding selected, check if they are a planner (Role would be set by now if they just selected it)
        if (role === 'planner') {
            return <PlannerEmptyState router={router} />;
        }

        // COUPLE EMPTY STATE
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


    // ... (imports are top level, leave them)
    // We need to import the new components at the top, I'll use a separate edit for imports if needed, 
    // but here I will focus on the render logic. 
    // Actually, I can't easily add imports with replace_file_content if I'm only replacing the bottom.
    // I will use replace_file_content to replace the whole file for cleanliness or just the bottom part 
    // assuming I can add imports. 
    // Since I can't easily add top-level imports in the middle of the file, I'll rewrite the whole file 
    // or just use a large chunk replacement. 

    // Let's replace the whole file content to be safe and clean.

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            {role === 'planner' ? (
                <PlannerWorkspace
                    wedding={wedding}
                    stats={stats}
                    upcomingTasks={upcomingTasks}
                    pendingPayments={pendingPayments}
                    pendingGuests={pendingGuests}
                />
            ) : (
                <CoupleDashboard
                    wedding={wedding}
                    stats={stats}
                    upcomingTasks={upcomingTasks}
                    pendingPayments={pendingPayments}
                    pendingGuests={pendingGuests}
                />
            )}
        </div>
    );
}

