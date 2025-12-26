"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Guest = {
    id?: string;
    name: string;
    group_category: string;
    priority: "A" | "B" | "C";
    rsvp_status: "accepted" | "declined" | "pending";
    meal_preference?: string;
    table_assignment?: string;
    companion_guest_count?: number;
    companion_names?: string[]; // Added: Optional names for companions
};

interface GuestDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (guest: Guest) => Promise<void>;
    initialData?: Guest | null;
    customGroups?: string[]; // Added: Persistent custom groups
    readOnly?: boolean; // Added: View Only Mode
}

export function GuestDialog({ isOpen, onClose, onSubmit, initialData, customGroups = [], readOnly = false }: GuestDialogProps) {
    const DEFAULT_GROUPS = ["Bride Family", "Groom Family", "Bride Friends", "Groom Friends", "Mutual", "Work"];
    const [formData, setFormData] = useState<Guest>({
        name: "",
        group_category: "Bride Family",
        priority: "B",
        rsvp_status: "pending",
        meal_preference: "",
        table_assignment: "",
        companion_guest_count: 0,
        companion_names: [],
    });
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    companion_guest_count: initialData.companion_guest_count || 0,
                    companion_names: initialData.companion_names || []
                });

                const isCustomGroup = initialData.group_category && !DEFAULT_GROUPS.includes(initialData.group_category);
                setIsCustom(!!isCustomGroup);
                if (isCustomGroup) {
                    setCustomValue(initialData.group_category);
                } else {
                    setCustomValue("");
                }
            } else {
                setFormData({
                    name: "",
                    group_category: "Bride Family",
                    priority: "B",
                    rsvp_status: "pending",
                    meal_preference: "",
                    table_assignment: "",
                    companion_guest_count: 0,
                    companion_names: [],
                });
                setIsCustom(false);
                setCustomValue("");
            }
        }
    }, [initialData, isOpen]);

    // Helper to update specific companion name
    const handleCompanionNameChange = (index: number, value: string) => {
        const currentNames = [...(formData.companion_names || [])];
        // Ensure array is large enough
        while (currentNames.length <= index) currentNames.push("");
        currentNames[index] = value;
        setFormData({ ...formData, companion_names: currentNames });
    };

    // Helper to change count and resize name array safely
    const handleCountChange = (newCount: number) => {
        const count = Math.max(0, Math.min(50, newCount));
        setFormData({ ...formData, companion_guest_count: count });
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const groupCategory = isCustom ? customValue : formData.group_category;

        // Clean up names array to match count exactly before submitting
        const count = formData.companion_guest_count || 0;
        const finalNames = (formData.companion_names || []).slice(0, count);

        await onSubmit({
            ...formData,
            group_category: groupCategory,
            companion_names: finalNames
        });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">

                {readOnly && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                        <span className="text-xl">🔒</span>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">View Only Mode</h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                You've reached your plan limit. Upgrade to Premium to make changes.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-2xl font-bold text-foreground">
                        {initialData ? "Guest Details" : "Add New Guest"}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name, Group, Priority */}
                    <fieldset disabled={readOnly} className="grid grid-cols-12 gap-4">
                        <div className="col-span-12">
                            <label className="text-sm font-medium text-foreground">Full Name (Primary)</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="col-span-8">
                            <label className="text-sm font-medium text-foreground">Group</label>
                            <select
                                value={isCustom ? "custom" : formData.group_category}
                                onChange={(e) => {
                                    if (e.target.value === "custom") {
                                        setIsCustom(true);
                                    } else {
                                        setIsCustom(false);
                                        setFormData({ ...formData, group_category: e.target.value });
                                    }
                                }}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {DEFAULT_GROUPS.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                                {customGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                                <option value="custom">Custom...</option>
                            </select>

                            {isCustom && (
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary animate-in fade-in slide-in-from-top-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Enter custom group name"
                                />
                            )}
                        </div>
                        <div className="col-span-4">
                            <label className="text-sm font-medium text-foreground">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as "A" | "B" | "C" })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="A">A - Must</option>
                                <option value="B">B - Standard</option>
                                <option value="C">C - Backup</option>
                            </select>
                        </div>
                    </fieldset>

                    {/* RSVP Status */}
                    <fieldset disabled={readOnly}>
                        <label className="text-sm font-medium text-foreground">RSVP Status</label>
                        <div className="mt-1 flex gap-2">
                            {(["pending", "accepted", "declined"] as const).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rsvp_status: status })}
                                    className={cn(
                                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                                        formData.rsvp_status === status
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-white text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {/* Advanced Details */}
                    <fieldset disabled={readOnly} className="rounded-xl bg-muted/30 p-4 space-y-4 border border-border/50 disabled:opacity-80">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Additional Guests (+Count)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Total Party: {1 + (formData.companion_guest_count || 0)}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={formData.companion_guest_count}
                                    onChange={(e) => handleCountChange(parseInt(e.target.value) || 0)}
                                    className="w-20 rounded-xl border border-border bg-white px-3 py-2 text-sm text-center focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Optional Companion Names */}
                        {(formData.companion_guest_count || 0) > 0 && (
                            <div className="space-y-2 pt-2 border-t border-dashed border-border/50 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 block">
                                    Guest Names (Optional)
                                </label>
                                {Array.from({ length: formData.companion_guest_count || 0 }).map((_, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-6 font-medium">#{idx + 1}</span>
                                        <input
                                            type="text"
                                            value={(formData.companion_names || [])[idx] || ""}
                                            onChange={(e) => handleCompanionNameChange(idx, e.target.value)}
                                            className="flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder={`Guest ${idx + 1} Name`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {formData.rsvp_status === "accepted" && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Meal Choice</label>
                                    <select
                                        value={formData.meal_preference || ""}
                                        onChange={(e) => setFormData({ ...formData, meal_preference: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <option value="">None / Pending</option>
                                        <option value="Beef">Beef</option>
                                        <option value="Fish">Fish</option>
                                        <option value="Chicken">Chicken</option>
                                        <option value="Vegan">Vegan</option>
                                        <option value="Kids">Kids Meal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground">Table No.</label>
                                    <input
                                        type="text"
                                        value={formData.table_assignment || ""}
                                        onChange={(e) => setFormData({ ...formData, table_assignment: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                            </div>
                        )}
                    </fieldset>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            Close
                        </button>
                        {!readOnly && (
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Guest
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
