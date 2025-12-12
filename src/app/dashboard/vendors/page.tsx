"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter } from "lucide-react";
import { Vendor } from "@/types/vendors";
import VendorCard from "@/components/dashboard/vendors/VendorCard";
import VendorForm from "@/components/dashboard/vendors/VendorForm";

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | undefined>(undefined);
    const [filterCategory, setFilterCategory] = useState<string>("All");

    useEffect(() => {
        const storedWeddingId = localStorage.getItem("current_wedding_id");
        if (storedWeddingId) {
            setWeddingId(storedWeddingId);
            fetchVendors(storedWeddingId);
        }
    }, []);

    const fetchVendors = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('wedding_id', id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setVendors(data as Vendor[]);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('vendors').delete().eq('id', id);
        if (!error) {
            setVendors(prev => prev.filter(v => v.id !== id));
        } else {
            alert("Failed to delete vendor");
        }
    };

    const categories = ["All", ...Array.from(new Set(vendors.map(v => v.category)))];
    const filteredVendors = filterCategory === "All"
        ? vendors
        : vendors.filter(v => v.category === filterCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Vendors</h2>
                    <p className="mt-1 text-muted-foreground">Manage your wedding team.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingVendor(undefined);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Vendor
                </button>
            </div>

            {/* Filters */}
            {vendors.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <Filter className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === cat
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading vendors...</p>
                </div>
            ) : vendors.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No vendors yet</h3>
                    <p className="text-gray-500 mb-6">Start building your dream team by adding vendors.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                    >
                        Add Your First Vendor
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map(vendor => (
                        <VendorCard
                            key={vendor.id}
                            vendor={vendor}
                            onEdit={(v) => {
                                setEditingVendor(v);
                                setShowForm(true);
                            }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {showForm && weddingId && (
                <VendorForm
                    weddingId={weddingId}
                    initialData={editingVendor}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => fetchVendors(weddingId)}
                />
            )}
        </div>
    );
}
