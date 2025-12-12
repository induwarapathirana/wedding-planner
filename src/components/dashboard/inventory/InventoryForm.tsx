"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2 } from "lucide-react";
import { InventoryItem, ItemStatus } from "@/types/inventory";

interface InventoryFormProps {
    weddingId: string;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: InventoryItem;
}

const CATEGORIES = [
    "Decor", "Stationery", "Gifts & Favors",
    "Emergency Kit", "Ceremony Items", "Reception Items",
    "Attire & Accessories", "Signage", "Other"
];

const STATUSES: { value: ItemStatus; label: string }[] = [
    { value: 'needed', label: 'Needed' },
    { value: 'purchased', label: 'Purchased' },
    { value: 'rented', label: 'Rented' },
    { value: 'borrowed', label: 'Borrowed' },
    { value: 'packed', label: 'Packed / Ready' },
];

export default function InventoryForm({ weddingId, onClose, onSuccess, initialData }: InventoryFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        name: initialData?.name || "",
        category: initialData?.category || "Decor",
        quantity: initialData?.quantity || 1,
        unit_cost: initialData?.unit_cost || 0,
        status: initialData?.status || "needed",
        link: initialData?.link || "",
        notes: initialData?.notes || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                const { error } = await supabase
                    .from('inventory_items')
                    .update(formData)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('inventory_items')
                    .insert([{ ...formData, wedding_id: weddingId }]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-serif font-bold">
                        {initialData ? "Edit Item" : "Add Item"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Item Name *</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="e.g. Centerpiece Vases"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Unit Cost ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.unit_cost}
                                onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Link (Optional)</label>
                        <input
                            type="url"
                            value={formData.link || ""}
                            onChange={e => setFormData({ ...formData, link: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            value={formData.notes || ""}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-24"
                            placeholder="Details about size, color, storage location..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {initialData ? "Save Changes" : "Save Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
