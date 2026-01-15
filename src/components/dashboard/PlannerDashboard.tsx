"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Users, Calendar, FolderOpen, Plus, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { AddClientModal } from "@/components/dashboard/clients/AddClientModal";

type Client = {
    id: string;
    name: string;
    email: string;
    wedding_date: string;
    budget: number;
    status: 'lead' | 'active' | 'completed' | 'lost';
    wedding_id?: string;
};

export function PlannerDashboard() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeWeddings: 0,
        totalLeads: 0,
        upcomingWeddings: 0
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [creatingWeddingFor, setCreatingWeddingFor] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Clients
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('planner_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            const clientList = data as Client[];
            setClients(clientList);

            // Calculate Stats
            const active = clientList.filter(c => c.status === 'active' && c.wedding_id).length;
            const leads = clientList.filter(c => c.status === 'lead').length;
            const upcoming = clientList.filter(c => c.wedding_date && new Date(c.wedding_date) > new Date()).length;

            setStats({
                activeWeddings: active,
                totalLeads: leads,
                upcomingWeddings: upcoming
            });
        }
        setLoading(false);
    };

    async function handleCreateWedding(client: Client) {
        if (!confirm(`Create a new wedding workspace for ${client.name}?`)) return;

        setCreatingWeddingFor(client.id);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        // 1. Create Wedding
        const { data: wedding, error: weddingError } = await supabase
            .from('weddings')
            .insert({
                created_by: user.id,
                couple_name_1: client.name.split(' and ')[0] || client.name.split(' & ')[0] || client.name,
                couple_name_2: client.name.split(' and ')[1] || client.name.split(' & ')[1] || '',
                wedding_date: client.wedding_date || null,
                estimated_budget: client.budget || 0,
                currency: 'USD',
                tier: 'free',
                premium_trial_ends_at: trialEndsAt.toISOString()
            })
            .select()
            .single();

        if (weddingError) {
            alert("Error creating wedding: " + weddingError.message);
            setCreatingWeddingFor(null);
            return;
        }

        // 2. Add Planner as Collaborator (Owner)
        await supabase.from('collaborators').insert({
            wedding_id: wedding.id,
            user_id: user.id,
            role: 'owner'
        });

        // 3. Link Client
        await supabase
            .from('clients')
            .update({
                wedding_id: wedding.id,
                status: 'active'
            })
            .eq('id', client.id);

        fetchData();
        setCreatingWeddingFor(null);
    }

    return (
        <div className="space-y-8">
            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Pro Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your weddings and clients.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/dashboard/calendar')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Calendar className="w-4 h-4" />
                        Master Calendar
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.activeWeddings}</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Active Weddings</h3>
                    <p className="text-sm text-gray-500 mt-1">Currently being planned</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.totalLeads}</span>
                    </div>
                    <h3 className="font-medium text-gray-900">New Leads</h3>
                    <p className="text-sm text-gray-500 mt-1">Potential clients</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.upcomingWeddings}</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Upcoming Events</h3>
                    <p className="text-sm text-gray-500 mt-1">Weddings relative to today</p>
                </div>
            </div>

            {/* Recent Workspaces / Clients */}
            <div className="space-y-4">
                <h2 className="font-serif text-xl font-bold text-gray-900">Your Workspaces</h2>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading workspaces...</div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No clients yet. Add your first client to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map(client => (
                            <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                            <p className="text-xs text-gray-500 capitalize">{client.status}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-500 mb-4">
                                    {client.wedding_date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{new Date(client.wedding_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-gray-50">
                                    {client.wedding_id ? (
                                        <button
                                            onClick={() => router.push(`/dashboard?weddingId=${client.wedding_id}`)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-primary/5 text-primary text-sm font-medium rounded-lg hover:bg-primary/10 transition-colors"
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                            Open Workspace
                                        </button>
                                    ) : (
                                        <button
                                            disabled={!!creatingWeddingFor}
                                            onClick={() => handleCreateWedding(client)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            {creatingWeddingFor === client.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4" />
                                            )}
                                            Create Workspace
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
