"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle, RefreshCw, Share2, X } from "lucide-react";
import { getDayOfToken, resetDayOfToken } from "@/app/actions/data";

/** A read-only link to the run of show for family, the bridal party and vendors. */
export function ShareDayOfButton({ weddingId, canReset }: { weddingId: string; canReset: boolean }) {
    const [open, setOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    const show = async () => {
        setOpen(true);
        if (!token) {
            try {
                setToken(await getDayOfToken(weddingId));
            } catch (e) {
                toast.error((e as Error).message);
                setOpen(false);
            }
        }
    };
    const url = token ? `${window.location.origin}/day/${token}` : "";

    const reset = async () => {
        if (!confirm("The current link will stop working for everyone you sent it to. Make a new one?")) return;
        try {
            setToken(await resetDayOfToken(weddingId));
            toast.success("New link made");
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    return (
        <div className="relative">
            <button onClick={show} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                <Share2 className="h-4 w-4" /> Share the day
            </button>
            {open && (
                <div role="dialog" aria-label="Share the day-of schedule" className="absolute right-0 z-30 mt-2 w-[min(92vw,360px)] rounded-2xl border border-border bg-white p-4 shadow-xl">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-semibold">Share the run of show</p>
                            <p className="text-sm text-muted-foreground">A read-only page with times, places and vendor phone numbers. No sign-in needed, and it shows what&apos;s on now.</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
                    </div>
                    {!token ? (
                        <div className="mt-3 h-20 animate-pulse rounded-lg bg-gray-100" />
                    ) : (
                        <div className="mt-3 space-y-2">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Here's the schedule for the wedding day:\n${url}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                <MessageCircle className="h-4 w-4" /> Send on WhatsApp
                            </a>
                            <div className="flex gap-2">
                                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Day-of link" className="min-w-0 flex-1 rounded-lg border border-border bg-gray-50 px-2 py-1.5 text-xs" />
                                <button onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium hover:bg-gray-50">
                                    <Copy className="h-3.5 w-3.5" /> Copy
                                </button>
                            </div>
                            <a href={url} target="_blank" rel="noreferrer" className="block text-xs font-medium text-muted-foreground underline">Preview the page</a>
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
