"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlanComparisonModal } from "@/components/dashboard/plan-comparison-modal";
import { PlannerWorkspace } from "@/components/dashboard/PlannerWorkspace";
import { CoupleDashboard } from "@/components/dashboard/CoupleDashboard";
import {
    getUserProfile,
    getUserWeddings,
    getWeddingById,
    getDashboardStats,
    updateUserRole,
    acceptInvitation,
} from "@/app/actions/data";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import type { DashboardStats } from "@/components/dashboard/CoupleDashboard";

type WeddingData = {
    id: string;
    coupleName1: string;
    coupleName2: string;
    weddingDate: string;
    currency?: string;
    targetGuestCount?: number;
    estimatedBudget?: number;
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
    } as DashboardStats);
    const [role, setRole] = useState<'couple' | 'planner' | null>(null);

    const [inviteCode, setInviteCode] = useState("");
    const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [pendingGuests, setPendingGuests] = useState<any[]>([]);

    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('welcome') === 'true') {
                setShowPlanModal(true);
                window.history.replaceState({}, '', '/dashboard');
            }
        }

        if (status === 'loading') return;
        if (!session?.user) {
            router.push("/login");
            return;
        }

        async function fetchWedding() {
            setLoading(true);

            // Role and wedding list are independent, so fetch them together
            const [profile, myWeddings] = await Promise.all([getUserProfile(), getUserWeddings()]);
            if (profile) setRole(profile.role as any);

            // Priority 1: URL param, Priority 2: last-used wedding from localStorage
            const params = new URLSearchParams(window.location.search);
            let weddingId = params.get('weddingId') || localStorage.getItem("current_wedding_id");

            // CRITICAL: only use a cached ID that belongs to the current user
            if (weddingId && !myWeddings.some((w) => w.id === weddingId)) {
                localStorage.removeItem("current_wedding_id");
                weddingId = null;
            }

            // Fall back to the first wedding the user collaborates on
            weddingId = weddingId || myWeddings[0]?.id || null;

            if (!weddingId) {
                setLoading(false);
                return;
            }

            localStorage.setItem("current_wedding_id", weddingId);
            await fetchWeddingDetails(weddingId);
        }

        async function fetchWeddingDetails(id: string) {
            const [weddingData, dashData] = await Promise.all([
                getWeddingById(id),
                getDashboardStats(id).catch((err) => {
                    console.error("Dashboard Stats Error:", err);
                    return null;
                }),
            ]);

            if (weddingData) {
                // Map Prisma camelCase to component expectations
                const mapped: WeddingData = {
                    id: weddingData.id,
                    coupleName1: weddingData.coupleName1,
                    coupleName2: weddingData.coupleName2,
                    weddingDate: weddingData.weddingDate ? new Date(weddingData.weddingDate).toISOString() : '',
                    currency: weddingData.currency || 'USD',
                    targetGuestCount: weddingData.targetGuestCount || undefined,
                    estimatedBudget: weddingData.estimatedBudget ? Number(weddingData.estimatedBudget) : undefined,
                    tier: (weddingData.tier as 'free' | 'premium') || 'free',
                };
                setWedding(mapped);

                if (dashData) {
                    setStats(dashData.stats);
                    setUpcomingTasks(dashData.upcomingTasks);
                    setPendingPayments(dashData.pendingPayments);
                    setPendingGuests(dashData.pendingGuests);
                }
            } else {
                localStorage.removeItem("current_wedding_id");
            }
            setLoading(false);
        }

        fetchWedding();
    }, [router, session, status]);

    if (loading) return <DashboardSkeleton />;

    // Planner Dashboard Component
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
                        onClick={() => router.push('/dashboard/clients?new=true')}
                        className="rounded-xl bg-primary px-8 py-4 text-base font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105"
                    >
                        + Add New Client
                    </button>
                </div>
            </div>
        );
    }

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
        return <RoleSelectionScreen onSelect={async (selectedRole) => {
            setLoading(true);
            try {
                await updateUserRole(selectedRole);
                setRole(selectedRole);
                window.location.reload();
            } catch (error: any) {
                console.error("Profile Creation Error:", error);
                alert("Failed to create profile: " + error.message);
                setLoading(false);
            }
        }} />;
    }

    if (!wedding) {
        if (role === 'planner') {
            return <PlannerEmptyState router={router} />;
        }

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
                                try {
                                    await acceptInvitation(inviteCode);
                                    window.location.reload();
                                } catch (error: any) {
                                    alert(error?.message || "Invalid Code");
                                    setLoading(false);
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

    // Role-based dashboard rendering
    if (role === 'planner') {
        return (
            <div className="space-y-6 md:space-y-8 pb-6">
                <PlannerWorkspace
                    wedding={wedding}
                    stats={stats}
                    upcomingTasks={upcomingTasks}
                    pendingPayments={pendingPayments}
                    pendingGuests={pendingGuests}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            <CoupleDashboard
                wedding={wedding}
                stats={stats}
                upcomingTasks={upcomingTasks}
                pendingPayments={pendingPayments}
                pendingGuests={pendingGuests}
            />
            <PlanComparisonModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} />
        </div>
    );
}
