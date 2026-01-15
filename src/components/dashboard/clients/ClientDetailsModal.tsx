"use client";

import { useState } from "react";
import { X, Calendar, Mail, Phone, DollarSign, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Client = {
    id: string;
    name: string;
    email: string;
    phone: string;
    wedding_date: string;
    budget: number;
    status: 'lead' | 'active' | 'completed' | 'lost';
    wedding_id?: string;
    notes?: string;
};

type ClientDetailsModalProps = {
    client: Client | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
};

export function ClientDetailsModal({ client, isOpen, onClose, onUpdate }: ClientDetailsModalProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({});

    if (!isOpen || !client) return null;

    const currentData = editing ? { ...client, ...formData } : client;

    async function handleSave() {
        setSaving(true);
        const { error } = await supabase
            .from('clients')
            .update(formData)
            .eq('id', client.id);

        if (error) {
            alert("Error updating client: " + error.message);
        } else {
            setEditing(false);
            setFormData({});
            onUpdate();
        }
        setSaving(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-gray-900">Client Details</h2>
                        <p className="text-sm text-gray-500 mt-1">View and edit client information</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            Name
                        </label>
                        {editing ? (
                            <input
                                value={currentData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            />
                        ) : (
                            <p className="text-lg font-semibold text-gray-900">{currentData.name}</p>
                        )}
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" /> Email
                            </label>
                            {editing ? (
                                <input
                                    type="email"
                                    value={currentData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            ) : (
                                <p className="text-gray-900">{currentData.email || '—'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" /> Phone
                            </label>
                            {editing ? (
                                <input
                                    type="tel"
                                    value={currentData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            ) : (
                                <p className="text-gray-900">{currentData.phone || '—'}</p>
                            )}
                        </div>
                    </div>

                    {/* Wedding Date & Budget */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" /> Wedding Date
                            </label>
                            {editing ? (
                                <input
                                    type="date"
                                    value={currentData.wedding_date || ''}
                                    onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            ) : (
                                <p className="text-gray-900">
                                    {currentData.wedding_date ? new Date(currentData.wedding_date).toLocaleDateString() : '—'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-400" /> Budget
                            </label>
                            {editing ? (
                                <input
                                    type="number"
                                    value={currentData.budget || 0}
                                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            ) : (
                                <p className="text-gray-900">${currentData.budget?.toLocaleString() || '0'}</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" /> Notes
                        </label>
                        {editing ? (
                            <textarea
                                rows={4}
                                value={currentData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                placeholder="Add notes about this client..."
                            />
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                                <p className="text-gray-700 whitespace-pre-wrap">{currentData.notes || 'No notes yet'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    {editing ? (
                        <>
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setFormData({});
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => setEditing(true)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                            >
                                Edit Details
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
