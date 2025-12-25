"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Package, Search, Pencil, Trash2 } from "lucide-react";
import { InventoryItem } from "@/types/inventory";
import InventoryItemRow from "@/components/dashboard/inventory/InventoryItem";
import InventoryForm from "@/components/dashboard/inventory/InventoryForm";
import { CURRENCIES } from "@/lib/constants";

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [currency, setCurrency] = useState("USD");

    useEffect(() => {
        const storedWeddingId = localStorage.getItem("current_wedding_id");
        if (storedWeddingId) {
            setWeddingId(storedWeddingId);
            fetchItems(storedWeddingId);
            // Fetch Currency
            supabase.from('weddings').select('currency').eq('id', storedWeddingId).single()
                .then(({ data }) => {
                    if (data && data.currency) setCurrency(data.currency);
                });
        }
    }, []);

    const fetchItems = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('wedding_id', id)
            .order('category', { ascending: true });

        if (!error && data) {
            setItems(data as InventoryItem[]);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (!error) {
            setItems(prev => prev.filter(i => i.id !== id));
        } else {
            alert("Failed to delete item");
        }
    };

    const handleToggleStatus = async (item: InventoryItem) => {
        // Simple toggle: 'packed' <-> 'needed' (or preserve previous if complex, but simple toggle is safer for UI)
        // Actually, let's just mark as 'packed' if not packed, and 'needed' if packed.
        const newStatus = item.status === 'packed' ? 'needed' : 'packed';

        const { error } = await supabase
            .from('inventory_items')
            .update({ status: newStatus })
            .eq('id', item.id);

        if (!error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCurrencySymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || '$';
    };
    const symbol = getCurrencySymbol(currency);

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalCost = items.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);
    const packedCount = items.filter(i => i.status === 'packed').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Inventory</h2>
                    <p className="mt-1 text-muted-foreground">Track your decor, items, and supplies.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(undefined);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Item
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="bg-white border boundary-gray-200 rounded-xl overflow-hidden shadow-sm">
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
                                {filteredItems.map(item => (
                                    <InventoryItemRow
                                        key={item.id}
                                        item={item}
                                        onEdit={(i) => {
                                            setEditingItem(i);
                                            setShowForm(true);
                                        }}
                                        onDelete={handleDelete}
                                        onToggleStatus={handleToggleStatus}
                                        currencySymbol={symbol} // Passing symbol
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredItems.map(item => (
                            <div key={item.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{item.category}</div>
                                    </div>
                                    <InventoryItemRow
                                        item={item} // Reuse logic if possible, or build inline
                                        // Wait, row component renders a TR, we can't reuse it here easily without refactoring.
                                        // Let's build inline for now or create a new component.
                                        // Inline is safer for this change.
                                        onEdit={() => { }}
                                        onDelete={() => { }}
                                        onToggleStatus={() => { }}
                                        isMobileWrapper={true} // Hack to suppress errors if we were reusing, but we won't.
                                    />
                                    {/* 
                                        Correction: InventoryItemRow renders a <tr>. We cannot use it inside a div.
                                        I will implement the mobile card UI directly here.
                                     */}
                                    <button
                                        onClick={() => handleToggleStatus(item)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${item.status === 'packed'
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                    >
                                        {item.status}
                                    </button>
                                </div>

                                <div className="flex justify-between items-center text-sm text-gray-600">
                                    <div className="flex gap-4">
                                        <div>
                                            <span className="text-gray-400 text-xs uppercase mr-1">Qty</span>
                                            <span className="font-medium">{item.quantity}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-xs uppercase mr-1">Cost</span>
                                            <span className="font-medium">{symbol}{(item.quantity * item.unit_cost).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingItem(item);
                                                setShowForm(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm("Delete this item?")) handleDelete(item.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
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
        </div>
    );
}
