"use client";

import { X, Users, Check, HelpCircle } from "lucide-react";

// Actually, looking at guest-dialog.tsx usage in previous code, it seems they might not have a generic Dialog component or use a custom one.
// Let's verify if `GuestDialog` uses a reusable `Dialog` component or if it implements its own invalid overlay.
// I will implement a self-contained modal using existing Tailwind classes to be safe and consistent with the likely manually built modals in this codebase (as seen in dashboard/page.tsx onboarding flow).
// Re-checking imports in GuestsPage: `import { GuestDialog } from "@/components/dashboard/guest-dialog";`
// I'll create a standalone modal to avoid dependency issues if "ui/dialog" doesn't exist.

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
};

interface GroupSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    guests: Guest[];
}

export function GroupSummaryModal({ isOpen, onClose, guests }: GroupSummaryModalProps) {
    if (!isOpen) return null;

    // Aggregation Logic
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 font-serif">Group Summary</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Consolidated view of guest counts by group.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 max-h-[60vh] overflow-y-auto">
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
