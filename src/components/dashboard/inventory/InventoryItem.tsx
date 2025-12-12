"use client";

import { InventoryItem, ItemStatus } from "@/types/inventory";
import { Link2, Pencil, Trash2, CheckCircle2 } from "lucide-react";

interface InventoryItemProps {
    item: InventoryItem;
    onEdit: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (item: InventoryItem) => void;
}

const statusBadges: Record<ItemStatus, { label: string; className: string }> = {
    needed: { label: 'Needed', className: 'bg-red-100 text-red-700' },
    purchased: { label: 'Purchased', className: 'bg-blue-100 text-blue-700' },
    rented: { label: 'Rented', className: 'bg-orange-100 text-orange-700' },
    borrowed: { label: 'Borrowed', className: 'bg-purple-100 text-purple-700' },
    packed: { label: 'Packed', className: 'bg-green-100 text-green-700' },
};

export default function InventoryItemRow({ item, onEdit, onDelete, onToggleStatus }: InventoryItemProps) {
    const totalCost = (item.quantity * item.unit_cost);
    const badge = statusBadges[item.status];

    return (
        <tr className="hover:bg-gray-50/80 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onToggleStatus(item)}
                        className={`p-1 rounded-full transition-colors ${item.status === 'packed'
                                ? 'text-green-600 bg-green-50'
                                : 'text-gray-300 hover:text-gray-400'
                            }`}
                        title="Mark as Packed"
                    >
                        <CheckCircle2 className={`w-5 h-5 ${item.status === 'packed' ? 'fill-current' : ''}`} />
                    </button>
                    <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 md:hidden">{item.category}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.category}
                </span>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                    {badge.label}
                </span>
            </td>
            <td className="px-6 py-4 text-center text-gray-600 font-mono text-sm">
                {item.quantity}
            </td>
            <td className="px-6 py-4 text-right text-sm">
                <div className="font-medium text-gray-900">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {item.quantity > 1 && (
                    <div className="text-xs text-gray-500">${item.unit_cost}/ea</div>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.link && (
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Link"
                        >
                            <Link2 className="w-4 h-4" />
                        </a>
                    )}
                    <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm("Delete this item?")) onDelete(item.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
