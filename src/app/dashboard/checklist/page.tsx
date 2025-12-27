"use client";

import { useMode } from "@/context/mode-context";
import { CheckCircle2, Circle, Plus, Edit2, CalendarDays, Trash2, CheckSquare, Square, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { ChecklistDialog } from "@/components/dashboard/checklist-dialog";
import { useSearchParams } from "next/navigation";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { getEffectiveTier } from "@/lib/trial";
import { LimitModal } from "@/components/dashboard/limit-modal";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { TourGuide } from "@/components/dashboard/TourGuide";
import { CHECKLIST_STEPS } from "@/lib/tours";

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
        async function loadData() {
            setLoading(true);
            const wId = localStorage.getItem("current_wedding_id");
            let currentTier: PlanTier = 'free';

            if (wId) {
                setWeddingId(wId);
                // Use getEffectiveTier for proper trial/payment validation
                const trialInfo = await getEffectiveTier(wId);
                setTier(trialInfo.effectiveTier);
                await fetchItems(wId);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: collab } = await supabase.from('collaborators').select('wedding_id').eq('user_id', user.id).single();
                    if (collab) {
                        localStorage.setItem("current_wedding_id", collab.wedding_id);
                        setWeddingId(collab.wedding_id);
                        // Use getEffectiveTier for proper trial/payment validation
                        const trialInfo = await getEffectiveTier(collab.wedding_id);
                        setTier(trialInfo.effectiveTier);
                        await fetchItems(collab.wedding_id);
                    }
                }
                setLoading(false);
            }

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
        const newStatus = !item.is_completed;
        setItems(items.map(i => i.id === item.id ? { ...i, is_completed: newStatus } : i));

        const { error } = await supabase.from('checklist_items').update({ is_completed: newStatus }).eq('id', item.id);
        if (error) {
            setItems(items.map(i => i.id === item.id ? { ...i, is_completed: !newStatus } : i));
            alert("Failed to update status");
        }
    };

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

    const completedItems = items.filter(i => i.is_completed);
    const pendingItems = items.filter(i => !i.is_completed);

    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, ChecklistItem[]>);

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
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Checklist & Timeline</h2>
                        <p className="mt-1 text-sm md:text-base text-muted-foreground">Stay organized every step of the way.</p>
                    </div>
                    <div id="tour-mode-toggle">
                        <ModeToggle />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <TourGuide steps={CHECKLIST_STEPS} pageKey="checklist" />
                    <button
                        id="tour-add-task"
                        onClick={handleOpenAdd}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 md:py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all w-full md:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Add Task
                    </button>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto z-40">
                    <div className="bg-white/95 backdrop-blur-sm md:bg-muted/50 rounded-2xl md:rounded-xl p-2 border border-primary/20 md:border-border shadow-xl md:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between px-2 md:px-3">
                            <span className="text-xs font-bold text-primary md:text-muted-foreground uppercase tracking-tight">
                                {selectedIds.size} Tasks Selected
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

            {items.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-2">
                        {selectedIds.size > 0 && selectedIds.size === items.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
            )}

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

            <div id="tour-checklist-list" className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden min-h-[400px]">
                {mode === "simple" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border h-full">
                        <div className="p-4 md:p-6">
                            <h3 className="flex items-center gap-2 font-medium text-foreground mb-4 px-2">
                                <Circle className="w-4 h-4 text-amber-500" /> To Do ({pendingItems.length})
                            </h3>
                            <div className="space-y-3">
                                {pendingItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleOpenEdit(item)}
                                        className={cn("group flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50 cursor-pointer", selectedIds.has(item.id) ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white md:bg-transparent shadow-sm md:shadow-none border-border/50 md:border-transparent")}
                                    >
                                        <div className="flex items-center h-6">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-3 w-full text-left">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleComplete(item); }}
                                                    className="mt-0.5 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors p-0.5"
                                                >
                                                    <Circle className="w-4 h-4 text-transparent" />
                                                </button>
                                                <div>
                                                    <p className="font-semibold text-foreground text-sm md:text-base mb-1 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                                                    <p className="text-[11px] md:text-xs text-muted-foreground font-medium">{item.category} • {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No Date'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-white md:hover:bg-muted">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }} className="p-2 text-muted-foreground hover:text-red-600 transition-all rounded-lg hover:bg-white md:hover:bg-muted">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {pendingItems.length === 0 && <p className="text-sm text-muted-foreground italic px-2">No pending tasks.</p>}
                            </div>
                        </div>

                        <div className="p-4 md:p-6 bg-muted/20 md:bg-muted/10">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground mb-4 px-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Completed ({completedItems.length})
                            </h3>
                            <div className="space-y-3">
                                {completedItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleOpenEdit(item)}
                                        className={cn("group flex items-start gap-4 p-4 rounded-2xl opacity-80 hover:opacity-100 transition-all border border-transparent hover:border-border/50 cursor-pointer", selectedIds.has(item.id) ? "bg-primary/5 border-primary/20" : "bg-white/50 md:bg-transparent border-border/30 md:border-transparent shadow-sm md:shadow-none")}
                                    >
                                        <div className="flex items-center h-6">
                                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="text-muted-foreground hover:text-primary transition-colors">
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-3 w-full text-left">
                                                <button onClick={(e) => { e.stopPropagation(); toggleComplete(item); }}>
                                                    <CheckCircle2 className="mt-0.5 w-5 h-5 text-green-600 hover:text-green-700 transition-colors" />
                                                </button>
                                                <div>
                                                    <p className="font-medium text-foreground text-sm line-through decoration-muted-foreground/50 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                                                    <p className="text-[11px] text-muted-foreground font-medium">{item.category}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-white md:hover:bg-muted">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }} className="p-2 text-muted-foreground hover:text-red-600 transition-all rounded-lg hover:bg-white md:hover:bg-muted">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 md:p-10">
                        <div className="relative border-l-2 border-primary/10 ml-4 md:ml-6 space-y-12">
                            {displayCategories.filter(cat => groupedItems[cat] && groupedItems[cat].length > 0).map((category) => (
                                <div key={category} className="relative pl-8 md:pl-10">
                                    <div className="absolute -left-[11px] md:-left-[13px] top-1.5 h-5 w-5 rounded-full border-4 border-white bg-primary shadow-sm ring-1 ring-primary/20" />
                                    <h3 className="text-xl font-bold text-foreground mb-6 md:mb-8 tracking-tight">{category}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                        {groupedItems[category].map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleOpenEdit(item)}
                                                className={cn(
                                                    "relative flex flex-col justify-between rounded-3xl border-2 p-5 md:p-6 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group",
                                                    item.is_completed ? "bg-muted/10 border-border/50 opacity-80" : "bg-white border-border/40 shadow-sm",
                                                    selectedIds.has(item.id) && "ring-2 ring-primary border-primary bg-primary/5"
                                                )}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                                                    className="absolute top-5 right-5 z-10 text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    {selectedIds.has(item.id) ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 opacity-40 hover:opacity-100" />}
                                                </button>

                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                                                        item.is_completed ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                                                    )}>
                                                        {item.is_completed ? "Done" : "Pending"}
                                                    </span>
                                                </div>

                                                <h4 className={cn("text-base md:text-lg font-bold text-foreground mb-2 leading-tight pr-8 group-hover:text-primary transition-colors", item.is_completed && "line-through opacity-70")}>
                                                    {item.title}
                                                </h4>

                                                <div className="flex flex-col gap-2 mb-6">
                                                    {item.due_date && (
                                                        <div className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-muted-foreground">
                                                            <CalendarDays className="w-3.5 h-3.5" />
                                                            {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2 italic">
                                                            "{item.notes}"
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleComplete(item); }}
                                                        className={cn(
                                                            "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm",
                                                            item.is_completed
                                                                ? "bg-white border border-border text-foreground hover:bg-muted"
                                                                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                                                        )}
                                                    >
                                                        {item.is_completed ? "Mark Undone" : "Mark Complete"}
                                                    </button>
                                                    <div className="flex gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="p-2.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-xl transition-all">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }} className="p-2.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {Object.keys(groupedItems).length === 0 && (
                                <div className="pl-8 text-muted-foreground italic flex items-center gap-3">
                                    <HelpCircle className="w-5 h-5 opacity-40" />
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
