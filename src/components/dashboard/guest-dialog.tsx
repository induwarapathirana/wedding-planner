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
    plus_one: boolean;
};

interface GuestDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (guest: Guest) => Promise<void>;
    initialData?: Guest | null;
}

export function GuestDialog({ isOpen, onClose, onSubmit, initialData }: GuestDialogProps) {
    const [formData, setFormData] = useState<Guest>({
        name: "",
        group_category: "Bride Family",
        priority: "B",
        rsvp_status: "pending",
        meal_preference: "",
        table_assignment: "",
        plus_one: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: "",
                group_category: "Bride Family", // Match the first option in the select
                priority: "B",
                rsvp_status: "pending",
                meal_preference: "",
                table_assignment: "",
                plus_one: false,
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-2xl font-bold text-foreground">
                        {initialData ? "Edit Guest" : "Add New Guest"}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name, Group, Priority */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12">
                            <label className="text-sm font-medium text-foreground">Full Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="col-span-8">
                            <label className="text-sm font-medium text-foreground">Group</label>
                            <select
                                value={formData.group_category}
                                onChange={(e) => setFormData({ ...formData, group_category: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="Bride Family">Bride Family</option>
                                <option value="Groom Family">Groom Family</option>
                                <option value="Bride Friends">Bride Friends</option>
                                <option value="Groom Friends">Groom Friends</option>
                                <option value="Mutual">Mutual</option>
                                <option value="Work">Work</option>
                            </select>
                        </div>
                        <div className="col-span-4">
                            <label className="text-sm font-medium text-foreground">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as "A" | "B" | "C" })}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="A">A - Must</option>
                                <option value="B">B - Standard</option>
                                <option value="C">C - Backup</option>
                            </select>
                        </div>
                    </div>

                    {/* RSVP Status */}
                    <div>
                        <label className="text-sm font-medium text-foreground">RSVP Status</label>
                        <div className="mt-1 flex gap-2">
                            {(["pending", "accepted", "declined"] as const).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rsvp_status: status })}
                                    className={cn(
                                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all",
                                        formData.rsvp_status === status
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-white text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Details */}
                    <div className="rounded-xl bg-muted/30 p-4 space-y-4 border border-border/50">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Plus One (+1)</label>
                            <input
                                type="checkbox"
                                checked={formData.plus_one}
                                onChange={(e) => setFormData({ ...formData, plus_one: e.target.checked })}
                                className="accent-primary h-4 w-4 rounded"
                            />
                        </div>

                        {formData.rsvp_status === "accepted" && (
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Meal Choice</label>
                                    <select
                                        value={formData.meal_preference || ""}
                                        onChange={(e) => setFormData({ ...formData, meal_preference: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                        className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                            </div>
                        )}
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
                            Save Guest
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
