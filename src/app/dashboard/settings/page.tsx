"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, Building2, Globe, PenTool } from "lucide-react";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        company_name: "",
        website: "",
        logo_url: "",
        signature_url: "",
        branding_color: "#000000"
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setFormData({
                company_name: data.company_name || "",
                website: data.website || "",
                logo_url: data.logo_url || "",
                signature_url: data.signature_url || "",
                branding_color: data.branding_color || "#000000"
            });
        }
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update(formData)
            .eq('id', user.id);

        setSaving(false);
        if (error) {
            alert("Error saving settings: " + error.message);
        } else {
            alert("Settings saved successfully!");
        }
    }

    // Mock generic uploader (In real app, use Supabase Storage)
    async function handleFileUpload(file: File, field: 'logo_url' | 'signature_url') {
        // TODO: Implement actual Supabase Storage upload
        // For now, we'll just fake it or use a placeholder if they try
        alert("File upload requires Supabase Storage setup. For this demo, please paste a URL.");
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="font-serif text-3xl font-bold text-gray-900">Business Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your brand identity and invoicing details.</p>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

                {/* Branding Section */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Brand Identity
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900/20 outline-none"
                                placeholder="e.g. Dream Weddings Co."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900/20 outline-none"
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo URL</label>
                        <div className="flex gap-4 items-start">
                            {formData.logo_url && (
                                <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-gray-100 bg-gray-50" />
                            )}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={formData.logo_url}
                                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900/20 outline-none mb-2"
                                    placeholder="https://..."
                                />
                                <p className="text-xs text-gray-500">Paste an image URL (Uploads coming soon)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoicing Section */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <PenTool className="w-5 h-5" />
                        Invoicing & Signatures
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature URL</label>
                        <input
                            type="text"
                            value={formData.signature_url}
                            onChange={e => setFormData({ ...formData, signature_url: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900/20 outline-none"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Used for e-signing invoices and contracts.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>

            </form>
        </div>
    );
}
