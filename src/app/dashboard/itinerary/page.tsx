"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Calendar as CalendarIcon, Filter, Trash2, CheckSquare, Square } from "lucide-react";
import { Event } from "@/types/itinerary";
import TimelineItem from "@/components/dashboard/itinerary/TimelineItem";
import EventForm from "@/components/dashboard/itinerary/EventForm";
import { format } from "date-fns";
import { PlanTier, checkLimit, PLAN_LIMITS } from "@/lib/limits";
import { getEffectiveTier } from "@/lib/trial";
import { LimitModal } from "@/components/dashboard/limit-modal";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { TourGuide } from "@/components/dashboard/TourGuide";
import { TierGate } from "@/components/dashboard/TierGate";
import { ITINERARY_STEPS } from "@/lib/tours";

export default function ItineraryPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({ isOpen: false, type: 'single' });
    const [weddingId, setWeddingId] = useState<string | null>(null);
    const [weddingDate, setWeddingDate] = useState<string | null>(null);
    const [tier, setTier] = useState<PlanTier>('free');
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const wId = localStorage.getItem("current_wedding_id");
        if (wId) {
            setWeddingId(wId);
            // Fetch wedding date
            const { data: wedding } = await supabase
                .from('weddings')
                .select('wedding_date')
                .eq('id', wId)
                .single();

            if (wedding) {
                setWeddingDate(wedding.wedding_date);
            }
            // Get effective tier (validates trial & payment)
            const trialInfo = await getEffectiveTier(wId);
            setTier(trialInfo.effectiveTier);
            fetchEvents(wId);
        }
        setLoading(false);
    };

    const fetchEvents = async (wId: string) => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('wedding_id', wId)
            .order('start_time', { ascending: true });

        if (!error && data) {
            setEvents(data as Event[]);
        }
    };

    const confirmDelete = (id: string) => {
        setConfirmState({ isOpen: true, type: 'single', id });
    };

    const confirmBulkDelete = () => {
        setConfirmState({ isOpen: true, type: 'bulk' });
    };

    const executeDelete = async () => {
        if (confirmState.type === 'bulk') {
            const idsToDelete = Array.from(selectedIds);
            const { error } = await supabase.from('events').delete().in('id', idsToDelete);
            if (!error && weddingId) {
                setSelectedIds(new Set());
                fetchEvents(weddingId);
            }
        } else if (confirmState.id) {
            const { error } = await supabase.from('events').delete().eq('id', confirmState.id);
            if (!error && weddingId) {
                fetchEvents(weddingId);
            }
        }
        setConfirmState({ isOpen: false, type: 'single' });
    };

    const openEdit = (event: Event) => {
        setEditingEvent(event);
        setShowForm(true);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === events.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(events.map(e => e.id)));
        }
    };

    return (
        <TierGate weddingId={weddingId} featureName="Itinerary">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-foreground">Itinerary</h2>
                        <p className="mt-1 text-muted-foreground">Detailed timeline for your big day.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TourGuide steps={ITINERARY_STEPS} pageKey="itinerary" />
                        {selectedIds.size > 0 && (
                            <button
                                id="tour-bulk-actions"
                                onClick={confirmBulkDelete}
                                className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-red-700 hover:bg-red-200 transition-all mr-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedIds.size})
                            </button>
                        )}
                        <button
                            id="tour-add-event"
                            onClick={() => {
                                if (!checkLimit(tier, 'events', events.length)) {
                                    setShowLimitModal(true);
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
                {events.length > 0 && (
                    <div className="flex justify-end p-2">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                            {selectedIds.size > 0 && selectedIds.size === events.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {selectedIds.size === events.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                )}

                {loading ? (
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
                    <div id="tour-timeline" className="bg-gray-50/50 rounded-2xl p-6 sm:p-8 ml-8">
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
                                    onEdit={openEdit}
                                    onDelete={confirmDelete}
                                    isSelected={selectedIds.has(event.id)}
                                    onToggleSelect={toggleSelect}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {showForm && weddingId && (
                    <EventForm
                        weddingId={weddingId}
                        initialData={editingEvent}
                        onClose={() => setShowForm(false)}
                        onSuccess={() => fetchEvents(weddingId)}
                    />
                )}

                <ConfirmDialog
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState({ isOpen: false, type: 'single' })}
                    onConfirm={executeDelete}
                    title={confirmState.type === 'bulk' ? "Delete Events?" : "Delete Event?"}
                    description={confirmState.type === 'bulk'
                        ? `Are you sure you want to delete ${selectedIds.size} events? This action cannot be undone.`
                        : "Are you sure you want to delete this event? This action cannot be undone."}
                    variant="danger"
                />

                <LimitModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    feature="Timeline Events"
                    limit={PLAN_LIMITS.free.events}
                    tier={tier}
                />
            </div>
        </TierGate>
    );
}
