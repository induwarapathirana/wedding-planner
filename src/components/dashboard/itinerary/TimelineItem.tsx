"use client";

import { Event, EventType } from "@/types/itinerary";
import { MapPin, Clock, Edit2, Trash2, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineItemProps {
    event: Event;
    isLast: boolean;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

export default function TimelineItem({ event, isLast, onEdit, onDelete, isSelected, onToggleSelect }: TimelineItemProps) {
    const [showActions, setShowActions] = useState(false); // Added useState

    const typeColors: Record<EventType, string> = { // Added typeColors
        ceremony: "bg-rose-100 text-rose-700 border-rose-200",
        reception: "bg-purple-100 text-purple-700 border-purple-200",
        meal: "bg-amber-100 text-amber-700 border-amber-200",
        photo: "bg-blue-100 text-blue-700 border-blue-200",
        transport: "bg-emerald-100 text-emerald-700 border-emerald-200",
        prep: "bg-slate-100 text-slate-700 border-slate-200",
        other: "bg-gray-100 text-gray-700 border-gray-200",
    };

    const startTime = new Date(event.start_time);

    return (
        <div className="relative pl-6 md:pl-8 pb-8 group">
            {/* Selection Checkbox - positioned left of the line */}
            {onToggleSelect && (
                <button
                    onClick={() => onToggleSelect(event.id)}
                    className="absolute -left-2 md:-left-10 top-0 p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                    {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                </button>
            )}

            {/* Timeline Dot and Line */}
            <div className="absolute left-[15px] top-0 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm z-10"></div>
                {!isLast && (
                    <div className="absolute top-[12px] bottom-0 w-0.5 bg-gray-200 group-hover:bg-gray-300 transition-colors" />
                )}
            </div>

            {/* Content Card */}
            <div className={cn(
                "relative flex gap-4 p-4 rounded-xl border bg-white transition-all hover:shadow-md ml-6 md:ml-0", // Added ml-6 for mobile spacing
                isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-gray-100"
            )}>
                {/* Time Column */}
                <div className="w-16 md:w-20 pt-1 text-right flex-shrink-0">
                    <div className="font-bold text-gray-900">{format(startTime, "h:mm a")}</div>
                    {event.end_time && (
                        <div className="text-xs text-gray-500 mt-1">
                            to {format(new Date(event.end_time), "h:mm a")}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                {event.category}
                            </span>
                            <h3 className="font-serif text-lg font-bold text-gray-900 mt-0.5">
                                {event.title}
                            </h3>
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(event)}
                                className="p-1.5 md:p-1.5 bg-gray-50 md:bg-transparent text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Delete this event?")) onDelete(event.id);
                                }}
                                className="p-1.5 md:p-1.5 bg-gray-50 md:bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
