import { Vendor } from "@/types/vendors";
import { Pencil, Trash2 } from "lucide-react";
import { VendorStatus } from "@/types/vendors";

interface VendorTableRowProps {
    vendor: Vendor;
    onEdit: (vendor: Vendor) => void;
    onDelete: (id: string) => void;
    onStatusUpdate: (id: string, status: VendorStatus) => void;
    currencySymbol?: string;
}

const statusColors: Record<VendorStatus, string> = {
    researching: "bg-gray-100 text-gray-700",
    contacted: "bg-blue-100 text-blue-700",
    hired: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
};

const getPricingDisplay = (vendor: Vendor, currencySymbol: string) => {
    if (!vendor.price_estimate) return "-";

    let display = `${currencySymbol}${vendor.price_estimate.toLocaleString()}`;

    if (vendor.pricing_type && vendor.pricing_type !== 'tbd') {
        const labels: Record<string, string> = {
            'flat_rate': '',
            'per_person': '/person',
            'hourly': '/hr',
            'per_item': '/item',
            'package': ' (pkg)',
        };
        const suffix = vendor.pricing_unit || labels[vendor.pricing_type] || '';
        display += suffix;
    }

    return display;
};

export default function VendorTableRow({ vendor, onEdit, onDelete, onStatusUpdate, currencySymbol = '$' }: VendorTableRowProps) {
    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
            <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{vendor.company_name}</div>
                {vendor.contact_name && (
                    <div className="text-xs text-gray-500 mt-0.5">{vendor.contact_name}</div>
                )}
            </td>
            <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-xs font-medium text-gray-700">
                    {vendor.category}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
                {vendor.email && <div className="truncate max-w-[200px]">{vendor.email}</div>}
                {vendor.phone && <div className="text-xs text-gray-500">{vendor.phone}</div>}
                {!vendor.email && !vendor.phone && <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3">
                <select
                    value={vendor.status}
                    onChange={(e) => onStatusUpdate(vendor.id, e.target.value as VendorStatus)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide cursor-pointer border-0 focus:ring-2 focus:ring-primary/20 transition-all ${statusColors[vendor.status]}`}
                >
                    <option value="researching">Researching</option>
                    <option value="contacted">Contacted</option>
                    <option value="hired">Hired</option>
                    <option value="declined">Declined</option>
                </select>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {getPricingDisplay(vendor, currencySymbol)}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(vendor)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label="Edit vendor"
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
                        aria-label="Delete vendor"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
