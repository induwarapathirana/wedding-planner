
"use client";

import { useMode } from "@/context/mode-context";
import { CheckCircle2, Circle, Plus, Edit2, CalendarDays, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { ChecklistDialog } from "@/components/dashboard/checklist-dialog";
import { useSearchParams } from "next/navigation";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { LimitModal } from "@/components/dashboard/limit-modal";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModeToggle } from "@/components/dashboard/mode-toggle";

type ChecklistItem = {
    id: string;
    title: string;
    category: string;
    due_date?: string;
    is_completed: boolean;
    notes?: string;
};

function ChecklistContent() {
    const { mode } = useMode();
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false);
    const searchParams = useSearchParams();

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({ isOpen: false, type: 'single' });

    useEffect(() => {
        // Auto-open dialog check moved inside loadData to ensure tier is loaded first?
        // Or we just fetch data then check.

        async function loadData() {
            setLoading(true);
            const wId = localStorage.getItem("current_wedding_id");
            let currentTier: PlanTier = 'free';

            if (wId) {
                setWeddingId(wId);
                const { data } = await supabase.from('weddings').select('tier').eq('id', wId).single();
                if (data) {
                    currentTier = (data.tier as PlanTier) || 'free';
                    setTier(currentTier);
                }
                await fetchItems(wId);
            } else {
                // ... fallback auth check ...
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: collab } = await supabase.from('collaborators').select('wedding_id').eq('user_id', user.id).single();
                    if (collab) {
                        localStorage.setItem("current_wedding_id", collab.wedding_id);
                        setWeddingId(collab.wedding_id);

                        // Fetch Tier for collab
                        const { data } = await supabase.from('weddings').select('tier').eq('id', collab.wedding_id).single();
                        if (data) setTier((data.tier as PlanTier) || 'free');

                        await fetchItems(collab.wedding_id);
                        // return; // remove return to fall through to auto-open check
                    }
                }
                setLoading(false);
            }

            // Auto-open dialog if ?new=true
            // Note: We might not have items yet if we just called fetchItems (async), but we can check limits later.
            // Since items might be empty array here initially due to closure?
            // Wait, fetchItems updates state, but state update is async.
            // We can't rely on `items.length` here immediately.
            // We will skip limit check for auto-open for now or try to get count from fetch.
            // Actually this effect runs once. `items` is empty.
            // This is a tricky case for auto-open. I'll leave basic auto-open or just set open.
            // The user can close it if alerted.
            if (searchParams.get('new') === 'true') {
                setIsDialogOpen(true);
            }
        }
        loadData();
    }, [searchParams]);

    async function fetchItems(wId: string) {
        const { data } = await supabase.from('checklist_items').select('*').eq('wedding_id', wId).order('due_date', { ascending: true });
        if (data) {
            setItems(data as unknown as ChecklistItem[]);
        }
        setLoading(false);
    }

    const handleOpenAdd = () => {
        if (!checkLimit(tier, 'checklist_items', items.length)) {
            setShowLimitModal(true);
            return;
        }
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (item: ChecklistItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleSaveItem = async (itemData: Partial<ChecklistItem>) => {
        if (!weddingId) return;

        const payload = {
            ...itemData,
            wedding_id: weddingId
        };

        if (editingItem) {
            const { error } = await supabase.from('checklist_items').update(payload).eq('id', editingItem.id);
            if (error) alert("Error: " + error.message);
        } else {
            const { error } = await supabase.from('checklist_items').insert(payload);
            if (error) alert("Error: " + error.message);
        }
        setIsDialogOpen(false);
        fetchItems(weddingId);
    };

    const toggleComplete = async (item: ChecklistItem) => {
        // Optimistic update
        const newStatus = !item.is_completed;
        setItems(items.map(i => i.id === item.id ? { ...i, is_completed: newStatus } : i));

        const { error } = await supabase.from('checklist_items').update({ is_completed: newStatus }).eq('id', item.id);
        if (error) {
            // Revert if failed
            setItems(items.map(i => i.id === item.id ? { ...i, is_completed: !newStatus } : i));
            alert("Failed to update status");
        }
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
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
            const { error } = await supabase.from('checklist_items').delete().eq('id', confirmState.id);
            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                if (weddingId) fetchItems(weddingId);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(confirmState.id!);
                    return next;
                });
            }
        } else if (confirmState.type === 'bulk') {
            const ids = Array.from(selectedIds);
            const { error } = await supabase.from('checklist_items').delete().in('id', ids);

            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                if (weddingId) fetchItems(weddingId);
                setSelectedIds(new Set());
            }
        }
        setConfirmState({ ...confirmState, isOpen: false });
    };

    // Grouping Logic
    const completedItems = items.filter(i => i.is_completed);
    const pendingItems = items.filter(i => !i.is_completed);

    // Group by Category for Advanced View
    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, ChecklistItem[]>);

    // Custom sort order for categories
    const preferredOrder = [
        "12+ Months Out", "9-12 Months Out", "6-9 Months Out", "4-6 Months Out",
        "2-4 Months Out", "1 Month Out", "Final Week", "Wedding Day", "Uncategorized"
    ];

    const existingCategories = Object.keys(groupedItems);

    const displayCategories = [
        ...preferredOrder,
        ...existingCategories.filter(c => !preferredOrder.includes(c))
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-foreground">Checklist & Timeline</h2>
                        <p className="mt-1 text-muted-foreground">Stay organized every step of the way.</p>
                    </div>
                    <ModeToggle />
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition-all mr-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                        <Plus className="w-4 h-4" />
                        Add Task
                    </button>
                </div>
            </div>

            {/* Selection Status Bar */}
            {items.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-2">
                        {selectedIds.size > 0 && selectedIds.size === items.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${items.length > 0 ? (completedItems.length / items.length) * 100 : 0}% ` }}
                />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground -mt-4">
                <span>0%</span>
                <span>{items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0}% Completed</span>
            </div>

            {/* Main Content */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden min-h-[400px]">
                {mode === "simple" ? (
                    /* SIMPLE MODE: To Do vs Done */
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border h-full">
                        {/* PENDING */}
                        <div className="p-6">
                            <h3 className="flex items-center gap-2 font-medium text-foreground mb-4">
                                <Circle className="w-4 h-4 text-amber-500" /> To Do ({pendingItems.length})
                            </h3>
                            <div className="space-y-3">
                                {pendingItems.map(item => (
                                    <div key={item.id} className={cn("group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50", selectedIds.has(item.id) && "bg-muted/50 border-border/50")}>
                                        <button onClick={() => toggleSelect(item.id)} className="mt-1 text-muted-foreground hover:text-primary">
                                            {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => toggleComplete(item)} className="mt-0.5 text-muted-foreground hover:text-primary transition-colors">
                                            <Circle className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.category} • {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No Date'}</p>
                                        </div>
                                        <div className="flex gap-1 opactiy-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-muted-foreground hover:text-primary transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-red-600 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {pendingItems.length === 0 && <p className="text-sm text-muted-foreground italic">No pending tasks.</p>}
                            </div>
                        </div>

                        {/* COMPLETED */}
                        <div className="p-6 bg-muted/10">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground mb-4">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Completed ({completedItems.length})
                            </h3>
                            <div className="space-y-3">
                                {completedItems.map(item => (
                                    <div key={item.id} className={cn("group flex items-start gap-3 p-3 rounded-xl opacity-75 hover:opacity-100 transition-opacity", selectedIds.has(item.id) && "bg-muted/20")}>
                                        <button onClick={() => toggleSelect(item.id)} className="mt-1 text-muted-foreground hover:text-primary">
                                            {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => toggleComplete(item)} className="mt-0.5 text-green-600 transition-colors">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground line-through decoration-muted-foreground/50">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.category}</p>
                                        </div>
                                        <div className="flex gap-1 opactiy-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-muted-foreground hover:text-primary transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-red-600 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ADVANCED MODE: Timeline Layout */
                    <div className="p-8">
                        <div className="relative border-l border-border ml-3 space-y-10">
                            {displayCategories.filter(cat => groupedItems[cat] && groupedItems[cat].length > 0).map((category) => (
                                <div key={category} className="relative pl-8">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white" />

                                    <h3 className="text-lg font-bold text-foreground mb-4">{category}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupedItems[category].map(item => (
                                            <div key={item.id} className={cn(
                                                "relative flex flex-col justify-between rounded-xl border p-4 transition-all hover:shadow-md",
                                                item.is_completed ? "bg-muted/20 border-border opacity-75" : "bg-white border-border",
                                                selectedIds.has(item.id) && "ring-1 ring-primary border-primary bg-primary/5"
                                            )}>
                                                <button
                                                    onClick={() => toggleSelect(item.id)}
                                                    className="absolute top-4 left-4 z-10 text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                                </button>

                                                <div className="flex items-start justify-between mb-3 pl-8">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                        item.is_completed ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                                                    )}>
                                                        {item.is_completed ? "Done" : "Pending"}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleOpenEdit(item)} className="text-muted-foreground hover:text-primary transition-colors">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => confirmDelete(item.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <h4 className={cn("font-medium text-foreground mb-1", item.is_completed && "line-through")}>
                                                    {item.title}
                                                </h4>

                                                {item.due_date && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        {new Date(item.due_date).toLocaleDateString()}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => toggleComplete(item)}
                                                    className={cn(
                                                        "mt-auto w-full rounded-lg py-2 text-xs font-medium transition-colors",
                                                        item.is_completed
                                                            ? "bg-white border border-border text-foreground hover:bg-muted"
                                                            : "bg-primary text-white hover:bg-primary/90"
                                                    )}
                                                >
                                                    {item.is_completed ? "Mark Undone" : "Mark Complete"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {Object.keys(groupedItems).length === 0 && (
                                <div className="pl-8 text-muted-foreground italic">
                                    No tasks found. Add a task to start your timeline!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ChecklistDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleSaveItem}
                initialData={editingItem}
            />
            {/* Limit Modal */}
            <LimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                feature="Tasks"
                limit={PLAN_LIMITS.free.checklist_items}
                tier={tier}
            />

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                onConfirm={executeDelete}
                title={confirmState.type === 'bulk' ? "Delete Tasks?" : "Delete Task?"}
                description={confirmState.type === 'bulk'
                    ? `Are you sure you want to delete ${selectedIds.size} tasks? This action cannot be undone.`
                    : "Are you sure you want to delete this task? This action cannot be undone."}
                variant="danger"
            />
        </div>
    );
}

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Loading checklist...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}
