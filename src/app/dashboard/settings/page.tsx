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
            router.push("/dashboard");
            return;
        }

        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .eq('id', weddingId)
            .single();

        if (error) {
            console.error('Error fetching wedding:', error);
            // If fetching failed (e.g. invalid ID, no access), clear stale ID and redirect
            localStorage.removeItem("current_wedding_id");
            router.push("/dashboard");
            return;
        }

        setWedding(data);
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!wedding) return;

        setSaving(true);
        // ... (existing save logic remains the same, assuming it's correct in previous context)
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

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Wedding Details</h1>
                        <p className="text-gray-500 mb-8">Update your wedding information.</p>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Partner 1 Name
                                    </label>
                                    <input
                                        type="text"
                                        value={wedding?.couple_name_1 || ''}
                                        onChange={(e) => setWedding(prev => prev ? { ...prev, couple_name_1: e.target.value } : null)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Partner 2 Name
                                    </label>
                                    <input
                                        type="text"
                                        value={wedding?.couple_name_2 || ''}
                                        onChange={(e) => setWedding(prev => prev ? { ...prev, couple_name_2: e.target.value } : null)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Wedding Date
                                </label>
                                <input
                                    type="date"
                                    value={wedding?.wedding_date || ''}
                                    onChange={(e) => setWedding(prev => prev ? { ...prev, wedding_date: e.target.value } : null)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={wedding?.location || ''}
                                    onChange={(e) => setWedding(prev => prev ? { ...prev, location: e.target.value } : null)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g., Colombo, Sri Lanka"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Currency
                                </label>
                                <select
                                    value={wedding?.currency || 'USD'}
                                    onChange={(e) => setWedding(prev => prev ? { ...prev, currency: e.target.value } : null)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="LKR">LKR (Rs)</option>
                                    <option value="INR">INR (₹)</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium shadow-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Team Side Column */}
                <div className="lg:col-span-1">
                    <TeamMembers weddingId={wedding?.id || ''} />
                </div>
            </div>
        </div>
    );
}

// Sub-component for Team Management to keep main file clean-ish
function TeamMembers({ weddingId }: { weddingId: string }) {
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    useEffect(() => {
        if (weddingId) fetchData();
    }, [weddingId]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Collaborators
        const { data: collaData } = await supabase
            .from('collaborators')
            .select(`
                role,
                profiles (email, full_name, avatar_url)
            `)
            .eq('wedding_id', weddingId);

        if (collaData) setCollaborators(collaData);

        // Fetch Invitations
        const { data: inviteData } = await supabase
            .from('invitations')
            .select('*')
            .eq('wedding_id', weddingId)
            .eq('status', 'pending');

        if (inviteData) setInvitations(inviteData);
        setLoading(false);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setGeneratedLink(null);

        // Generate simple random token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const { error } = await supabase
            .from('invitations')
            .insert({
                wedding_id: weddingId,
                email: inviteEmail,
                token: token,
                role: 'editor'
            });

        if (error) {
            alert(error.message);
        } else {
            setGeneratedLink(`${window.location.origin}/invite/${token}`);
            setInviteEmail("");
            fetchData();
        }
        setSending(false);
    };

    const handleRevoke = async (id: string) => {
        if (!confirm("Revoke this invitation?")) return;
        await supabase.from('invitations').delete().eq('id', id);
        fetchData();
    };

    if (loading) return <div className="text-sm text-gray-500">Loading team...</div>;

    return (
        <div className="space-y-6">
            {/* Invite Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Invite Member</h3>
                <form onSubmit={handleInvite} className="space-y-3">
                    <div>
                        <input
                            type="email"
                            required
                            placeholder="Email address"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {sending ? "Creating Link..." : "Create Invitation Link"}
                    </button>
                </form>

                {generatedLink && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-xs text-green-800 font-medium mb-1">Invitation Created!</p>
                        <div className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-green-100 select-all">
                            {generatedLink}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Share this link with them.</p>
                    </div>
                )}
            </div>

            {/* Pending Invites */}
            {invitations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Pending Invites</h3>
                    <div className="space-y-3">
                        {invitations.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 truncate mr-2" title={inv.email}>{inv.email}</span>
                                <button
                                    onClick={() => handleRevoke(inv.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current Team */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Team Members</h3>
                <div className="space-y-4">
                    {collaborators.map((member, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.profiles?.full_name || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {member.profiles?.email}
                                </p>
                            </div>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                                {member.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
