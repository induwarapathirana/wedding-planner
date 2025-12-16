"use strict";
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter, Trash2, Edit2, Phone, Mail, Globe, BookUser } from "lucide-react";
import { DirectoryVendor, NewDirectoryVendor } from "@/types/directory";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

export default function DirectoryPage() {
    const [vendors, setVendors] = useState<DirectoryVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>("All");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<DirectoryVendor | undefined>(undefined);

    // Form State
    const [formData, setFormData] = useState<NewDirectoryVendor>({
        company_name: "",
        category: "Venue",
        contact_name: "",
        email: "",
        phone: "",
        website: "",
        notes: "",
        price_estimate: 0
    });

    // Confirm State
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false });

    const CATEGORIES = [
        "Venue", "Catering", "Photography", "Videography", "Music/DJ",
        "Florist", "Decor", "Attire", "Makeup/Hair", "Transport",
        "Cake", "Officiant", "Planner", "Stationery", "Other"
    ];

    useEffect(() => {
        fetchDirectory();
    }, []);

    const fetchDirectory = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('vendor_directory')
            .select('*')
            .eq('user_id', user.id)
            .order('company_name', { ascending: true });

        if (!error && data) {
            setVendors(data as DirectoryVendor[]);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingVendor) {
            const { error } = await supabase
                .from('vendor_directory')
                .update(formData)
                .eq('id', editingVendor.id);

            if (!error) {
                fetchDirectory();
                setShowForm(false);
                setEditingVendor(undefined);
            } else {
                alert(error.message);
            }
        } else {
            const { error } = await supabase
                .from('vendor_directory')
                .insert([{ ...formData, user_id: user.id }]);

            if (!error) {
                fetchDirectory();
                setShowForm(false);
            } else {
                alert(error.message);
            }
        }
    };

    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, id });
    };

    const executeDelete = async () => {
        if (confirmState.id) {
            await supabase.from('vendor_directory').delete().eq('id', confirmState.id);
            setVendors(prev => prev.filter(v => v.id !== confirmState.id));
            setConfirmState({ isOpen: false });
        }
    };

    const openEdit = (vendor: DirectoryVendor) => {
        setEditingVendor(vendor);
        setFormData({
            company_name: vendor.company_name,
            category: vendor.category,
            contact_name: vendor.contact_name,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            notes: vendor.notes,
            price_estimate: vendor.price_estimate
        });
        setShowForm(true);
    };

    const openCreate = () => {
        setEditingVendor(undefined);
        setFormData({
            company_name: "",
            category: "Venue",
            contact_name: "",
            email: "",
            phone: "",
            website: "",
            notes: "",
            price_estimate: 0
        });
        setShowForm(true);
    };

    const filteredVendors = vendors.filter(v => {
        const matchesCategory = filterCategory === "All" || v.category === filterCategory;
        const matchesSearch = v.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
                        <BookUser className="w-8 h-8 text-primary" />
                        Vendor Directory
                    </h2>
                    <p className="mt-1 text-muted-foreground">Your master list of wedding professionals.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add to Directory
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search your directory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading directory...</div>
            ) : filteredVendors.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <BookUser className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Directory is empty</h3>
                    <p className="text-gray-500 mb-6">Start building your contact list.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md mb-2">
                                        {vendor.category}
                                    </span>
                                    <h3 className="font-bold text-gray-900 text-lg">{vendor.company_name}</h3>
                                    {vendor.contact_name && <p className="text-sm text-gray-500">{vendor.contact_name}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(vendor)} className="p-1 text-gray-400 hover:text-primary">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => confirmDelete(vendor.id)} className="p-1 text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mt-4">
                                {vendor.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {vendor.phone}
                                    </div>
                                )}
                                {vendor.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        {vendor.email}
                                    </div>
                                )}
                                {vendor.website && (
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                                            {vendor.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4">{editingVendor ? 'Edit Contact' : 'Add to Directory'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Company Name</label>
                                <input
                                    required
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Contact Name</label>
                                    <input
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.contact_name || ''}
                                        onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone</label>
                                    <input
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Website</label>
                                <input
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.website || ''}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    Save Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false })}
                onConfirm={executeDelete}
                title="Remove from Directory?"
                description="This will remove the vendor from your master list. It will NOT remove them from existing weddings."
                variant="danger"
            />
        </div>
    );
}
