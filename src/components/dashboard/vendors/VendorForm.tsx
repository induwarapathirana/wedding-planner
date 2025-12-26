"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2 } from "lucide-react";
import { Vendor, VendorStatus } from "@/types/vendors";

interface VendorFormProps {
    weddingId: string;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Vendor;
}

const CATEGORIES = [
    "Venue", "Catering", "Photography", "Videography",
    "Florist", "Music/DJ", "Attire", "Hair & Makeup",
    "Officiant", "Planner", "Stationery", "Transport",
    "Cake", "Favors", "Other"
];

const STATUSES: { value: VendorStatus; label: string }[] = [
    { value: 'researching', label: 'Researching' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'hired', label: 'Hired' },
    { value: 'declined', label: 'Declined' },
];

export default function VendorForm({ weddingId, onClose, onSuccess, initialData }: VendorFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Vendor>>({
        category: initialData?.category || "Other",
        company_name: initialData?.company_name || "",
        contact_name: initialData?.contact_name || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        website: initialData?.website || "",
        status: initialData?.status || "researching",
        price_estimate: initialData?.price_estimate || undefined,
        pricing_type: initialData?.pricing_type || null,
        pricing_unit: initialData?.pricing_unit || "",
        notes: initialData?.notes || "",
    });

    // New state for directory checkbox
    const [addToDirectory, setAddToDirectory] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                const { error } = await supabase
                    .from('vendors')
                    .update(formData)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error, data } = await supabase
                    .from('vendors')
                    .insert([{ ...formData, wedding_id: weddingId }])
                    .select()
                    .single();

                if (error) throw error;

                // If checkbox is checked, add to Directory
                if (addToDirectory) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        await supabase.from('vendor_directory').insert([{
                            user_id: user.id,
                            category: formData.category,
                            company_name: formData.company_name,
                            contact_name: formData.contact_name,
                            email: formData.email,
                            phone: formData.phone,
                            website: formData.website,
                            price_estimate: formData.price_estimate,
                            notes: formData.notes
                        }]);
                    }
                }
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
                        {initialData ? "Edit Vendor" : "Add Vendor"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Company Name *</label>
                            <input
                                required
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="e.g. Dreamy Florals"
                            />
                        </div>

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
                                onChange={e => setFormData({ ...formData, status: e.target.value as VendorStatus })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Contact Name</label>
                            <input
                                value={formData.contact_name || ""}
                                onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Jane Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email || ""}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="contact@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone || ""}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Website</label>
                            <input
                                type="url"
                                value={formData.website || ""}
                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Pricing Type</label>
                            <select
                                value={formData.pricing_type || ""}
                                onChange={e => setFormData({ ...formData, pricing_type: e.target.value as any })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="">Not specified</option>
                                <option value="flat_rate">Flat Rate</option>
                                <option value="per_person">Per Person</option>
                                <option value="hourly">Hourly</option>
                                <option value="per_item">Per Item</option>
                                <option value="package">Package Deal</option>
                                <option value="tbd">To Be Determined</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Price Estimate</label>
                            <input
                                type="number"
                                value={formData.price_estimate || ""}
                                onChange={e => setFormData({ ...formData, price_estimate: parseFloat(e.target.value) })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        {formData.pricing_type && formData.pricing_type !== 'tbd' && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Custom Unit (Optional)</label>
                                <input
                                    value={formData.pricing_unit || ""}
                                    onChange={e => setFormData({ ...formData, pricing_unit: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="e.g., per guest, per hour, per arrangement"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank to use the default pricing type label</p>
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ""}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-24"
                                placeholder="Add specific package details or questions..."
                            />
                        </div>
                    </div>


                    {!initialData && (
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="addToDirectory"
                                checked={addToDirectory}
                                onChange={(e) => setAddToDirectory(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="addToDirectory" className="text-sm text-gray-700 cursor-pointer select-none">
                                Also save to my <strong>Vendor Directory</strong> for future weddings
                            </label>
                        </div>
                    )}

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
                            {initialData ? "Save Changes" : "Add Vendor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
