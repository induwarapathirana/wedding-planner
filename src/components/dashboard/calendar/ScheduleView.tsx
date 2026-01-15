"use client";

import { format, parseISO, isSameDay, isToday, isTomorrow } from "date-fns";
import { Clock, MapPin, Calendar as CalendarIcon, CheckCircle2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarItem } from "@/app/dashboard/calendar/page";

interface ScheduleViewProps {
    events: CalendarItem[];
}

export function ScheduleView({ events }: ScheduleViewProps) {
    // Group events by date
    const groupedEvents = events.reduce((acc, event) => {
        // Handle ISO (events) vs YYYY-MM-DD (tasks/payments)
        const dateKey = format(parseISO(event.date), "yyyy-MM-dd");
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarItem[]>);

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
                <p className="text-gray-500 mt-1">Get started by adding events, tasks, or budget items.</p>
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
                            {groupedEvents[dateStr].length} items
                        </span>
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-gray-100 ml-1">
                        {groupedEvents[dateStr]
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(item => (
                                <div
                                    key={item.id}
                                    className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:border-primary/20"
                                >
                                    <div className="min-w-[100px] flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        {/* Icon based on Type */}
                                        {item.type === 'event' && <Clock className="w-4 h-4 text-purple-600" />}
                                        {item.type === 'task' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                        {item.type === 'payment' && <DollarSign className="w-4 h-4 text-amber-600" />}

                                        {/* Time or Label */}
                                        {item.time ? (
                                            format(parseISO(item.time), "h:mm a")
                                        ) : (
                                            <span className="text-xs uppercase tracking-wide text-gray-500 font-bold">{item.type}</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col">
                                            {item.weddingName && (
                                                <span className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-0.5">
                                                    {item.weddingName}
                                                </span>
                                            )}
                                            <h4 className={cn(
                                                "font-semibold text-gray-900 truncate pr-4",
                                                item.isCompleted && "line-through text-gray-400"
                                            )}>{item.title}</h4>
                                        </div>
                                    </div>

                                    {/* Status Chips */}
                                    <div className="flex items-center gap-2">
                                        {item.isCompleted !== undefined && (
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border shrink-0",
                                                item.isCompleted ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-100"
                                            )}>
                                                {item.isCompleted ? "Completed" : "Pending"}
                                            </span>
                                        )}
                                        {item.isPaid !== undefined && (
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border shrink-0",
                                                item.isPaid ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                            )}>
                                                {item.isPaid ? "Paid" : "Unpaid"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
