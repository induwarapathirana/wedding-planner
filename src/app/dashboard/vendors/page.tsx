"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter, Trash2, CheckSquare, Square, BookUser, Globe, Phone, Mail, Edit2, LayoutGrid, List } from "lucide-react";
import { Vendor } from "@/types/vendors";
import { DirectoryVendor, NewDirectoryVendor } from "@/types/directory";
import VendorCard from "@/components/dashboard/vendors/VendorCard";
import VendorTable from "@/components/dashboard/vendors/VendorTable";
import VendorForm from "@/components/dashboard/vendors/VendorForm";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { CURRENCIES } from "@/lib/constants";

import { LimitModal } from "@/components/dashboard/limit-modal";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { TourGuide } from "@/components/dashboard/TourGuide";
import { VENDOR_STEPS } from "@/lib/tours";

export default function VendorsPage() {
    // ... (existing code) ...

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Vendors</h2>
                    <p className="mt-1 text-muted-foreground">Manage your wedding team.</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <TourGuide steps={VENDOR_STEPS} pageKey="vendors" />
                    {activeTab === 'wedding' ? (
                        <>
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
                                id="tour-add-vendor"
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
                        </>
                    ) : (
                        <button
                            onClick={openDirectoryCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add to Directory
                        </button>
                    )}
                </div>

                {/* View Toggle - Only show on wedding tab and desktop */}
                {activeTab === 'wedding' && (
                    <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'card'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Cards
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'table'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            Table
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav id="tour-vendor-tabs" className="-mb-px flex gap-6">
                    <button
                        onClick={() => setActiveTab('wedding')}
                        className={`
                            py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'wedding'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Current Wedding
                    </button>
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`
                            py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'directory'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        My Directory (Master List)
                    </button>
                </nav>
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
                {activeTab === 'wedding' && vendors.length > 0 && (
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary whitespace-nowrap ml-auto">
                        {selectedIds.size > 0 && selectedIds.size === vendors.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        {selectedIds.size === vendors.length ? "Deselect All" : "Select All"}
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div id="tour-vendor-list">
                {activeTab === 'wedding' ? (
                    // WEDDING VENDORS LIST
                    <>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-gray-500">Loading vendors...</p>
                            </div>
                        ) : (filteredVendors as Vendor[]).length === 0 ? (
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
                            viewMode === 'card' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(filteredVendors as Vendor[]).map((vendor) => (
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
                                            currencySymbol={getCurrencySymbol(currency)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="hidden md:block">
                                    <VendorTable
                                        vendors={filteredVendors as Vendor[]}
                                        onEdit={(v) => {
                                            setEditingVendor(v);
                                            setShowForm(true);
                                        }}
                                        onDelete={confirmDelete}
                                        onStatusUpdate={handleStatusUpdate}
                                        currencySymbol={getCurrencySymbol(currency)}
                                    />
                                </div>
                            )
                        )}
                    </>
                ) : (
                    // DIRECTORY LIST
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(filteredVendors as DirectoryVendor[]).length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                <BookUser className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-1">Directory is empty</h3>
                                <p className="text-gray-500">Your master list of vendors will appear here.</p>
                            </div>
                        ) : (
                            (filteredVendors as DirectoryVendor[]).map((vendor) => (
                                <div
                                    key={vendor.id}
                                    onClick={() => openDirectoryEdit(vendor)}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group relative cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md mb-2">
                                                {vendor.category}
                                            </span>
                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">{vendor.company_name}</h3>
                                            {vendor.contact_name && <p className="text-sm text-gray-500">{vendor.contact_name}</p>}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); openDirectoryEdit(vendor); }} className="p-1 text-gray-400 hover:text-primary">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); confirmDirectoryDelete(vendor.id); }} className="p-1 text-gray-400 hover:text-red-500">
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
                                                <a
                                                    href={vendor.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline truncate max-w-[200px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {vendor.website.replace(/^https?:\/\//, '')}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Wedding Vendor Form */}
                {showForm && weddingId && (
                    <VendorForm
                        weddingId={weddingId}
                        initialData={editingVendor}
                        onClose={() => setShowForm(false)}
                        onSuccess={() => fetchVendors(weddingId)}
                    />
                )}

                {/* Directory Form */}
                {showDirectoryForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
                            <h3 className="text-xl font-bold mb-4">{editingDirectoryVendor ? 'Edit Directory Contact' : 'Add to Directory'}</h3>
                            <form onSubmit={handleDirectorySubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Company Name</label>
                                    <input
                                        required
                                        className="w-full p-2 border rounded-lg"
                                        value={dirFormData.company_name}
                                        onChange={e => setDirFormData({ ...dirFormData, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Category</label>
                                        <select
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.category}
                                            onChange={e => setDirFormData({ ...dirFormData, category: e.target.value })}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact Name</label>
                                        <input
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.contact_name || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, contact_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.email || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.phone || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Website</label>
                                    <input
                                        className="w-full p-2 border rounded-lg"
                                        value={dirFormData.website || ''}
                                        onChange={e => setDirFormData({ ...dirFormData, website: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pricing Type</label>
                                        <select
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.pricing_type || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, pricing_type: e.target.value as any })}
                                        >
                                            <option value="">Not specified</option>
                                            <option value="flat_rate">Flat Rate</option>
                                            <option value="per_person">Per Person</option>
                                            <option value="hourly">Hourly</option>
                                            <option value="per_item">Per Item</option>
                                            <option value="package">Package Deal</option>
                                            <option value="tbd">To Be Determined</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Price Estimate</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.price_estimate || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, price_estimate: parseFloat(e.target.value) })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {dirFormData.pricing_type && dirFormData.pricing_type !== 'tbd' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Custom Unit (Optional)</label>
                                        <input
                                            className="w-full p-2 border rounded-lg"
                                            value={dirFormData.pricing_unit || ''}
                                            onChange={e => setDirFormData({ ...dirFormData, pricing_unit: e.target.value })}
                                            placeholder="e.g., per guest, per hour, per arrangement"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave blank to use the default pricing type label</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowDirectoryForm(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                    >
                                        Save to Directory
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showImportModal && weddingId && (
                    <DirectoryImportModal
                        isOpen={showImportModal}
                        onClose={() => setShowImportModal(false)}
                        weddingId={weddingId}
                        onImportSuccess={() => fetchVendors(weddingId)}
                    />
                )}

                <ConfirmDialog
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                    onConfirm={executeDelete}
                    title={confirmState.type === 'directory_single' ? "Remove from Directory?" : "Delete Vendor?"}
                    description={confirmState.type === 'directory_single'
                        ? "This will remove the vendor from your master list. It will NOT remove them from existing weddings."
                        : confirmState.type === 'bulk'
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
