"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCalendarData } from "@/app/actions/data";
import { CalendarMonthView } from "@/components/dashboard/calendar/CalendarMonthView";
import { ScheduleView } from "@/components/dashboard/calendar/ScheduleView";
import { SubscribeButton } from "@/components/dashboard/calendar/SubscribeButton";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { Calendar as CalendarIcon, List, Loader2, Filter } from "lucide-react";

// Unified Type Definition
export type CalendarItem = {
    id: string;
    title: string;
    date: string; // ISO string
    type: 'event' | 'task' | 'payment' | 'wedding-date';
    weddingId: string;
    weddingName?: string;
    time?: string; // For events
    isCompleted?: boolean; // For checklist
    isPaid?: boolean; // For budget
};

type WeddingOption = {
    id: string;
    couple_name: string;
};

function CalendarContent() {
    const [viewMode, setViewMode] = useState<'list' | 'month'>('month');
    const [items, setItems] = useState<CalendarItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering
    const [weddings, setWeddings] = useState<WeddingOption[]>([]);
    const [selectedWeddingId, setSelectedWeddingId] = useState<string>("all");

    const searchParams = useSearchParams();
    const urlWeddingId = searchParams.get('weddingId');
    const feedWeddingId = urlWeddingId || (selectedWeddingId !== "all" ? selectedWeddingId : null);
    const { canEdit } = useWeddingPermission(feedWeddingId);

    useEffect(() => {
        if (urlWeddingId) {
            setSelectedWeddingId(urlWeddingId);
        }
    }, [urlWeddingId]);

    useEffect(() => {
        fetchData();
    }, [selectedWeddingId]);

    async function fetchData() {
        setLoading(true);
        // A weddingId in the URL locks the view to that wedding; otherwise use the filter
        const scope = urlWeddingId || (selectedWeddingId !== "all" ? selectedWeddingId : null);
        const data = await getCalendarData(scope);
        setWeddings(data.weddings);
        setItems(data.items);
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading master schedule...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Master Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        Overview of events, tasks, and payments across your weddings.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* Wedding Filter - Only show if NO weddingId in URL (Master Mode) */}
                    {!urlWeddingId && (
                        <div className="relative min-w-[240px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            <select
                                value={selectedWeddingId}
                                onChange={(e) => setSelectedWeddingId(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none cursor-pointer h-[42px]"
                            >
                                <option value="all">All Weddings</option>
                                {weddings.map(w => (
                                    <option key={w.id} value={w.id}>{w.couple_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {feedWeddingId && <SubscribeButton key={feedWeddingId} weddingId={feedWeddingId} canReset={canEdit} />}

                    {/* View Toggles */}
                    <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 h-[42px]">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            Schedule
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-medium transition-all ${viewMode === 'month'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                                }`}
                        >
                            <CalendarIcon className="w-4 h-4" />
                            Calendar
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'month' ? (
                // @ts-ignore - Prop mismatch until we update child component
                <CalendarMonthView events={items} />
            ) : (
                // @ts-ignore - Prop mismatch until we update child component
                <ScheduleView events={items} />
            )}
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading...</div>}>
            <CalendarContent />
        </Suspense>
    );
}
