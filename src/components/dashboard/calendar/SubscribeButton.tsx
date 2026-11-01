"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Copy, RefreshCw, X } from "lucide-react";
import { getCalendarFeedToken, resetCalendarFeedToken } from "@/app/actions/data";

/** Gives a private iCal link that Google, Apple or Outlook calendar can subscribe to. */
export function SubscribeButton({ weddingId, canReset }: { weddingId: string; canReset: boolean }) {
    const [open, setOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    const show = async () => {
        setOpen(true);
        if (!token) {
            try {
                setToken(await getCalendarFeedToken(weddingId));
            } catch (e) {
                toast.error((e as Error).message);
                setOpen(false);
            }
        }
    };

    const url = token ? `${window.location.origin}/api/calendar/${token}.ics` : "";
    const webcal = url.replace(/^https?:/, "webcal:");

    const reset = async () => {
        if (!confirm("Anyone using the current link will stop getting updates. Make a new link?")) return;
        try {
            setToken(await resetCalendarFeedToken(weddingId));
            toast.success("New link made. Subscribe again with it.");
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    return (
        <div className="relative">
            <button onClick={show} className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-gray-50">
                <CalendarPlus className="h-4 w-4" /> Add to my calendar
            </button>
            {open && (
                <div role="dialog" aria-label="Subscribe to this calendar" className="absolute right-0 z-30 mt-2 w-[min(92vw,380px)] rounded-2xl border border-border bg-white p-4 shadow-xl">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-semibold">Subscribe in your calendar app</p>
                            <p className="text-sm text-muted-foreground">Tasks, payments and events show up in your phone's calendar and stay up to date.</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
                    </div>
                    {!token ? (
                        <div className="mt-3 h-24 animate-pulse rounded-lg bg-gray-100" />
                    ) : (
                        <div className="mt-3 space-y-2">
                            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" className="block rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-gray-50">
                                Google Calendar
                            </a>
                            <a href={webcal} className="block rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-gray-50">
                                Apple Calendar or Outlook
                            </a>
                            <div className="flex gap-2">
                                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Calendar link" className="min-w-0 flex-1 rounded-lg border border-border bg-gray-50 px-2 py-1.5 text-xs" />
                                <button
                                    onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium hover:bg-gray-50"
                                >
                                    <Copy className="h-3.5 w-3.5" /> Copy
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">Anyone with this link can see the schedule, so share it only with family or your planner.</p>
                            {canReset && (
                                <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                    <RefreshCw className="h-3 w-3" /> Make a new link
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
