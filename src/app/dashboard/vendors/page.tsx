"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter, Trash2, CheckSquare, Square, BookUser } from "lucide-react";
import { Vendor } from "@/types/vendors";
import VendorCard from "@/components/dashboard/vendors/VendorCard";
import VendorForm from "@/components/dashboard/vendors/VendorForm";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { CURRENCIES } from "@/lib/constants"; // Added import

import { LimitModal } from "@/components/dashboard/limit-modal";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DirectoryImportModal } from "@/components/dashboard/vendors/DirectoryImportModal";

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | undefined>(undefined);
    const [filterCategory, setFilterCategory] = useState<string>("All");
    const [tier, setTier] = useState<PlanTier>('free');
    const [currency, setCurrency] = useState("USD"); // Added currency state
    const [showLimitModal, setShowLimitModal] = useState(false);
    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({ isOpen: false, type: 'single' });

    useEffect(() => {
        const storedWeddingId = localStorage.getItem("current_wedding_id");
        if (storedWeddingId) {
            setWeddingId(storedWeddingId);
            fetchVendors(storedWeddingId);
            // Fetch Tier & Currency
            supabase.from('weddings').select('tier, currency').eq('id', storedWeddingId).single()
                .then(({ data }) => {
                    if (data) {
                        setTier((data.tier as PlanTier) || 'free');
                        if (data.currency) setCurrency(data.currency);
                    }
                });
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

    // Delete Logic
    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, type: 'single', id });
    };

    const confirmBulkDelete = () => {
        setConfirmState({ isOpen: true, type: 'bulk' });
    };

    const executeDelete = async () => {
        if (confirmState.type === 'single' && confirmState.id) {
            const { error } = await supabase.from('vendors').delete().eq('id', confirmState.id);
            if (!error) {
                setVendors(prev => prev.filter(v => v.id !== confirmState.id));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(confirmState.id!);
                    return next;
                });
            } else {
                alert("Failed to delete vendor");
            }
        } else if (confirmState.type === 'bulk') {
            const ids = Array.from(selectedIds);
            const { error } = await supabase.from('vendors').delete().in('id', ids);

            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                if (weddingId) fetchVendors(weddingId);
                setSelectedIds(new Set());
            }
        }
        setConfirmState({ ...confirmState, isOpen: false });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === vendors.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(vendors.map(v => v.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Derived State
    const categories = ["All", ...Array.from(new Set(vendors.map(v => v.category)))];
    const filteredVendors = filterCategory === "All"
        ? vendors
        : vendors.filter(v => v.category === filterCategory);

    const getCurrencySymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || '$';
    };
    const symbol = getCurrencySymbol(currency);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Vendors</h2>
                    <p className="mt-1 text-muted-foreground">Manage your wedding team.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-all mr-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                    >
                        <BookUser className="w-4 h-4" />
                        Import from Directory
                    </button>
                    <button
                        onClick={() => {
                            if (!checkLimit(tier, 'vendors', vendors.length)) {
                                setShowLimitModal(true);
                                return;
                            }
                            setEditingVendor(undefined);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Vendor
                    </button>
                </div>
            </div>

            {/* Filters */}
            {vendors.length > 0 && (
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
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
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary whitespace-nowrap">
                        {selectedIds.size > 0 && selectedIds.size === vendors.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        {selectedIds.size === vendors.length ? "Deselect All" : "Select All"}
                    </button>
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
                            onDelete={confirmDelete}
                            isSelected={selectedIds.has(vendor.id)}
                            onToggleSelect={toggleSelect}
                            currencySymbol={symbol}
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
            {
                showImportModal && weddingId && (
                    <DirectoryImportModal
                        isOpen={showImportModal}
                        onClose={() => setShowImportModal(false)}
                        weddingId={weddingId}
                        onImportSuccess={() => fetchVendors(weddingId)}
                    />
                )
            }
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                onConfirm={executeDelete}
                title={confirmState.type === 'bulk' ? "Delete Vendors?" : "Delete Vendor?"}
                description={confirmState.type === 'bulk'
                    ? `Are you sure you want to delete ${selectedIds.size} vendors? This action cannot be undone.`
                    : "Are you sure you want to delete this vendor? This action cannot be undone."}
                variant="danger"
            />

            <LimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                feature="Vendors"
                limit={PLAN_LIMITS.free.vendors}
                tier={tier}
            />
        </div>
    );
}
