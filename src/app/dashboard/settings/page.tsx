"use client";

import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Trash2, UserPlus, X, Bell, BellOff, Settings } from "lucide-react";
import Link from "next/link";
import { PayHereButton } from "@/components/payhere-button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { LimitModal } from "@/components/dashboard/limit-modal";

type WeddingData = {
    id: string;
    couple_name_1: string;
    couple_name_2: string;
    wedding_date: string;
    location?: string;
    currency?: string;
    target_guest_count?: number;
    estimated_budget?: number; // Added
    tier?: 'free' | 'premium'; // Added
};

export default function SettingsPage() {
    const [wedding, setWedding] = useState<WeddingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: 'delete_wedding' | null }>({ isOpen: false, action: null });
    const router = useRouter();

    useEffect(() => {
        fetchWedding();
    }, []);

    const confirmDeleteWedding = () => {
        setConfirmState({ isOpen: true, action: 'delete_wedding' });
    };

    const executeDeleteWedding = async () => {
        if (!wedding?.id) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_wedding_cascade', {
                target_wedding_id: wedding.id
            });

            if (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete wedding: " + error.message);
                return;
            }

            // Success - Redirect to home or dashboard
            window.location.href = '/dashboard';
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred.");
        } finally {
            setIsDeleting(false);
            setConfirmState({ isOpen: false, action: null });
        }
    };

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

        setWedding(data as WeddingData); // Cast including tier
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
                target_guest_count: wedding.target_guest_count,
                estimated_budget: wedding.estimated_budget, // Added
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

    if (loading) return <div className="p-8">Loading settings...</div>;

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
                                    Target Guest Count (Expected)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={wedding?.target_guest_count || ''}
                                    onChange={(e) => setWedding(prev => prev ? { ...prev, target_guest_count: parseInt(e.target.value) || 0 } : null)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g. 150"
                                />
                                <p className="text-xs text-gray-500 mt-1">This allows you to track your actual headcount vs your goal.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estimated Total Budget
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={wedding?.estimated_budget || ''}
                                    onChange={(e) => setWedding(prev => prev ? { ...prev, estimated_budget: parseFloat(e.target.value) || 0 } : null)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g. 20000"
                                />
                                <p className="text-xs text-gray-500 mt-1">Your total spending goal for the wedding.</p>
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

                    {/* Notification Settings Section */}
                    <NotificationSettings weddingId={wedding?.id || ''} />

                    {/* Subscription Section */}
                    <div className="bg-white rounded-2xl border border-border overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plan</h2>
                            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-purple-900">Current Plan: {wedding?.tier === 'premium' ? 'Premium' : 'Free'}</h3>
                                        {wedding?.tier === 'premium' && <span className="bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>}
                                    </div>
                                    <p className="text-sm text-purple-700 mt-1">
                                        {wedding?.tier === 'premium'
                                            ? "You have access to all premium features."
                                            : "Upgrade to unlock unlimited guests, budget items, and more."}
                                    </p>
                                </div>
                                {wedding?.tier !== 'premium' && (
                                    <PayHereButton
                                        orderId={`ORDER_${wedding?.id}_${Date.now()}`}
                                        items="Wedding Planner Premium"
                                        amount={990}
                                        currency="LKR"
                                        first_name={wedding?.couple_name_1.split(' ')[0] || 'User'}
                                        last_name={wedding?.couple_name_1.split(' ')[1] || 'Name'}
                                        email="user@example.com" // Todo: Get real email
                                        phone="0771234567"
                                        address="123, Main Street"
                                        city="Colombo"
                                        country="Sri Lanka"
                                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Upgrade for 990 LKR
                                    </PayHereButton>
                                )}
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                            <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-red-900">Delete Wedding</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Permanently delete this wedding and all associated data. This action cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={confirmDeleteWedding}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                                >
                                    {isDeleting ? "Deleting..." : "Delete Wedding"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Side Column */}
                <div className="lg:col-span-1">
                    <TeamMembers weddingId={wedding?.id || ''} tier={wedding?.tier || 'free'} />
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen && confirmState.action === 'delete_wedding'}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                onConfirm={executeDeleteWedding}
                title="Delete Wedding?"
                description="Are you sure you want to delete this wedding? This action is irreversible and will delete all guests, budget items, and data."
                variant="danger"
            />
        </div>
    );
}

