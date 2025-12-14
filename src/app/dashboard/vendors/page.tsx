// ... imports
import { Plus, Search, Filter, Trash2, CheckSquare, Square } from "lucide-react";
// ...

export default function VendorsPage() {
    // ... existing state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ... useEffect ... fetchVendors ...

    // Selection Logic
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

    // ... handleDelete (single) ...

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} vendors?`)) return;

        const ids = Array.from(selectedIds);
        const { error } = await supabase.from('vendors').delete().in('id', ids);

        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            if (weddingId) fetchVendors(weddingId);
            setSelectedIds(new Set());
        }
    };

    // ... 

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    {/* Title */}
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (!checkLimit(tier, 'vendors', vendors.length)) {
                                setShowLimitModal(true);
                                return;
                            }
                            setEditingVendor(undefined);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
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
                // ... loading ...
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading vendors...</p>
                </div>
            ) : vendors.length === 0 ? (
                // ... empty ...
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
                            isSelected={selectedIds.has(vendor.id)}
                            onToggleSelect={toggleSelect}
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
