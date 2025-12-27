"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Package, Search, Pencil, Trash2 } from "lucide-react";
import { InventoryItem, ItemStatus } from "@/types/inventory";
import InventoryItemRow from "@/components/dashboard/inventory/InventoryItem";
import InventoryForm from "@/components/dashboard/inventory/InventoryForm";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CURRENCIES } from "@/lib/constants";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { getEffectiveTier } from "@/lib/trial";
import { LimitModal } from "@/components/dashboard/limit-modal";
import { TourGuide } from "@/components/dashboard/TourGuide";
import { TierGate } from "@/components/dashboard/TierGate";
import { INVENTORY_STEPS } from "@/lib/tours";

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false });
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [currency, setCurrency] = useState('USD');
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const wId = localStorage.getItem("current_wedding_id");
        if (wId) {
            setWeddingId(wId);
            // Fetch currency
            const { data: wedding } = await supabase
                .from('weddings')
                .select('currency')
                .eq('id', wId)
                .single();

            if (wedding) {
                setCurrency(wedding.currency || 'USD');
            }
            // Get effective tier (validates trial & payment)
            const trialInfo = await getEffectiveTier(wId);
            setTier(trialInfo.effectiveTier);
            fetchItems(wId);
        }
        setLoading(false);
    };

    const fetchItems = async (wId: string) => {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('wedding_id', wId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setItems(data as InventoryItem[]);
        }
    };

    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, id });
    };

    const executeDelete = async () => {
        if (!confirmState.id) return;
        const { error } = await supabase.from('inventory_items').delete().eq('id', confirmState.id);
        if (!error && weddingId) {
            fetchItems(weddingId);
        }
        setConfirmState({ isOpen: false });
    };

    const openEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleToggleStatus = async (item: InventoryItem) => {
        const statuses: ItemStatus[] = ['needed', 'purchased', 'rented', 'borrowed', 'packed'];
        const currentIndex = statuses.indexOf(item.status);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        const { error } = await supabase
            .from('inventory_items')
            .update({ status: nextStatus })
            .eq('id', item.id);

        if (!error && weddingId) {
            fetchItems(weddingId);
        }
    };

    const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalCost = items.reduce((sum, item) => sum + (item.unit_cost || 0) * (item.quantity || 1), 0);
    const packedCount = items.filter(i => i.status === 'packed').length;

    return (
        <TierGate weddingId={weddingId} featureName="Inventory">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-foreground">Inventory</h2>
                        <p className="mt-1 text-muted-foreground">Track your decor, items, and supplies.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <TourGuide steps={INVENTORY_STEPS} pageKey="inventory" />
                        <button
                            id="tour-add-inventory"
                            onClick={() => {
                                if (!checkLimit(tier, 'inventory_items', items.length)) {
                                    setShowLimitModal(true);
                                    return;
                                }
                                setEditingItem(undefined);
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div id="tour-inventory-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Total Items</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Estimated Cost</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {symbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Packed / Ready</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {packedCount} <span className="text-sm text-gray-400 font-normal">/ {items.length} unique</span>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading inventory...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Inventory is empty</h3>
                        <p className="text-gray-500 mb-6">Start tracking your wedding items.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                        >
                            Add First Item
                        </button>
                    </div>
                ) : (
                    <div id="tour-inventory-list" className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 w-1/3">Item</th>
                                        <th className="px-6 py-3 hidden md:table-cell">Category</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-center">Qty</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                        <th className="px-6 py-3 text-right w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.map((item) => (
                                        <InventoryItemRow
                                            key={item.id}
                                            item={item}
                                            onEdit={openEdit}
                                            onDelete={confirmDelete}
                                            onToggleStatus={handleToggleStatus}
                                            currencySymbol={symbol}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => openEdit(item)}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                            {item.category && (
                                                <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status === 'packed' ? 'bg-green-100 text-green-700' :
                                            item.status === 'purchased' ? 'bg-blue-100 text-blue-700' :
                                                item.status === 'rented' ? 'bg-orange-100 text-orange-700' :
                                                    item.status === 'borrowed' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                                            {item.status || 'pending'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Qty: {item.quantity || 1}</span>
                                        <span className="font-semibold text-gray-900">
                                            {symbol}{((item.unit_cost || 0) * (item.quantity || 1)).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEdit(item);
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary bg-gray-50 rounded-lg"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete(item.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No items match your search.
                            </div>
                        )}
                    </div>
                )}

                {showForm && weddingId && (
                    <InventoryForm
                        weddingId={weddingId}
                        initialData={editingItem}
                        onClose={() => setShowForm(false)}
                        onSuccess={() => fetchItems(weddingId)}
                    />
                )}

                <ConfirmDialog
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState({ isOpen: false })}
                    onConfirm={executeDelete}
                    title="Delete Item?"
                    description="Are you sure you want to delete this item? This action cannot be undone."
                    variant="danger"
                />

                <LimitModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    feature="Inventory Items"
                    limit={PLAN_LIMITS.free.inventory_items}
                    tier={tier}
                />
            </div>
        </TierGate>
    );
}
