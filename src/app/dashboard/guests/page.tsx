"use client";

import { useMode } from "@/context/mode-context";
import { Users, UserPlus, Check, X, HelpCircle, Utensils, Armchair, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GuestDialog } from "@/components/dashboard/guest-dialog";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";

type Guest = {
    id: string; // Changed to string for UUID
    name: string;
    group_category: string;
    priority: "A" | "B" | "C";
    rsvp_status: "accepted" | "declined" | "pending";
    meal_preference?: string;
    table_assignment?: string;
    plus_one: boolean;
};

export default function GuestPage() {
    const { mode } = useMode();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [targetCount, setTargetCount] = useState(0);
    const [tier, setTier] = useState<PlanTier>('free');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"name" | "priority" | "status">("priority");

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

    // Initial Data Load
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const weddingId = localStorage.getItem("current_wedding_id");

            if (!weddingId) {
                setLoading(false);
                return;
            }

            // Fetch wedding target and tier
            const { data: weddingData } = await supabase.from('weddings').select('target_guest_count, tier').eq('id', weddingId).single();

            if (weddingData) {
                setTargetCount(weddingData.target_guest_count || 0);
                setTier((weddingData.tier as PlanTier) || 'free');
            }

            fetchGuests(weddingId);
        }
        loadData();
    }, []);

    async function fetchGuests(weddingId: string) {
        const { data } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (data) {
            setGuests(data as unknown as Guest[]);
        }
        setLoading(false);
    }

    const handleOpenAdd = () => {
        const canAdd = checkLimit(tier, 'guests', guests.length);
        if (!canAdd) {
            setShowLimitModal(true);
            return;
        }
        setEditingGuest(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (guest: Guest) => {
        setEditingGuest(guest);
        setIsDialogOpen(true);
    };

    const handleSaveGuest = async (guestData: Partial<Guest>) => {
        const weddingId = localStorage.getItem("current_wedding_id");
        if (!weddingId) {
            alert("Error: No wedding context found.");
            return;
        }

        const payload = {
            ...guestData,
            priority: guestData.priority || 'B',
            wedding_id: weddingId
        };

        if (editingGuest) {
            const { error } = await supabase.from('guests').update(payload).eq('id', editingGuest.id);
            if (error) alert("Failed to update: " + error.message);
        } else {
            const { error } = await supabase.from('guests').insert(payload);
            if (error) alert("Failed to add: " + error.message);
        }

        setIsDialogOpen(false);
        fetchGuests(weddingId);
    };


    const stats = {
        accepted: guests.filter((g) => g.rsvp_status === "accepted").length,
        declined: guests.filter((g) => g.rsvp_status === "declined").length,
        pending: guests.filter((g) => g.rsvp_status === "pending").length,
        total: guests.length,
    };

    // Sorting Logic
    const sortedGuests = [...guests].sort((a, b) => {
        if (sortBy === 'priority') {
            // A < B < C (A is highest)
            const prioMap = { A: 1, B: 2, C: 3 };
            const pA = prioMap[a.priority || 'B'];
            const pB = prioMap[b.priority || 'B'];
            if (pA !== pB) return pA - pB;
        }
        if (sortBy === 'status') {
            return a.rsvp_status.localeCompare(b.rsvp_status);
        }
        return a.name.localeCompare(b.name);
    });

    // Progress Bar Calcs
    const progressPercent = targetCount > 0 ? Math.min((stats.total / targetCount) * 100, 100) : 0;
    const isOverLimit = targetCount > 0 && stats.total > targetCount;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Guest List</h2>
                    <p className="mt-1 text-muted-foreground">
                        {mode === "simple"
                            ? "Manage RSVPs and headcount."
                            : "Detailed tracking for meals, seating, and groupings."}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="priority">Sort by Priority</option>
                        <option value="name">Sort by Name</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                        <UserPlus className="w-4 h-4" />
                        Add Guest
                    </button>
                </div>
            </div>

            {/* Target Progress Bar */}
            {targetCount > 0 && (
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Total Guests: {stats.total}</span>
                        <span className={isOverLimit ? "text-amber-600" : "text-muted-foreground"}>Target: {targetCount}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500 rounded-full", isOverLimit ? "bg-amber-500" : "bg-primary")}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    {isOverLimit && <p className="text-xs text-amber-600 font-medium">You have exceeded your target headcount.</p>}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className="rounded-full bg-green-100 p-3 text-green-600">
                        <Check className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                        <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className="rounded-full bg-red-100 p-3 text-red-600">
                        <X className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Declined</p>
                        <p className="text-2xl font-bold text-foreground">{stats.declined}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                {mode === "simple" ? (
                    /* SIMPLE MODE: Clean List */
                    <div className="divide-y divide-border">
                        {sortedGuests.map((guest) => (
                            <div key={guest.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm",
                                        guest.priority === 'A' ? "bg-red-100 text-red-700" :
                                            guest.priority === 'C' ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"
                                    )}>
                                        {guest.priority || 'B'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{guest.name}</p>
                                        <p className="text-sm text-muted-foreground">{guest.group_category || 'Uncategorized'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                        guest.rsvp_status === 'accepted' ? "bg-green-100 text-green-700" :
                                            guest.rsvp_status === 'declined' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                                    </span>
                                    <button onClick={() => handleOpenEdit(guest)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ADVANCED MODE: Detailed Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-1/4">Guest Name</th>
                                    <th className="px-6 py-4">Group</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Meal Choice</th>
                                    <th className="px-6 py-4">Seating</th>
                                    <th className="px-6 py-4">Plus One</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedGuests.map((guest) => (
                                    <tr key={guest.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary uppercase">
                                                    {guest.name.charAt(0)}
                                                </div>
                                                {guest.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{guest.group_category || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center rounded px-2 py-0.5 text-xs font-bold",
                                                guest.priority === 'A' ? "bg-red-100 text-red-700" :
                                                    guest.priority === 'C' ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"
                                            )}>
                                                {guest.priority || 'B'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                guest.rsvp_status === 'accepted' ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" :
                                                    guest.rsvp_status === 'declined' ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20" : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                                            )}>
                                                {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {guest.rsvp_status === 'accepted' && guest.meal_preference ? (
                                                <div className="flex items-center gap-1.5 text-foreground">
                                                    <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {guest.meal_preference}
                                                </div>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {guest.rsvp_status === 'accepted' && guest.table_assignment ? (
                                                <div className="flex items-center gap-1.5 text-foreground">
                                                    <Armchair className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {guest.table_assignment}
                                                </div>
                                            ) : <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {guest.plus_one ? "Yes" : "No"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleOpenEdit(guest)} className="text-muted-foreground hover:text-primary transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <GuestDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleSaveGuest}
                initialData={editingGuest}
            />
        </div>
    );
}

