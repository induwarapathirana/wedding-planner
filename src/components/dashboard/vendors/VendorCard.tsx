"use client";

import { Vendor, VendorStatus } from "@/types/vendors";
import { Phone, Mail, Globe, MapPin, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";

interface VendorCardProps {
    vendor: Vendor;
    onEdit: (vendor: Vendor) => void;
    onDelete: (id: string) => void;
}

const statusColors: Record<VendorStatus, string> = {
    researching: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    hired: "bg-green-100 text-green-700",
    declined: "bg-gray-100 text-gray-700",
};

export default function VendorCard({ vendor, onEdit, onDelete }: VendorCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {vendor.category}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-gray-900 mt-1">
                        {vendor.company_name}
                    </h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[vendor.status]}`}>
                    {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </span>
            </div>

            {vendor.contact_name && (
                <p className="text-sm text-gray-600 mb-4">{vendor.contact_name}</p>
            )}

            <div className="space-y-2 text-sm text-gray-500">
                {vendor.phone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${vendor.phone}`} className="hover:text-primary transition-colors">
                            {vendor.phone}
                        </a>
                    </div>
                )}
                {vendor.email && (
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${vendor.email}`} className="hover:text-primary transition-colors truncate max-w-[200px]">
                            {vendor.email}
                        </a>
                    </div>
                )}
                {vendor.website && (
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1 group/link">
                            Website <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                    </div>
                )}
                {vendor.price_estimate && (
                    <div className="pt-2 mt-2 border-t border-gray-50 text-gray-900 font-medium">
                        Est: ${vendor.price_estimate.toLocaleString()}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                    onClick={() => onEdit(vendor)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => {
                        if (confirm("Are you sure you want to delete this vendor?")) {
                            onDelete(vendor.id);
                        }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
