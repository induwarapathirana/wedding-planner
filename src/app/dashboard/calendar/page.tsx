"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CalendarMonthView } from "@/components/dashboard/calendar/CalendarMonthView";
import { ScheduleView } from "@/components/dashboard/calendar/ScheduleView";
import { Calendar as CalendarIcon, List, Loader2, PartyPopper } from "lucide-react";
import { Event } from "@/types/itinerary";

function CalendarContent() {
    const [viewMode, setViewMode] = useState<'list' | 'month'>('month'); // Default to month for "Calendar" feel
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const weddingIdFromUrl = searchParams.get('weddingId');

    useEffect(() => {
        fetchEvents();
    }, [weddingIdFromUrl]);

    async function fetchEvents() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('events')
            .select('*')
            .order('start_time', { ascending: true });

        // If specific wedding ID is provided, filter by it
        // Otherwise, if Planner, fetch all events they have access to via collaborators
        if (weddingIdFromUrl) {
            query = query.eq('wedding_id', weddingIdFromUrl);
        } else {
            // For Global Calendar (Pro/Planner), we want all events from all their weddings
            // First get all wedding IDs the user is a collaborator on
            const { data: collaborations } = await supabase
                .from('collaborators')
                .select('wedding_id')
                .eq('user_id', user.id);

            if (collaborations && collaborations.length > 0) {
                const weddingIds = collaborations.map(c => c.wedding_id);
                query = query.in('wedding_id', weddingIds);
            } else {
                // No weddings found
                setEvents([]);
                setLoading(false);
                return;
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching calendar events:', error);
        } else {
            setEvents((data as Event[]) || []);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading calendar...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Master Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        {weddingIdFromUrl ? "Schedule for selected wedding" : "Your upcoming schedule across all events."}
                    </p>
                </div>

                {/* View Toggles */}
                <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 self-start md:self-auto">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                            }`}
                    >
                        <List className="w-4 h-4" />
                        Schedule
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'month'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Calendar
                    </button>
                </div>
            </div>

            {viewMode === 'month' ? (
                <CalendarMonthView events={events} />
            ) : (
                <ScheduleView events={events} />
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
