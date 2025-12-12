"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

type WeddingData = {
    id: string;
    couple_name_1: string;
    couple_name_2: string;
    wedding_date: string;
    location?: string;
    currency?: string;
};

export default function SettingsPage() {
    const [wedding, setWedding] = useState<WeddingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchWedding();
    }, []);

    async function fetchWedding() {
        const weddingId = localStorage.getItem("current_wedding_id");
        if (!weddingId) {
            router.push("/onboarding");
            return;
        }

        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .eq('id', weddingId)
            .single();

        if (error) {
            console.error('Error fetching wedding:', error);
            alert('Error loading wedding details');
            return;
        }

        setWedding(data);
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!wedding) return;

        setSaving(true);

        const { error } = await supabase
            .from('weddings')
            .update({
                couple_name_1: wedding.couple_name_1,
                couple_name_2: wedding.couple_name_2,
                wedding_date: wedding.wedding_date,
                location: wedding.location,
                currency: wedding.currency,
            })
            .eq('id', wedding.id);

        setSaving(false);

        if (error) {
            console.error('Error updating wedding:', error);
            alert('Error saving changes');
        } else {
            alert('Wedding details updated successfully!');
            router.push('/dashboard');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!wedding) return null;

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Wedding Settings</h1>
                <p className="text-muted-foreground mb-8">Update your wedding details</p>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Partner 1 Name
                            </label>
                            <input
                                type="text"
                                value={wedding.couple_name_1}
                                onChange={(e) => setWedding({ ...wedding, couple_name_1: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Partner 2 Name
                            </label>
                            <input
                                type="text"
                                value={wedding.couple_name_2}
                                onChange={(e) => setWedding({ ...wedding, couple_name_2: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Wedding Date
                        </label>
                        <input
                            type="date"
                            value={wedding.wedding_date}
                            onChange={(e) => setWedding({ ...wedding, wedding_date: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Location (Optional)
                        </label>
                        <input
                            type="text"
                            value={wedding.location || ''}
                            onChange={(e) => setWedding({ ...wedding, location: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g., Colombo, Sri Lanka"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Currency
                        </label>
                        <select
                            value={wedding.currency || 'USD'}
                            onChange={(e) => setWedding({ ...wedding, currency: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="LKR">LKR (Rs)</option>
                            <option value="INR">INR (₹)</option>
                        </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors font-medium"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
