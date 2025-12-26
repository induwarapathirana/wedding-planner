import { Vendor } from "@/types/vendors";
import { VendorStatus } from "@/types/vendors";
import VendorTableRow from "./VendorTableRow";

interface VendorTableProps {
    vendors: Vendor[];
    onEdit: (vendor: Vendor) => void;
    onDelete: (id: string) => void;
    onStatusUpdate: (id: string, status: VendorStatus) => void;
    currencySymbol?: string;
}

export default function VendorTable({ vendors, onEdit, onDelete, onStatusUpdate, currencySymbol = '$' }: VendorTableProps) {
    if (vendors.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500">No vendors found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Contact
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.map(vendor => (
                            <VendorTableRow
                                key={vendor.id}
                                vendor={vendor}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onStatusUpdate={onStatusUpdate}
                                currencySymbol={currencySymbol}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
