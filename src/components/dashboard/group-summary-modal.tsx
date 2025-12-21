"use client";

import { useState } from "react";
import { X, Users, LayoutGrid, Armchair } from "lucide-react";
import { cn } from "@/lib/utils";

type Guest = {
    id: string;
    name: string;
    group_category: string;
    priority: "A" | "B" | "C";
    rsvp_status: "accepted" | "declined" | "pending";
    meal_preference?: string;
    table_assignment?: string;
    plus_one: boolean;
    companion_guest_count?: number;
    companion_names?: string[];
};

interface GroupSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    guests: Guest[];
}

type ViewMode = "group" | "table";

export function GroupSummaryModal({ isOpen, onClose, guests }: GroupSummaryModalProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("group");

    if (!isOpen) return null;

    // Aggregation Logic for Groups
    const groups = guests.reduce((acc, guest) => {
        const groupName = guest.group_category || "Uncategorized";
        if (!acc[groupName]) {
            acc[groupName] = { name: groupName, total: 0, confirmed: 0, pending: 0, declined: 0 };
        }

        const headcount = 1 + (guest.companion_guest_count || 0);
        acc[groupName].total += headcount;

        if (guest.rsvp_status === 'accepted') acc[groupName].confirmed += headcount;
        else if (guest.rsvp_status === 'pending') acc[groupName].pending += headcount;
        else if (guest.rsvp_status === 'declined') acc[groupName].declined += headcount;

        return acc;
    }, {} as Record<string, { name: string; total: number; confirmed: number; pending: number; declined: number }>);

    const groupList = Object.values(groups).sort((a, b) => b.total - a.total);

    // Aggregation Logic for Tables
    const tables = guests.reduce((acc, guest) => {
        const tableName = guest.table_assignment?.trim() || "Unassigned";
        if (!acc[tableName]) {
            acc[tableName] = { name: tableName, total: 0, confirmed: 0, pending: 0, declined: 0, guests: [] };
        }

        const headcount = 1 + (guest.companion_guest_count || 0);
        acc[tableName].total += headcount;
        acc[tableName].guests.push(guest);

        if (guest.rsvp_status === 'accepted') acc[tableName].confirmed += headcount;
        else if (guest.rsvp_status === 'pending') acc[tableName].pending += headcount;
        else if (guest.rsvp_status === 'declined') acc[tableName].declined += headcount;

        return acc;
    }, {} as Record<string, { name: string; total: number; confirmed: number; pending: number; declined: number; guests: Guest[] }>);

    // Sort tables: assigned tables first (sorted naturally), then unassigned
    const tableList = Object.values(tables).sort((a, b) => {
        if (a.name === "Unassigned") return 1;
        if (b.name === "Unassigned") return -1;
        // Natural sort for table names like "Table 1", "Table 2", "Table 10"
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    const assignedTables = tableList.filter(t => t.name !== "Unassigned");
    const unassignedTable = tableList.find(t => t.name === "Unassigned");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 font-serif">Guest Summary</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {viewMode === "group"
                                ? "View guests organized by group category."
                                : "View guests organized by table assignment."}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 pb-2 flex gap-2">
                    <button
                        onClick={() => setViewMode("group")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewMode === "group"
                                ? "bg-primary text-white shadow-sm"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        By Group
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewMode === "table"
                                ? "bg-primary text-white shadow-sm"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        <Armchair className="w-4 h-4" />
                        By Table
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 max-h-[60vh] overflow-y-auto">
                    {viewMode === "group" ? (
                        /* GROUP VIEW */
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3">Group Name</th>
                                    <th className="px-6 py-3 text-right">Total Guests</th>
                                    <th className="px-6 py-3 text-right text-green-700">Confirmed</th>
                                    <th className="px-6 py-3 text-right text-amber-700">Pending</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {groupList.map((group) => (
                                    <tr key={group.name} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary/40" />
                                            {group.name}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{group.total}</td>
                                        <td className="px-6 py-4 text-right text-green-700 font-medium bg-green-50/50">{group.confirmed}</td>
                                        <td className="px-6 py-4 text-right text-amber-700 font-medium bg-amber-50/50">{group.pending}</td>
                                    </tr>
                                ))}
                                {groupList.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                                            No groups found. Add guests with categories to see them here.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                                <tr>
                                    <td className="px-6 py-3">Total</td>
                                    <td className="px-6 py-3 text-right">{groupList.reduce((sum, g) => sum + g.total, 0)}</td>
                                    <td className="px-6 py-3 text-right text-green-700">{groupList.reduce((sum, g) => sum + g.confirmed, 0)}</td>
                                    <td className="px-6 py-3 text-right text-amber-700">{groupList.reduce((sum, g) => sum + g.pending, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        /* TABLE VIEW */
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3">Table</th>
                                    <th className="px-6 py-3">Guests</th>
                                    <th className="px-6 py-3 text-right">Seats</th>
                                    <th className="px-6 py-3 text-right text-green-700">Confirmed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {assignedTables.map((table) => (
                                    <tr key={table.name} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <Armchair className="w-4 h-4 text-primary/60" />
                                                {table.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex flex-wrap gap-1">
                                                {table.guests.map((g, i) => {
                                                    const displayNames = [g.name, ...(g.companion_names || [])].join(", ");
                                                    const remainingCount = (g.companion_guest_count || 0) - (g.companion_names?.length || 0);
                                                    const countStr = remainingCount > 0 ? ` (+${remainingCount})` : "";

                                                    return (
                                                        <span key={g.id} className="text-xs">
                                                            {displayNames}{countStr}
                                                            {i < table.guests.length - 1 ? ", " : ""}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{table.total}</td>
                                        <td className="px-6 py-4 text-right text-green-700 font-medium bg-green-50/50">{table.confirmed}</td>
                                    </tr>
                                ))}
                                {assignedTables.length === 0 && !unassignedTable && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                                            No tables assigned yet. Edit guests to assign them to tables.
                                        </td>
                                    </tr>
                                )}
                                {/* Unassigned Section */}
                                {unassignedTable && (
                                    <tr className="bg-amber-50/30">
                                        <td className="px-6 py-4 font-medium text-amber-700">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-amber-500" />
                                                Unassigned
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-amber-600/80">
                                            <div className="flex flex-wrap gap-1">
                                                {unassignedTable.guests.slice(0, 5).map((g, i) => {
                                                    const displayNames = [g.name, ...(g.companion_names || [])].join(", ");
                                                    const remainingCount = (g.companion_guest_count || 0) - (g.companion_names?.length || 0);
                                                    const countStr = remainingCount > 0 ? ` (+${remainingCount})` : "";

                                                    return (
                                                        <span key={g.id} className="text-xs">
                                                            {displayNames}{countStr}
                                                            {i < Math.min(unassignedTable.guests.length - 1, 4) ? ", " : ""}
                                                        </span>
                                                    );
                                                })}
                                                {unassignedTable.guests.length > 5 && (
                                                    <span className="text-xs font-medium">+{unassignedTable.guests.length - 5} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-amber-700">{unassignedTable.total}</td>
                                        <td className="px-6 py-4 text-right text-green-700 font-medium">{unassignedTable.confirmed}</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                                <tr>
                                    <td className="px-6 py-3">Total</td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">{tableList.length} tables</td>
                                    <td className="px-6 py-3 text-right">{tableList.reduce((sum, t) => sum + t.total, 0)}</td>
                                    <td className="px-6 py-3 text-right text-green-700">{tableList.reduce((sum, t) => sum + t.confirmed, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm shadow-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

