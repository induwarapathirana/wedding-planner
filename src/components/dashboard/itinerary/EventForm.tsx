"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { Event } from "@/types/itinerary";
import { format } from "date-fns";

interface EventFormProps {
    weddingId: string;
    weddingDate?: string; // Helpful to default the date picker
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Event;
}

const CATEGORIES = [
    "Getting Ready", "Ceremony", "Photos", "Cocktail Hour",
    "Reception", "Dinner", "Party", "Transport", "Other"
];

export default function EventForm({ weddingId, weddingDate, onClose, onSuccess, initialData }: EventFormProps) {
    const [loading, setLoading] = useState(false);

    // Helper to format date for datetime-local input (YYYY-MM-DDThh:mm)
    const toInputFormat = (isoString?: string) => {
        if (!isoString) {
            // Default to wedding date at 9am, or usage date
            const base = weddingDate ? new Date(weddingDate) : new Date();
            base.setHours(9, 0, 0, 0);
            return format(base, "yyyy-MM-dd'T'HH:mm");
        }
        return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
    };

    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        start_time: toInputFormat(initialData?.start_time),
        end_time: initialData?.end_time ? toInputFormat(initialData?.end_time) : "",
        location: initialData?.location || "",
        description: initialData?.description || "",
        category: initialData?.category || "Ceremony",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert back to ISO for storage
            const payload = {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
            };

            if (initialData?.id) {
                const { error } = await supabase
                    .from('events')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('events')
                    .insert([{ ...payload, wedding_id: weddingId }]);
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
                        {initialData ? "Edit Event" : "Add Event"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Event Title *</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="e.g. Ceremony Begins"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Time *</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
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
                            <label className="block text-sm font-medium mb-1">Location</label>
                            <input
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="e.g. Main Hall"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Notes</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-24"
                            placeholder="Add details about this event..."
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
                            {initialData ? "Save Changes" : "Save Event"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
