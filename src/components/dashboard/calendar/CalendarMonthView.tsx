"use client";

import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarItem } from "@/app/dashboard/calendar/page";

interface CalendarMonthViewProps {
    events: CalendarItem[];
}

export function CalendarMonthView({ events }: CalendarMonthViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const checkEventsForDay = (day: Date) => {
        // NOTE: We used to compare ISO strings, but now we have strict dates.
        // Some dates might be "YYYY-MM-DD" (Tasks/Payments) and some ISO (Events).
        // parseISO handles both well enough for date comparison.
        return events.filter(event => isSameDay(parseISO(event.date), day));
    };

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd
    });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <h2 className="font-serif text-2xl font-bold text-gray-900">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                        <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <button
                    onClick={goToToday}
                    className="text-sm font-medium text-gray-600 hover:text-primary transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                    Today
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100 bg-gray-100 gap-[1px]">
                {days.map(day => {
                    const dayEvents = checkEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "min-h-[140px] bg-white p-2 transition-colors hover:bg-gray-50/50 relative group",
                                !isCurrentMonth && "bg-gray-50/30 text-gray-400"
                            )}
                        >
                            <span className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                                isToday(day)
                                    ? "bg-primary text-white"
                                    : "text-gray-700"
                            )}>
                                {format(day, "d")}
                            </span>

                            <div className="mt-2 space-y-1.5">
                                {dayEvents.map(event => {
                                    // Style based on type
                                    let bgClass = "bg-gray-50 border-gray-100 text-gray-700";
                                    let dotClass = "bg-gray-400";

                                    if (event.type === 'event') {
                                        bgClass = "bg-purple-50 border-purple-100 text-purple-900";
                                        dotClass = "bg-purple-400";
                                    } else if (event.type === 'task') {
                                        bgClass = event.isCompleted ? "bg-green-50 border-green-100 text-green-700 opacity-60 line-through" : "bg-blue-50 border-blue-100 text-blue-900";
                                        dotClass = event.isCompleted ? "bg-green-400" : "bg-blue-400";
                                    } else if (event.type === 'payment') {
                                        bgClass = event.isPaid ? "bg-green-50 border-green-100 text-green-700 opacity-60" : "bg-amber-50 border-amber-100 text-amber-900";
                                        dotClass = event.isPaid ? "bg-green-400" : "bg-amber-400";
                                    }

                                    return (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "text-xs p-1.5 rounded-md border truncate hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1",
                                                bgClass
                                            )}
                                            title={`${event.weddingName ? event.weddingName + ' - ' : ''}${event.title}`}
                                        >
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
                                            <span className="truncate flex-1 font-medium">
                                                {event.weddingName && <span className="opacity-70 font-normal mr-1">[{event.weddingName.split(' ')[0]}]</span>}
                                                {event.title}
                                            </span>
                                            {event.time && (
                                                <span className="text-[10px] opacity-70 shrink-0 hidden group-hover:block">
                                                    {format(parseISO(event.time), "h:mm a")}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 4 && (
                                    <div className="text-[10px] text-gray-400 pl-2">
                                        + {dayEvents.length - 4} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
