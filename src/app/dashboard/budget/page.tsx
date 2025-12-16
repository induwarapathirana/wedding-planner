"use client";

import { useMode } from "@/context/mode-context";
import { DollarSign, PieChart, TrendingUp, Plus, Edit2, Wallet, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetDialog } from "@/components/dashboard/budget-dialog";
import { CURRENCIES } from "@/lib/constants";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { LimitModal } from "@/components/dashboard/limit-modal";

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
};

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

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

    // Stats
    const [totalEstimated, setTotalEstimated] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    // pending = estimated - paid (simplified logic, or actual - paid if actual exists)
    // For this app: Pending Amount usually means "Remaining to be paid"
    const totalPending = budgetItems.reduce((acc, item) => {
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

            // Calc Totals
            const est = data.reduce((acc, item) => acc + item.estimated_cost, 0);
            const paid = data.reduce((acc, item) => acc + item.paid_amount, 0);
            setTotalEstimated(est);
            setTotalPaid(paid);
        }
        setLoading(false);
    }

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

    const handleCurrencyChange = async (newCurrency: string) => {
        setCurrency(newCurrency);
        if (weddingId) {
            await supabase.from('weddings').update({ currency: newCurrency }).eq('id', weddingId);
        }
    };

    const getCurrencySymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || '$';
    };
    const symbol = getCurrencySymbol(currency);

    const formatMoney = (amount: number) => {
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Budget Tracker</h2>
                    <p className="mt-1 text-muted-foreground">Keep your expenses on track.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-all mr-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    {/* Currency Selector */}
                    <select
                        value={currency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    >
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        ))}
                    </select>

                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                            <TrendingUp className="w-6 h-6" />
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
                    /* SIMPLE MODE: Grouped by Category Summary (Simplified) or just clean list */
                    <div className="divide-y divide-border">
                        {budgetItems.map((item) => (
                            <div key={item.id} className={cn("flex items-center justify-between p-6 hover:bg-muted/30 transition-colors", selectedIds.has(item.id) && "bg-muted/50")}>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary">
                                        {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                    </button>

                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{item.item_name}</p>
                                        <p className="text-sm text-muted-foreground">{item.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={cn("font-medium", item.is_paid ? "text-green-600" : "text-foreground")}>
                                        {formatMoney(item.estimated_cost)}
                                    </span>
                                    <button onClick={() => handleOpenEdit(item)} className="text-muted-foreground hover:text-primary transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => confirmDelete(item.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {budgetItems.length === 0 && <div className="p-8 text-center text-muted-foreground">No budget items yet.</div>}
                    </div>
                ) : (
                    /* ADVANCED MODE: Detailed Table */
                    <div className="overflow-x-auto">
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
                                {budgetItems.map((item) => (
                                    <tr key={item.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.has(item.id) && "bg-muted/50")}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary">
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">{item.item_name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                                        <td className="px-6 py-4 text-foreground">{formatMoney(item.estimated_cost)}</td>
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
                                {budgetItems.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-muted-foreground">No budget items yet. Add one to get started!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