// Sub-component for Notification Management
function NotificationSettings({ weddingId }: { weddingId: string }) {
    const [permission, setPermission] = useState<string>("default");
    const [isPWA, setIsPWA] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPermission(Notification.permission);
            setIsPWA(
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true
            );

            // Get user ID
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) setUserId(user.id);
            });
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const { registerServiceWorker, requestNotificationPermission, subscribeToPush } = await import('@/lib/registerServiceWorker');

            // Register service worker
            const registration = await registerServiceWorker();
            if (!registration) throw new Error("Service worker registration failed. Please ensure you are using Safari on iOS and have added the app to your home screen.");

            // Request permission
            const status = await requestNotificationPermission();
            setPermission(status);
            if (status !== "granted") throw new Error("Notification permission denied.");

            // Subscribe to push
            const subscription = await subscribeToPush(registration);
            if (!subscription) throw new Error("Push subscription failed. Check VAPID keys.");

            // Save to DB
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userId,
                    weddingId,
                }),
            });

            if (!response.ok) throw new Error("Failed to save subscription to database.");

            alert("Notifications enabled successfully! 🎉");
            localStorage.setItem("notification-enabled", "true");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to enable notifications.");
        } finally {
            setLoading(false);
        }
    };

    const resetPrompt = () => {
        localStorage.removeItem("notification-prompt-dismissed");
        localStorage.removeItem("notification-enabled");
        alert("Notification preferences reset. The prompt will reappear on your next visit to the dashboard.");
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
                    <p className="text-sm text-gray-500">Manage your alerts for due dates and tasks.</p>
                </div>
            </div>

            {!isPWA && (
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 mt-0.5">
                        <Settings className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-900">Add to Home Screen Required</p>
                        <p className="text-xs text-amber-700 mt-1">
                            Push notifications on iOS require the app to be added to your home screen first.
                            Tap the share icon and select "Add to Home Screen".
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Status</p>
                        <p className="text-xs text-gray-500 capitalize">{permission === 'default' ? 'Not configured' : permission}</p>
                    </div>
                    {permission !== "granted" ? (
                        <button
                            onClick={handleEnable}
                            disabled={loading || !isPWA}
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {loading ? "Enabling..." : "Enable Alerts"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600">
                            <Bell className="w-4 h-4" />
                            <span className="text-sm font-medium">Notifications Active</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-start">
                    <button
                        onClick={resetPrompt}
                        className="text-xs text-gray-500 hover:text-primary transition-colors underline underline-offset-4"
                    >
                        Reset notification preferences
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sub-component for Team Management
function TeamMembers({ weddingId, tier }: { weddingId: string, tier: string }) {
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Team Confirm State
    const [teamConfirm, setTeamConfirm] = useState<{
        isOpen: boolean;
        type: 'revoke' | 'remove_member' | null;
        id?: string;
    }>({ isOpen: false, type: null });

    useEffect(() => {
        if (weddingId) fetchData();
    }, [weddingId]);

    // ... (keep fetchData)

    // Handlers
    const confirmRevoke = (id: string) => {
        setTeamConfirm({ isOpen: true, type: 'revoke', id });
    };

    const confirmRemoveMember = (userId: string) => {
        setTeamConfirm({ isOpen: true, type: 'remove_member', id: userId });
    };

    const executeTeamAction = async () => {
        if (teamConfirm.type === 'revoke' && teamConfirm.id) {
            await supabase.from('invitations').delete().eq('id', teamConfirm.id);
            fetchData();
        } else if (teamConfirm.type === 'remove_member' && teamConfirm.id) {
            const { error } = await supabase
                .from('collaborators')
                .delete()
                .eq('wedding_id', weddingId)
                .eq('user_id', teamConfirm.id);

            if (error) {
                console.error(error);
                alert("Failed to remove member. Ensure you are an owner.");
            } else {
                fetchData();
            }
        }
        setTeamConfirm({ isOpen: false, type: null, id: undefined });
    };
    const fetchData = async () => {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        // Fetch Collaborators
        const { data: collaData } = await supabase
            .from('collaborators')
            .select(`
                user_id,
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

    const isCurrentUserOwner = collaborators.find(c => c.user_id === currentUserId)?.role === 'owner';
    console.log("DEBUG TEAM:", { currentUserId, isCurrentUserOwner, collaborators });

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        // Limit Check
        if (tier === 'free') {
            alert("Free plan does not support adding collaborators. Please upgrade to Premium.");
            return;
        }

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
            fetchData(); // Refresh to show in pending if needed
        }
        setSending(false);
    };

    // Handlers
    // Removed old confirm handlers

    if (loading) return <div className="text-sm text-gray-500">Loading team...</div>;

    return (
        <div className="space-y-6">
            {/* Invite Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Invite Member</h3>

                {tier === 'free' ? (
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-600 mb-2">Collaboration is a Premium feature.</p>
                        <p className="text-xs text-muted-foreground">Upgrade your plan to invite your partner or team.</p>
                    </div>
                ) : (
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
                            {sending ? "Generating Code..." : "Generate Invitation Code"}
                        </button>
                    </form>
                )}

                {generatedLink && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-xs text-green-800 font-medium mb-2">Invitation Code Generated!</p>
                        <p className="text-xs text-gray-500 mb-2">Copy and send this to <strong>{inviteEmail}</strong>:</p>
                        <textarea
                            readOnly
                            className="w-full text-xs text-gray-700 bg-white p-3 rounded border border-green-200 focus:outline-none resize-none h-32"
                            value={
                                `You are invited to collaborate on our wedding plan!

1. Log in to Vow & Venue
2. On the dashboard, find "Collaboration" or "Join Wedding"
3. Enter this Invitation Code:
${generatedLink.split('/').pop()}

See you there!`}
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    `You are invited to collaborate on our wedding plan!

1. Log in to Vow & Venue
2. On the dashboard, find "Collaboration" or "Join Wedding"
3. Enter this Invitation Code:
${generatedLink.split('/').pop()}

See you there!`);
                                alert("Copied to clipboard!");
                            }}
                            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
                        >
                            Copy Instructions
                        </button>
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
                                    onClick={() => confirmRevoke(inv.id)}
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
                        <div key={i} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.profiles?.full_name || 'User'} {member.user_id === currentUserId && "(You)"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {member.profiles?.email}
                                </p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                                    {member.role}
                                </span>
                                {isCurrentUserOwner && member.user_id !== currentUserId && (
                                    <button
                                        onClick={() => confirmRemoveMember(member.user_id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        title="Remove Member"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                isOpen={teamConfirm.isOpen}
                onClose={() => setTeamConfirm({ ...teamConfirm, isOpen: false })}
                onConfirm={executeTeamAction}
                title={teamConfirm.type === 'revoke' ? "Revoke Invitation?" : "Remove Member?"}
                description={teamConfirm.type === 'revoke'
                    ? "Are you sure you want to revoke this invitation?"
                    : "Are you sure you want to remove this person from the team?"}
                variant="danger"
            />

            <LimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                feature="Collaborators"
                limit={0}
                tier={tier}
            />
        </div>
    );
}
