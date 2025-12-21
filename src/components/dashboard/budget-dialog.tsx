"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type BudgetItem = {
    id?: string;
    category: string;
    item_name: string;
    estimated_cost: number;
    actual_cost: number;
    paid_amount: number;
    due_date?: string;
    is_paid: boolean;
    notes?: string;
    unit_price?: number; // Added: price per unit
    units?: number;      // Added: quantity
};

interface BudgetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (item: BudgetItem) => Promise<void>;
    initialData?: BudgetItem | null;
    currencySymbol: string;
}

export function BudgetDialog({ isOpen, onClose, onSubmit, initialData, currencySymbol }: BudgetDialogProps) {
    const [formData, setFormData] = useState<BudgetItem>({
        category: "Venue",
        item_name: "",
        estimated_cost: 0,
        actual_cost: 0,
        paid_amount: 0,
        is_paid: false,
        notes: "",
        unit_price: 0,
        units: 1
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                unit_price: initialData.unit_price || 0,
                units: initialData.units || 1
            });
        } else {
            setFormData({
                category: "Venue",
                item_name: "",
                estimated_cost: 0,
                actual_cost: 0,
                paid_amount: 0,
                is_paid: false,
                notes: "",
                unit_price: 0,
                units: 1
            });
        }
    }, [initialData, isOpen]);

    // Handle auto-calculation
    useEffect(() => {
        if (formData.unit_price !== undefined && formData.units !== undefined) {
            const calculated = formData.unit_price * formData.units;
            // Only update if it actually changed and we have values to calculate
            if (calculated > 0 && calculated !== formData.estimated_cost) {
                setFormData(prev => ({ ...prev, estimated_cost: calculated }));
            }
        }
    }, [formData.unit_price, formData.units]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(formData);
        setLoading(false);
        onClose();
    };

    const categories = [
        "Venue", "Catering", "Photography", "Attire", "Decor", "Music", "Transportation", "Stationery", "Favors", "Other"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-2xl font-bold text-foreground">
                        {initialData ? "Edit Budget Item" : "Add Budget Item"}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Item Name</label>
                            <input
                                required
                                type="text"
                                value={formData.item_name}
                                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="e.g. Wedding Cake"
                            />
                        </div>
                    </div>

                    {/* Unit Pricing Section */}
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Unit-Based Pricing (Auto-Calculates Estimate)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-foreground">Price per Unit</label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                                        className="block w-full rounded-xl border border-border bg-white pl-8 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">Quantity / Units</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.units}
                                    onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="1"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Estimated Total</label>
                            <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">{currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.estimated_cost}
                                    onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                                    className="block w-full rounded-xl border border-border bg-white pl-8 px-3 py-2 text-sm font-bold text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Actual Cost</label>
                            <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">{currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.actual_cost}
                                    onChange={(e) => setFormData({ ...formData, actual_cost: parseFloat(e.target.value) || 0 })}
                                    className="block w-full rounded-xl border border-border bg-white pl-8 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Paid Amount</label>
                            <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">{currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.paid_amount}
                                    onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                                    className="block w-full rounded-xl border border-border bg-white pl-8 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Due Date</label>
                            <div className="relative mt-1">
                                <input
                                    type="date"
                                    value={formData.due_date || ""}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_paid}
                                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                    className="accent-primary w-4 h-4 rounded"
                                />
                                <span className="text-sm font-medium text-foreground">Mark as Fully Paid</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground">Notes</label>
                        <textarea
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={3}
                            placeholder="Contract details, payment schedule..."
                        />
                    </div>


                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
