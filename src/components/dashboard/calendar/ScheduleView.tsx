"use client";

import { format, parseISO, isSameDay, isToday, isTomorrow } from "date-fns";
import { Event } from "@/types/itinerary";
import { Clock, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleViewProps {
    events: Event[];
}

export function ScheduleView({ events }: ScheduleViewProps) {
    // Group events by date
    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = format(parseISO(event.start_time), "yyyy-MM-dd");
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    // Sort dates
    const sortedDates = Object.keys(groupedEvents).sort();

    const getDateLabel = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return "Today";
        if (isTomorrow(date)) return "Tomorrow";
        return format(date, "EEEE, MMMM d, yyyy");
    };

    if (events.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <CalendarIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No events scheduled</h3>
                <p className="text-gray-500 mt-1">Get started by adding events to your itinerary.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sortedDates.map(dateStr => (
                <div key={dateStr} className="relative">
                    <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-4 -mx-4 mb-4 border-b border-gray-200/50 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <h3 className="font-serif text-lg font-bold text-gray-900">
                            {getDateLabel(dateStr)}
                        </h3>
                        <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white border border-gray-200 rounded-full">
                            {groupedEvents[dateStr].length} events
                        </span>
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-gray-100 ml-1">
                        {groupedEvents[dateStr]
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .map(event => (
                                <div
                                    key={event.id}
                                    className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:border-primary/20"
                                >
                                    <div className="min-w-[100px] flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <Clock className="w-4 h-4 text-primary" />
                                        {format(parseISO(event.start_time), "h:mm a")}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate pr-4">{event.title}</h4>
                                        {event.description && (
                                            <p className="text-sm text-gray-500 truncate mt-0.5">{event.description}</p>
                                        )}
                                    </div>

                                    {event.location && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shrink-0 max-w-[200px] truncate">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                            {event.location}
                                        </div>
                                    )}

                                    {event.category && (
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-2 py-1 bg-gray-50 rounded-md border border-gray-100 shrink-0">
                                            {event.category}
                                        </span>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
