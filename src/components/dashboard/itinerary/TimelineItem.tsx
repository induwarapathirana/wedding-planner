"use client";

import { Event } from "@/types/itinerary";
import { MapPin, Clock, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface TimelineItemProps {
    event: Event;
    isLast: boolean;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
}

export default function TimelineItem({ event, isLast, onEdit, onDelete }: TimelineItemProps) {
    const startTime = new Date(event.start_time);

    return (
        <div className="flex gap-4 group">
            {/* Time Column */}
            <div className="w-20 pt-1 text-right flex-shrink-0">
                <div className="font-bold text-gray-900">{format(startTime, "h:mm a")}</div>
                {event.end_time && (
                    <div className="text-xs text-gray-500 mt-1">
                        to {format(new Date(event.end_time), "h:mm a")}
                    </div>
                )}
            </div>

            {/* Line & Dot */}
            <div className="relative flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm z-10"></div>
                {!isLast && <div className="w-px h-full bg-gray-200 absolute top-3"></div>}
            </div>

            {/* Content Card */}
            <div className="flex-1 pb-8">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                {event.category}
                            </span>
                            <h3 className="font-serif text-lg font-bold text-gray-900 mt-0.5">
                                {event.title}
                            </h3>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(event)}
                                className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Delete this event?")) onDelete(event.id);
                                }}
                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {(event.location || event.description) && (
                        <div className="mt-3 space-y-2">
                            {event.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location}</span>
                                </div>
                            )}
                            {event.description && (
                                <p className="text-sm text-gray-500 whitespace-pre-wrap pl-6 border-l-2 border-gray-100">
                                    {event.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
