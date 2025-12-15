"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Calendar as CalendarIcon, Filter, Trash2, CheckSquare, Square } from "lucide-react";
import { Event } from "@/types/itinerary";
import TimelineItem from "@/components/dashboard/itinerary/TimelineItem";
import EventForm from "@/components/dashboard/itinerary/EventForm";
import { format } from "date-fns";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";

import { LimitModal } from "@/components/dashboard/limit-modal";

export default function ItineraryPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [weddingDate, setWeddingDate] = useState<string | undefined>(undefined);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        const storedWeddingId = localStorage.getItem("current_wedding_id");
        if (storedWeddingId) {
            setWeddingId(storedWeddingId);
            fetchWeddingDetails(storedWeddingId);
            fetchEvents(storedWeddingId);
            // Fetch Tier
            supabase.from('weddings').select('tier').eq('id', storedWeddingId).single()
                .then(({ data }) => { if (data) setTier((data.tier as PlanTier) || 'free'); });
        }
    }, []);

    const fetchWeddingDetails = async (id: string) => {
        const { data } = await supabase.from('weddings').select('wedding_date').eq('id', id).single();
        if (data) {
            setWeddingDate(data.wedding_date);
        }
    };

    const fetchEvents = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('wedding_id', id)
            .order('start_time', { ascending: true });

        if (!error && data) {
            setEvents(data as Event[]);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (!error) {
            setEvents(prev => prev.filter(e => e.id !== id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } else {
            alert("Failed to delete event");
        }
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelectAll = () => {
        if (selectedIds.size === events.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(events.map(e => e.id)));
        }
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

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} events?`)) return;

        const ids = Array.from(selectedIds);
        const { error } = await supabase.from('events').delete().in('id', ids);

        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            if (weddingId) fetchEvents(weddingId);
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Itinerary</h2>
                    <p className="mt-1 text-muted-foreground">Detailed timeline for your big day.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition-all mr-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (!checkLimit(tier, 'events', events.length)) {
                                alert(`You have reached the event limit (${PLAN_LIMITS[tier].events}) for the ${tier} plan.\nPlease upgrade to Premium.`);
                                return;
                            }
                            setEditingEvent(undefined);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Event
                    </button>
                </div>
            </div>

            {/* Selection Status Bar */}
            {
                events.length > 0 && (
                    <div className="flex justify-end p-2">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                            {selectedIds.size > 0 && selectedIds.size === events.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {selectedIds.size === events.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                )
            }

            {
                loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading timeline...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Timeline is empty</h3>
                        <p className="text-gray-500 mb-6">Start planning your day by adding events.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                        >
                            Add First Event
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-50/50 rounded-2xl p-6 sm:p-8 ml-8"> {/* Added left margin to accommodate checkboxes */}
                        {weddingDate && (
                            <div className="mb-8 text-center">
                                <h3 className="text-lg font-serif font-bold text-gray-900">
                                    {format(new Date(weddingDate), "EEEE, MMMM do, yyyy")}
                                </h3>
                                <p className="text-sm text-gray-500">Day of Timeline</p>
                            </div>
                        )}

                        <div className="space-y-0 max-w-3xl mx-auto">
                            {events.map((event, index) => (
                                <TimelineItem
                                    key={event.id}
                                    event={event}
                                    isLast={index === events.length - 1}
                                    onEdit={(e) => {
                                        setEditingEvent(e);
                                        setShowForm(true);
                                    }}
                                    onDelete={handleDelete}
                                    isSelected={selectedIds.has(event.id)}
                                    onToggleSelect={toggleSelect}
                                />
                            ))}
                        </div>
                    </div>
                )
            }

            {
                showForm && weddingId && (
                    <EventForm
                        weddingId={weddingId}
                        weddingDate={weddingDate}
                        initialData={editingEvent}
                        onClose={() => setShowForm(false)}
                        onSuccess={() => fetchEvents(weddingId)}
                    />
                )
            }
            <LimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                feature="Timeline Events"
                limit={PLAN_LIMITS.free.events}
                tier={tier}
            />
        </div >
    );
}
