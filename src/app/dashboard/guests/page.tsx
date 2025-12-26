"use client";

import { useMode } from "@/context/mode-context";
import { Users, UserPlus, Check, X, HelpCircle, Utensils, Armchair, Edit2, Trash2, CheckSquare, Square, LayoutGrid, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GuestDialog } from "@/components/dashboard/guest-dialog";
import { GroupSummaryModal } from "@/components/dashboard/group-summary-modal";
import { BulkSeatingDialog } from "@/components/dashboard/bulk-seating-dialog"; // New Import
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { LimitModal } from "@/components/dashboard/limit-modal";

type Guest = {
    id: string; // Changed to string for UUID
    name: string;
    group_category: string;
    priority: "A" | "B" | "C";
    rsvp_status: "accepted" | "declined" | "pending";
    meal_preference?: string;
    table_assignment?: string;
    plus_one: boolean;
    companion_guest_count?: number; // Added for companion count
    companion_names?: string[]; // Added: Optional names for companions
};

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModeToggle } from "@/components/dashboard/mode-toggle";

export default function GuestPage() {
    const { mode } = useMode();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [targetCount, setTargetCount] = useState(0);
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"name" | "priority" | "status">("priority");
    const [filterGroup, setFilterGroup] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState(""); // Added: Search state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isSeatingDialogOpen, setIsSeatingDialogOpen] = useState(false); // New State
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({ isOpen: false, type: 'single' });

    // ... (fetch logic remains same)
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

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === guests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(guests.map(g => g.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Delete Logic
    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, type: 'single', id });
    };

    const confirmBulkDelete = () => {
        setConfirmState({ isOpen: true, type: 'bulk' });
    };

    const executeDelete = async () => {
        if (confirmState.type === 'single' && confirmState.id) {
            const { error } = await supabase.from('guests').delete().eq('id', confirmState.id);
            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                const weddingId = localStorage.getItem("current_wedding_id");
                if (weddingId) fetchGuests(weddingId);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(confirmState.id!);
                    return next;
                });
            }
        } else if (confirmState.type === 'bulk') {
            const ids = Array.from(selectedIds);
            const { error } = await supabase.from('guests').delete().in('id', ids);

            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                const weddingId = localStorage.getItem("current_wedding_id");
                if (weddingId) fetchGuests(weddingId);
                setSelectedIds(new Set());
            }
        }
        setConfirmState({ ...confirmState, isOpen: false });
    };

    const handleBulkSeating = async (tableNo: string) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const { error } = await supabase
            .from('guests')
            .update({ table_assignment: tableNo })
            .in('id', ids);

        if (error) {
            alert("Error updating seating: " + error.message);
        } else {
            const weddingId = localStorage.getItem("current_wedding_id");
            if (weddingId) fetchGuests(weddingId);
            setSelectedIds(new Set());
        }
    };

    const handleBulkUnassign = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const { error } = await supabase
            .from('guests')
            .update({ table_assignment: null })
            .in('id', ids);

        if (error) {
            alert("Error unassigning seating: " + error.message);
        } else {
            const weddingId = localStorage.getItem("current_wedding_id");
            if (weddingId) fetchGuests(weddingId);
            setSelectedIds(new Set());
        }
    };

    // Stats Calculation
    const totalHeadcount = guests.reduce((sum, guest) => sum + 1 + (guest.companion_guest_count || 0), 0);
    const acceptedCount = guests
        .filter(g => g.rsvp_status === 'accepted')
        .reduce((sum, guest) => sum + 1 + (guest.companion_guest_count || 0), 0);
    const declinedCount = guests
        .filter(g => g.rsvp_status === 'declined')
        .reduce((sum, guest) => sum + 1 + (guest.companion_guest_count || 0), 0);
    const pendingCount = totalHeadcount - acceptedCount - declinedCount;

    const stats = {
        accepted: acceptedCount,
        declined: declinedCount,
        pending: pendingCount,
        total: totalHeadcount,
    };

    // Filtering and Sorting Logic
    const filteredGuests = guests.filter(g => {
        const matchesGroup = filterGroup === "All" || g.group_category === filterGroup;
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGroup && matchesSearch;
    });

    const sortedGuests = [...filteredGuests].sort((a, b) => {
        if (sortBy === 'priority') {
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

    // Selected Headcount Calculation
    const selectedGuests = Array.from(selectedIds).map(id => guests.find(g => g.id === id)).filter(Boolean) as Guest[];
    const selectedHeadcount = selectedGuests.reduce((sum, guest) => sum + 1 + (guest.companion_guest_count || 0), 0);
    const allSelectedAreAccepted = selectedGuests.every(g => g.rsvp_status === 'accepted');

    // Dynamic Group Categories for Filtering
    const DEFAULT_GROUPS = ["Bride Family", "Groom Family", "Bride Friends", "Groom Friends", "Mutual", "Work"];
    const existingGroups = Array.from(new Set(guests.map(g => g.group_category).filter(Boolean)));
    const groupCategories = ["All", ...Array.from(new Set([...DEFAULT_GROUPS, ...existingGroups]))].sort((a, b) => {
        if (a === "All") return -1;
        if (b === "All") return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-8">
            <div className="space-y-6 md:space-y-8 pb-20 md:pb-0"> {/* Add padding for sticky bar */}
                {/* Header */}
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Guest List</h2>
                            <p className="mt-1 text-sm md:text-base text-muted-foreground">
                                {mode === "simple"
                                    ? "Manage RSVPs and headcount."
                                    : "Detailed tracking for meals, seating, and groupings."}
                            </p>
                        </div>
                        <ModeToggle />
                    </div>

                    <button
                        onClick={handleOpenAdd}
                        className="flex lg:hidden items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all w-full md:w-auto"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Guest
                    </button>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:flex md:items-center gap-3">
                        {/* Search Bar - Full width on mobile */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search guests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:flex items-center gap-3">
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <LayoutGrid className="w-4 h-4 text-gray-500" />
                                Groups
                            </button>

                            <select
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none cursor-pointer"
                            >
                                {groupCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat === "All" ? "All Groups" : cat}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="col-span-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none cursor-pointer"
                            >
                                <option value="priority">Sort: Priority</option>
                                <option value="name">Sort: Name</option>
                                <option value="status">Sort: Status</option>
                            </select>

                            <button
                                onClick={handleOpenAdd}
                                className="hidden lg:flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Guest
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selection Bar - Sticky at bottom for mobile, floated on desktop */}
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-20 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto z-40">
                        <div className="bg-white/95 backdrop-blur-sm md:bg-muted/50 rounded-2xl md:rounded-xl p-2 border border-primary/20 md:border-border shadow-xl md:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between px-2 md:px-3">
                                <span className="text-xs font-bold text-primary md:text-muted-foreground uppercase tracking-tight">
                                    {selectedHeadcount} Selected
                                </span>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="md:hidden text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 md:gap-1">
                                <button
                                    disabled={!allSelectedAreAccepted}
                                    onClick={() => setIsSeatingDialogOpen(true)}
                                    className={cn(
                                        "flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border px-3 py-2 md:py-1.5 text-xs font-semibold transition-all shadow-sm",
                                        allSelectedAreAccepted
                                            ? "bg-primary text-white hover:bg-primary/90 border-primary"
                                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    )}
                                    title={!allSelectedAreAccepted ? "Only accepted guests can be assigned seating" : "Assign selected guests to a table"}
                                >
                                    <Armchair className="w-4 h-4" />
                                    <span className="hidden sm:inline">Assign Table</span>
                                    <span className="sm:hidden">Assign</span>
                                </button>
                                <button
                                    onClick={handleBulkUnassign}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-white border border-border px-3 py-2 md:py-1.5 text-xs font-semibold text-foreground hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    Unassign
                                </button>
                                <button
                                    onClick={confirmBulkDelete}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 md:py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                style={{ width: `${progressPercent}% ` }}
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
                                <div key={guest.id} className={cn("flex items-center justify-between p-4 md:p-6 hover:bg-muted/30 transition-colors", selectedIds.has(guest.id) && "bg-muted/50")}>
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <button onClick={() => toggleSelect(guest.id)} className="text-muted-foreground hover:text-primary">
                                            {selectedIds.has(guest.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                        </button>

                                        <div className={cn(
                                            "h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs ring-2 ring-white shadow-sm flex-shrink-0",
                                            guest.priority === 'A' ? "bg-red-100 text-red-700" :
                                                guest.priority === 'C' ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {guest.priority || 'B'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm md:text-base text-foreground leading-none">{guest.name}</p>
                                                {(guest.companion_guest_count || 0) > 0 && (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                        +{guest.companion_guest_count}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] md:text-sm text-muted-foreground mt-1">{guest.group_category || 'Uncategorized'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-3">
                                        <span className={cn(
                                            "hidden xs:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] md:text-xs font-medium mr-1 md:mr-0",
                                            guest.rsvp_status === 'accepted' ? "bg-green-100 text-green-700" :
                                                guest.rsvp_status === 'declined' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                                        </span>
                                        <button onClick={() => handleOpenEdit(guest)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => confirmDelete(guest.id)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {sortedGuests.length === 0 && <div className="p-8 text-center text-muted-foreground">No guests found matching this filter.</div>}
                        </div>
                    ) : (
                        /* ADVANCED MODE: Responsive Layout */
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-border">
                                {sortedGuests.map((guest) => (
                                    <div key={guest.id} className={cn("p-4 hover:bg-muted/30 transition-colors", selectedIds.has(guest.id) && "bg-muted/50")}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => toggleSelect(guest.id)} className="text-muted-foreground pt-0.5">
                                                    {selectedIds.has(guest.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary uppercase">
                                                        {guest.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">{guest.name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{guest.group_category || 'Uncategorized'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleOpenEdit(guest)} className="p-2 text-muted-foreground">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => confirmDelete(guest.id)} className="p-2 text-muted-foreground">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pl-8">
                                            <div className="bg-muted px-2 py-1.5 rounded-lg">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Status</p>
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    guest.rsvp_status === 'accepted' ? "text-green-600" :
                                                        guest.rsvp_status === 'declined' ? "text-red-600" : "text-amber-600"
                                                )}>
                                                    {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="bg-muted px-2 py-1.5 rounded-lg">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Priority</p>
                                                <span className="text-xs font-medium">{guest.priority || 'B'}</span>
                                            </div>
                                            <div className="bg-muted px-2 py-1.5 rounded-lg">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Party Size</p>
                                                <span className="text-xs font-medium flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {1 + (guest.companion_guest_count || 0)}
                                                </span>
                                            </div>
                                            <div className="bg-muted px-2 py-1.5 rounded-lg">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Seating</p>
                                                <span className="text-xs font-medium flex items-center gap-1 truncate">
                                                    <Armchair className="w-3 h-3" />
                                                    {guest.table_assignment || 'Unassigned'}
                                                </span>
                                            </div>
                                            {guest.rsvp_status === 'accepted' && guest.meal_preference && (
                                                <div className="bg-muted px-2 py-1.5 rounded-lg col-span-2 flex items-center gap-2">
                                                    <Utensils className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-xs font-medium">{guest.meal_preference}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground font-medium uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 w-12">
                                                <button onClick={toggleSelectAll} className="flex items-center">
                                                    {selectedIds.size > 0 && selectedIds.size === guests.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-4 w-1/4">Guest Name</th>
                                            <th className="px-6 py-4">Group</th>
                                            <th className="px-6 py-4">Priority</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Meal Choice</th>
                                            <th className="px-6 py-4">Seating</th>
                                            <th className="px-6 py-4">Total Party</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sortedGuests.map((guest) => (
                                            <tr key={guest.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.has(guest.id) && "bg-muted/50")}>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => toggleSelect(guest.id)} className="text-muted-foreground hover:text-primary">
                                                        {selectedIds.has(guest.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                </td>
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
                                                            guest.priority === 'C' ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"
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
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                        <span>{1 + (guest.companion_guest_count || 0)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button onClick={() => handleOpenEdit(guest)} className="text-muted-foreground hover:text-primary transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => confirmDelete(guest.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedGuests.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="p-8 text-center text-muted-foreground">No guests found matching this filter.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <GuestDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSubmit={handleSaveGuest}
                    initialData={editingGuest}
                    customGroups={Array.from(new Set(guests.map(g => g.group_category).filter(g => g && !DEFAULT_GROUPS.includes(g))))}
                />

                <GroupSummaryModal
                    isOpen={isGroupModalOpen}
                    onClose={() => setIsGroupModalOpen(false)}
                    guests={guests}
                />

                <ConfirmDialog
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                    onConfirm={executeDelete}
                    title={confirmState.type === 'bulk' ? "Delete Guests?" : "Delete Guest?"}
                    description={confirmState.type === 'bulk'
                        ? `Are you sure you want to delete ${selectedIds.size} guests? This action cannot be undone.`
                        : "Are you sure you want to delete this guest? This action cannot be undone."}
                    variant="danger"
                />

                <BulkSeatingDialog
                    isOpen={isSeatingDialogOpen}
                    onClose={() => setIsSeatingDialogOpen(false)}
                    onConfirm={handleBulkSeating}
                    selectedCount={selectedHeadcount}
                />

                <LimitModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    feature="Guests"
                    limit={PLAN_LIMITS[tier].guests}
                    tier={tier}
                />
            </div>
        </div>
    );
}
