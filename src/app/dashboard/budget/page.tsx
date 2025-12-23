"use client";

import { useMode } from "@/context/mode-context";
import { DollarSign, PieChart, TrendingUp, Plus, Edit2, Wallet, Trash2, CheckSquare, Square, Search, Filter, LayoutGrid, Sparkles } from "lucide-react";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetDialog } from "@/components/dashboard/budget-dialog";
import { CURRENCIES } from "@/lib/constants";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { LimitModal } from "@/components/dashboard/limit-modal";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

type BudgetItem = {
    id: string;
    category: string;
    item_name: string;
    estimated_cost: number;
    actual_cost: number;
    paid_amount: number;
    due_date?: string;
    is_paid: boolean;
    notes?: string;
    unit_price?: number;
    units?: number;
};


export default function BudgetPage() {
    const { mode } = useMode();
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState("USD");
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false); // Added state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({ isOpen: false, type: 'single' });

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const categories = [
        "All", "Venue", "Catering", "Photography", "Attire", "Decor", "Music", "Transportation", "Stationery", "Favors", "Other"
    ];

    const filteredItems = budgetItems.filter(item => {
        const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.notes?.toLowerCase() || "").includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Stats (Derived from filteredItems)
    const totalEstimated = filteredItems.reduce((acc, item) => acc + item.estimated_cost, 0);
    const totalPaid = filteredItems.reduce((acc, item) => acc + item.paid_amount, 0);
    const totalActual = filteredItems.reduce((acc, item) => acc + (item.actual_cost || 0), 0);
    const totalPending = filteredItems.reduce((acc, item) => {
        const cost = item.actual_cost > 0 ? item.actual_cost : item.estimated_cost;
        return acc + (cost - item.paid_amount);
    }, 0);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const wId = localStorage.getItem("current_wedding_id");
            if (wId) {
                setWeddingId(wId);
                // Fetch Settings (Currency & Tier)
                const { data: wedding } = await supabase.from('weddings').select('currency, tier').eq('id', wId).single();
                if (wedding) {
                    if (wedding.currency) setCurrency(wedding.currency);
                    if (wedding.tier) setTier(wedding.tier as PlanTier);
                }
                fetchBudget(wId);
            } else {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    async function fetchBudget(wId: string) {
        const { data } = await supabase.from('budget_items').select('*').eq('wedding_id', wId).order('due_date', { ascending: true });
        if (data) {
            // Map DB columns to UI state
            const mappedItems = data.map((item: any) => ({
                ...item,
                item_name: item.name,
                is_paid: !!item.paid_at
            }));
            setBudgetItems(mappedItems as BudgetItem[]);
        }
        setLoading(false);
    }

    const sortedItems = filteredItems; // Currently following DB order, but we use filteredItems below

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === budgetItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(budgetItems.map(i => i.id)));
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
    // Delete Logic
    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, type: 'single', id });
    };

    const confirmBulkDelete = () => {
        setConfirmState({ isOpen: true, type: 'bulk' });
    };

    const executeDelete = async () => {
        if (confirmState.type === 'single' && confirmState.id) {
            const { error } = await supabase.from('budget_items').delete().eq('id', confirmState.id);
            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                if (weddingId) fetchBudget(weddingId);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(confirmState.id!);
                    return next;
                });
            }
        } else if (confirmState.type === 'bulk') {
            const ids = Array.from(selectedIds);
            const { error } = await supabase.from('budget_items').delete().in('id', ids);

            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                if (weddingId) fetchBudget(weddingId);
                setSelectedIds(new Set());
            }
        }
        setConfirmState({ ...confirmState, isOpen: false });
    };

    const handleOpenAdd = () => {
        const canAdd = checkLimit(tier, 'budget_items', budgetItems.length);
        if (!canAdd) {
            setShowLimitModal(true);
            return;
        }
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (item: BudgetItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleSaveItem = async (itemData: Partial<BudgetItem>) => {
        if (!weddingId) return;

        // Map UI fields to DB columns
        const { item_name, is_paid, id, ...rest } = itemData;

        const payload = {
            ...rest,
            name: item_name, // Map item_name -> name
            paid_at: is_paid ? new Date().toISOString() : null, // Map is_paid -> paid_at
            wedding_id: weddingId
        };

        if (editingItem) {
            const { error } = await supabase.from('budget_items').update(payload).eq('id', editingItem.id);
            if (error) alert("Error: " + error.message);
        } else {
            const { error } = await supabase.from('budget_items').insert(payload);
            if (error) alert("Error: " + error.message);
        }
        setIsDialogOpen(false);
        fetchBudget(weddingId);
    };


    const getCurrencySymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || '$';
    };
    const symbol = getCurrencySymbol(currency);

    const formatMoney = (amount: number) => {
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="font-serif text-3xl font-bold text-foreground">Budget Tracker</h2>
                            <p className="mt-1 text-muted-foreground">Manage your wedding expenses and payments.</p>
                        </div>
                        <ModeToggle />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-white text-gray-500 shadow-sm"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleOpenAdd}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-primary px-4 md:px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-12 gap-3 transition-all duration-300",
                    isSearchVisible ? "block" : "hidden md:grid"
                )}>
                    <div className="md:col-span-7 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        />
                    </div>
                    <div className="md:col-span-5 flex gap-2">
                        <div className="relative flex-1">
                            <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm appearance-none cursor-pointer"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
                                ))}
                            </select>
                        </div>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={confirmBulkDelete}
                                className="flex items-center justify-center p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all shadow-sm"
                                title="Delete Selected"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="ml-2 md:hidden">Delete ({selectedIds.size})</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                            <PieChart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Estimated</p>
                            <p className="text-2xl font-bold text-foreground">{formatMoney(totalEstimated)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Actual</p>
                            <p className="text-2xl font-bold text-foreground">{formatMoney(totalActual)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-green-100 p-3 text-green-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Paid So Far</p>
                            <p className="text-2xl font-bold text-foreground">{formatMoney(totalPaid)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Remaining Due</p>
                            <p className="text-2xl font-bold text-foreground">{formatMoney(totalPending)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                {mode === "simple" ? (
                    /* SIMPLE MODE: Clean List */
                    <div className="divide-y divide-border">
                        {filteredItems.map((item) => (
                            <div key={item.id} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 hover:bg-muted/30 transition-colors", selectedIds.has(item.id) && "bg-muted/50")}>
                                <div className="flex items-start md:items-center gap-3 md:gap-4 mb-3 md:mb-0">
                                    <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary mt-0.5 md:mt-0">
                                        {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                    </button>

                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-foreground truncate">{item.item_name}</p>
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                                {item.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {item.unit_price && item.unit_price > 0 ? (
                                                <span className="font-medium text-primary/80">
                                                    {formatMoney(item.unit_price)} × {item.units || 1}
                                                </span>
                                            ) : (
                                                <span>Standard Item</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 pl-10 md:pl-0">
                                    <div className="text-right">
                                        <p className={cn("font-bold text-base md:text-sm", item.is_paid ? "text-green-600" : "text-foreground")}>
                                            {formatMoney(item.estimated_cost)}
                                        </p>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider",
                                            item.is_paid ? "text-green-600/70" : "text-amber-600/70"
                                        )}>
                                            {item.is_paid ? "Paid" : "Pending"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => confirmDelete(item.id)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredItems.length === 0 && <div className="p-8 text-center text-muted-foreground">No budget items found matching your filters.</div>}
                    </div>
                ) : (
                    /* ADVANCED MODE: Responsive Layout */
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-border">
                            {filteredItems.map((item) => (
                                <div key={item.id} className={cn("p-4 hover:bg-muted/30 transition-colors", selectedIds.has(item.id) && "bg-muted/50")}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground pt-0.5">
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                            </button>
                                            <div>
                                                <p className="font-bold text-foreground">{item.item_name}</p>
                                                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                                                    {item.category}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleOpenEdit(item)} className="p-2 text-muted-foreground">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => confirmDelete(item.id)} className="p-2 text-muted-foreground">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-muted/30 px-2 py-2 rounded-xl border border-border/50 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mb-1">Est.</p>
                                            <span className="text-xs font-bold text-foreground">{formatMoney(item.estimated_cost)}</span>
                                        </div>
                                        <div className="bg-muted/30 px-2 py-2 rounded-xl border border-border/50 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mb-1">Actual</p>
                                            <span className="text-xs font-bold text-foreground">{item.actual_cost > 0 ? formatMoney(item.actual_cost) : '-'}</span>
                                        </div>
                                        <div className="bg-muted/30 px-2 py-2 rounded-xl border border-border/50 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mb-1">Paid</p>
                                            <span className="text-xs font-bold text-green-600">{item.paid_amount > 0 ? formatMoney(item.paid_amount) : '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pl-8">
                                        <div className="flex items-center gap-4">
                                            {item.due_date && (
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <TrendingUp className="w-3 h-3" />
                                                    <span className="text-[11px] font-medium">{new Date(item.due_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                                            item.is_paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700 shadow-sm"
                                        )}>
                                            {item.is_paid ? "Paid" : "Pending"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div className="p-8 text-center text-muted-foreground">No items found matching your filters.</div>}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <button onClick={toggleSelectAll} className="flex items-center">
                                                {selectedIds.size > 0 && selectedIds.size === budgetItems.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">Item</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Est. Cost</th>
                                        <th className="px-6 py-4">Actual</th>
                                        <th className="px-6 py-4">Paid</th>
                                        <th className="px-6 py-4">Due Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredItems.map((item) => (
                                        <tr key={item.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.has(item.id) && "bg-muted/50")}>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary">
                                                    {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                <div>{item.item_name}</div>
                                                {item.unit_price && item.unit_price > 0 && (
                                                    <div className="text-[10px] text-muted-foreground font-normal">
                                                        {formatMoney(item.unit_price)} × {item.units || 1}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground uppercase text-[10px] font-bold tracking-tight">{item.category}</td>
                                            <td className="px-6 py-4 text-foreground font-medium">{formatMoney(item.estimated_cost)}</td>
                                            <td className="px-6 py-4 text-foreground">{item.actual_cost > 0 ? formatMoney(item.actual_cost) : '-'}</td>
                                            <td className="px-6 py-4 text-green-600 font-medium">{item.paid_amount > 0 ? formatMoney(item.paid_amount) : '-'}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                    item.is_paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {item.is_paid ? "Paid" : "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex items-center gap-2">
                                                <button onClick={() => handleOpenEdit(item)} className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => confirmDelete(item.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-muted-foreground">No items found matching your filters. Add one to get started!</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <BudgetDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleSaveItem}
                initialData={editingItem}
                currencySymbol={symbol}
            />

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                onConfirm={executeDelete}
                title={confirmState.type === 'bulk' ? "Delete Budget Items?" : "Delete Budget Item?"}
                description={confirmState.type === 'bulk'
                    ? `Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`
                    : "Are you sure you want to delete this budget item? This action cannot be undone."}
                variant="danger"
            />

            <LimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                feature="Budget Items"
                limit={PLAN_LIMITS.free.budget_items}
                tier={tier}
            />
        </div>
    );
}
