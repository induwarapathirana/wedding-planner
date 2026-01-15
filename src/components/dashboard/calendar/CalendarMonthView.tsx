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
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Event } from "@/types/itinerary";
import { cn } from "@/lib/utils";

interface CalendarMonthViewProps {
    events: Event[];
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
        return events.filter(event => isSameDay(parseISO(event.start_time), day));
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
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="text-xs p-1.5 rounded-md bg-purple-50 border border-purple-100 text-purple-900 truncate hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                                        title={`${event.title} (${format(parseISO(event.start_time), "h:mm a")})`}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                        <span className="truncate flex-1 font-medium">{event.title}</span>
                                        <span className="text-[10px] text-purple-700/70 shrink-0 hidden group-hover:block">
                                            {format(parseISO(event.start_time), "h:mm a")}
                                        </span>
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-[10px] text-gray-400 pl-2">
                                        + {dayEvents.length - 3} more
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
