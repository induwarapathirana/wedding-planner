"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type ChecklistItem = {
    id?: string;
    title: string;
    category: string;
    due_date?: string;
    is_completed: boolean;
    notes?: string;
};

interface ChecklistDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (item: ChecklistItem) => Promise<void>;
    initialData?: ChecklistItem | null;
}

export function ChecklistDialog({ isOpen, onClose, onSubmit, initialData }: ChecklistDialogProps) {
    const [formData, setFormData] = useState<ChecklistItem>({
        title: "",
        category: "12 Months Out",
        is_completed: false,
        notes: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: "",
                category: "12 Months Out",
                is_completed: false,
                notes: ""
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(formData);
        setLoading(false);
        onClose();
    };

    const categories = [
        "12+ Months Out",
        "9-12 Months Out",
        "6-9 Months Out",
        "4-6 Months Out",
        "2-4 Months Out",
        "1 Month Out",
        "Final Week",
        "Wedding Day"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-2xl font-bold text-foreground">
                        {initialData ? "Edit Task" : "Add New Task"}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="text-sm font-medium text-foreground">Task Title</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="e.g. Book Venue"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Timeframe / Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Specific Due Date</label>
                            <div className="relative mt-1">
                                <input
                                    type="date"
                                    value={formData.due_date || ""}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground">Notes</label>
                        <textarea
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={3}
                            placeholder="Vendor contacts, ideas..."
                        />
                    </div>

                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_completed}
                                onChange={(e) => setFormData({ ...formData, is_completed: e.target.checked })}
                                className="accent-primary w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium text-foreground">Mark as Completed</span>
                        </label>
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
                            Save Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
