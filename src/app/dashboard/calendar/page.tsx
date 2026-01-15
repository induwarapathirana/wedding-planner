"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CalendarMonthView } from "@/components/dashboard/calendar/CalendarMonthView";
import { ScheduleView } from "@/components/dashboard/calendar/ScheduleView";
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Determine Scope (Which weddings?)
        let targetWeddingIds: string[] = [];
        let weddingMap: Record<string, string> = {};

        // We need wedding dates too
        let weddingDates: Record<string, string> = {};

        // Fetch user's weddings (Collaborator)
        const { data: collaborations } = await supabase
            .from('collaborators')
            .select(`
                wedding_id,
                weddings (
                    id,
                    couple_name_1,
                    couple_name_2,
                    wedding_date
                )
            `)
            .eq('user_id', user.id);

        if (collaborations) {
            const validCollabs = collaborations.filter(c => c.weddings);

            // Process weddings data
            const processedWeddings = validCollabs.map((c: any) => {
                const w = Array.isArray(c.weddings) ? c.weddings[0] : c.weddings;
                const coupleName = w.couple_name_1 && w.couple_name_2
                    ? `${w.couple_name_1} & ${w.couple_name_2}`
                    : w.couple_name_1 || "Unnamed Wedding";

                return {
                    id: c.wedding_id,
                    couple_name: coupleName,
                    wedding_date: w.wedding_date
                };
            });

            setWeddings(processedWeddings.map(w => ({ id: w.id, couple_name: w.couple_name })));

            processedWeddings.forEach(w => {
                weddingMap[w.id] = w.couple_name;
                if (w.wedding_date) {
                    weddingDates[w.id] = w.wedding_date;
                }
            });

            // Logic: If urlWeddingId matches one of our weddings, lock to it (Single Mode)
            // If "all", show all.
            if (urlWeddingId && weddingMap[urlWeddingId]) {
                targetWeddingIds = [urlWeddingId];
            } else if (selectedWeddingId !== "all") {
                targetWeddingIds = [selectedWeddingId];
            } else {
                targetWeddingIds = processedWeddings.map(w => w.id);
            }
        }

        if (targetWeddingIds.length === 0) {
            setItems([]);
            setLoading(false);
            return;
        }

        // 2. Fetch Events
        const { data: events } = await supabase
            .from('events')
            .select('*')
            .in('wedding_id', targetWeddingIds);

        // 3. Fetch Checklist Items (Tasks)
        const { data: tasks } = await supabase
            .from('checklist_items')
            .select('*')
            .in('wedding_id', targetWeddingIds)
            .not('due_date', 'is', null);

        // 4. Fetch Budget Items (Payments)
        const { data: payments } = await supabase
            .from('budget_items')
            .select('*')
            .in('wedding_id', targetWeddingIds)
            .not('due_date', 'is', null);

        // 5. Normalize Data
        const normalizedItems: CalendarItem[] = [];

        // Add Wedding Dates as special events
        targetWeddingIds.forEach(wid => {
            if (weddingDates[wid]) {
                normalizedItems.push({
                    id: `wed-${wid}`,
                    title: `💍 Wedding Day: ${weddingMap[wid]}`,
                    date: weddingDates[wid],
                    type: 'wedding-date',
                    weddingId: wid,
                    weddingName: weddingMap[wid]
                });
            }
        });

        // Events
        events?.forEach((e: any) => {
            normalizedItems.push({
                id: `evt-${e.id}`,
                title: e.title,
                date: e.start_time, // ISO
                type: 'event',
                weddingId: e.wedding_id,
                weddingName: weddingMap[e.wedding_id],
                time: e.start_time
            });
        });

        // Tasks
        tasks?.forEach((t: any) => {
            if (t.due_date) {
                normalizedItems.push({
                    id: `tsk-${t.id}`,
                    title: t.title,
                    date: t.due_date,
                    type: 'task',
                    weddingId: t.wedding_id,
                    weddingName: weddingMap[t.wedding_id],
                    isCompleted: t.is_completed
                });
            }
        });

        // Payments
        payments?.forEach((p: any) => {
            if (p.due_date) {
                normalizedItems.push({
                    id: `pay-${p.id}`,
                    title: `Payment: ${p.name}`,
                    date: p.due_date,
                    type: 'payment',
                    weddingId: p.wedding_id,
                    weddingName: weddingMap[p.wedding_id],
                    isPaid: !!p.paid_at
                });
            }
        });

        setItems(normalizedItems);
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
