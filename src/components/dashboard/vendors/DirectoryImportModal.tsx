"use strict";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Check } from "lucide-react";
import { DirectoryVendor } from "@/types/directory";
import { VendorStatus } from "@/types/vendors";

interface DirectoryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    weddingId: string;
    onImportSuccess: () => void;
}

export function DirectoryImportModal({ isOpen, onClose, weddingId, onImportSuccess }: DirectoryImportModalProps) {
    const [vendors, setVendors] = useState<DirectoryVendor[]>([]);
    const [existingVendorNames, setExistingVendorNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDirectory();
            fetchExistingVendors();
            setSelectedIds(new Set());
            setSearchTerm("");
        }
    }, [isOpen]);

    const fetchExistingVendors = async () => {
        const { data } = await supabase
            .from('vendors')
            .select('company_name')
            .eq('wedding_id', weddingId);
        
        if (data) {
            setExistingVendorNames(new Set(data.map(v => v.company_name.toLowerCase())));
        }
    };

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

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);

        const selectedVendors = vendors.filter(v => selectedIds.has(v.id));
        const toInsert = selectedVendors.map(v => ({
            wedding_id: weddingId,
            category: v.category,
            company_name: v.company_name,
            contact_name: v.contact_name,
            email: v.email,
            phone: v.phone,
            website: v.website,
            price_estimate: v.price_estimate,
            notes: v.notes,
            status: 'researching' as VendorStatus
        }));

        const { error } = await supabase.from('vendors').insert(toInsert);

        if (error) {
            alert("Error importing vendors: " + error.message);
        } else {
            onImportSuccess();
            onClose();
        }
        setImporting(false);
    };

    if (!isOpen) return null;

    const filteredVendors = vendors.filter(v =>
        v.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Import from Directory</h3>
                        <p className="text-sm text-gray-500">Select vendors to add to this wedding.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <span className="sr-only">Close</span>
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading directory...</div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No vendors found in your directory.</p>
                            <a href="/dashboard/directory" className="text-primary hover:underline text-sm font-medium mt-2 inline-block">
                                Go to Directory to add vendors
                            </a>
                        </div>
                    ) : (
                        filteredVendors.map(vendor => {
                            const isAdded = existingVendorNames.has(vendor.company_name.toLowerCase());
                            return (
                                <div
                                    key={vendor.id}
                                    onClick={() => !isAdded && toggleSelect(vendor.id)}
                                    className={`
                                        flex items-center p-4 rounded-xl border transition-all
                                        ${isAdded 
                                            ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                            : selectedIds.has(vendor.id)
                                                ? 'border-primary bg-primary/5 shadow-sm cursor-pointer'
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-colors shrink-0
                                        ${isAdded 
                                            ? 'bg-gray-100 border-gray-200' 
                                            : selectedIds.has(vendor.id) ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'
                                        }
                                    `}>
                                        {isAdded ? <Check className="w-3.5 h-3.5 text-gray-400" /> : selectedIds.has(vendor.id) && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-gray-900">{vendor.company_name}</h4>
                                            {isAdded && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                                    Added
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{vendor.category}</span>
                                            {vendor.contact_name}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {selectedIds.size} vendor{selectedIds.size !== 1 && 's'} selected
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0 || importing}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {importing ? "Importing..." : "Import Selected"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
