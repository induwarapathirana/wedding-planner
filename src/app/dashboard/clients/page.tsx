"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Calendar, Mail, Phone, MoreHorizontal, Users } from "lucide-react";
import { Check, Loader2, Sparkles, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { AddClientModal } from "@/components/dashboard/clients/AddClientModal";
// Note: We'll add the 'Add Client' Modal later, for now just the list.

type Client = {
    id: string;
    name: string;
    email: string;
    phone: string;
    wedding_date: string;
    budget: number;
    status: 'lead' | 'active' | 'completed' | 'lost';
    wedding_id?: string;
};

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, lead, active
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // NEW STATE
    const [creatingWeddingFor, setCreatingWeddingFor] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            setUserId(user.id);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('planner_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setClients(data as Client[]);
        }
        setLoading(false);
    }
    // ... (rest of function omitted for brevity, logic remains same)

    async function handleCreateWedding(client: Client) {
        // ...
    }
    // ...
    // ...
    return (
        <div className="space-y-6">
            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchClients}
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your leads and active weddings.</p>
                </div>
                <div className="flex gap-2">
                    {userId && (
                        <button
                            onClick={() => {
                                const link = `${window.location.origin}/inquiry/${userId}`;
                                navigator.clipboard.writeText(link);
                                alert("Lead form link copied!");
                            }}
                            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-medium"
                        >
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            Copy Form Link
                        </button>
                    )}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-transparent focus:outline-none text-sm"
                    />
                </div>
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    {['all', 'lead', 'active', 'completed', 'lost'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}s
                        </button>
                    ))}
                </div>
            </div>

            {/* Client List */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No clients found</h3>
                    <p className="text-gray-500 text-sm mt-1">Get started by adding your first client.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 leading-tight">{client.name}</h3>

                                        {/* Status Dropdown Group */}
                                        <div className="relative group/status inline-block mt-1">
                                            <button className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${client.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                                                client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                    client.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {client.status}
                                                <span className="opacity-0 group-hover/status:opacity-100 transition-opacity">▼</span>
                                            </button>

                                            {/* Dropdown Menu */}
                                            <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 hidden group-hover/status:block z-10">
                                                {['lead', 'active', 'completed', 'lost'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => updateStatus(client.id, s as any)}
                                                        className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize ${client.status === s ? 'font-bold text-gray-900' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-gray-500">
                                {client.wedding_date && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{new Date(client.wedding_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {client.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                )}
                                {client.budget && (
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center text-gray-900 font-medium">
                                        <span>Budget</span>
                                        <span>{formatCurrency(client.budget)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                {client.wedding_id ? (
                                    <button
                                        onClick={() => router.push(`/dashboard?weddingId=${client.wedding_id}`)}
                                        className="text-primary text-sm font-medium flex items-center gap-2 hover:underline"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        Open Workspace
                                    </button>
                                ) : (
                                    <button
                                        disabled={!!creatingWeddingFor}
                                        onClick={() => handleCreateWedding(client)}
                                        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
                                    >
                                        {creatingWeddingFor === client.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3 h-3" />
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
    );
}
