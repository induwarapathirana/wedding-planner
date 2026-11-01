"use client";

import { useMemo, useState } from "react";
import { Check, MessageCircle, X } from "lucide-react";
import { LANGS, isLang, whatsappMessage, type Lang } from "@/lib/rsvp-i18n";
import { cn } from "@/lib/utils";

export type QueueGuest = {
    id: string;
    name: string;
    whatsappNumber: string | null;
    language: string | null;
    inviteStatus: string;
    rsvpStatus: string;
    remindedAt: Date | string | null;
};

export type WeddingInfo = { couple: string; date: string | null; place: string | null };

/** International number for wa.me: Sri Lankan 07x numbers become 947x. */
export function waNumber(phone?: string | null) {
    const digits = (phone ?? "").replace(/[^\d+]/g, "");
    if (!digits) return null;
    if (digits.startsWith("+")) return digits.slice(1);
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("0")) return `94${digits.slice(1)}`;
    return digits;
}

export function rsvpLink(guestId: string, lang: Lang) {
    return `${window.location.origin}/invitation/${guestId}${lang === "en" ? "" : `?lang=${lang}`}`;
}

export function whatsappUrl(guest: QueueGuest, kind: "invite" | "reminder", wedding: WeddingInfo, fallbackLang: Lang) {
    const number = waNumber(guest.whatsappNumber);
    const lang = isLang(guest.language) ? guest.language : fallbackLang;
    const text = whatsappMessage(kind, lang, { name: guest.name, couple: wedding.couple, date: wedding.date, place: wedding.place, link: rsvpLink(guest.id, lang) });
    return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}

/**
 * Sends invites or reminders one household at a time through WhatsApp on this
 * device: each tap opens the chat with the message ready, and the guest is
 * marked as invited (or reminded) so the list shrinks as you go.
 */
export function WhatsAppQueue({
    guests,
    wedding,
    onClose,
    onSent,
}: {
    guests: QueueGuest[];
    wedding: WeddingInfo;
    onClose: () => void;
    onSent: (guest: QueueGuest, kind: "invite" | "reminder") => void;
}) {
    const [kind, setKind] = useState<"invite" | "reminder">(guests.some((g) => g.inviteStatus !== "sent") ? "invite" : "reminder");
    const [lang, setLang] = useState<Lang>("en");
    const [done, setDone] = useState<Set<string>>(new Set());

    const list = useMemo(
        () =>
            guests.filter((g) =>
                kind === "invite" ? g.inviteStatus !== "sent" : g.inviteStatus === "sent" && g.rsvpStatus === "pending"
            ),
        [guests, kind]
    );
    const withNumber = list.filter((g) => waNumber(g.whatsappNumber));
    const missing = list.length - withNumber.length;

    const send = (g: QueueGuest) => {
        window.open(whatsappUrl(g, kind, wedding, lang), "_blank", "noopener");
        setDone((d) => new Set(d).add(g.id));
        onSent(g, kind);
    };

    const ago = (d: Date | string | null) => {
        if (!d) return null;
        const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
        return days === 0 ? "reminded today" : `reminded ${days}d ago`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby="wa-title" className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                        <h2 id="wa-title" className="font-serif text-2xl font-bold">Send on WhatsApp</h2>
                        <p className="text-sm text-muted-foreground">Each tap opens WhatsApp with the message and their RSVP link ready. Just press send.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                    <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist">
                        {([["invite", "Invites"], ["reminder", "Reminders"]] as const).map(([value, label]) => (
                            <button key={value} role="tab" aria-selected={kind === value} onClick={() => setKind(value)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", kind === value ? "bg-white shadow-sm" : "text-muted-foreground")}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                        Language
                        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-lg border border-border bg-white px-2 py-1 text-foreground">
                            {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-2">
                    {withNumber.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {kind === "invite" ? "Everyone with a WhatsApp number has been invited." : "No one is waiting on a reply."}
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {withNumber.map((g) => (
                                <li key={g.id} className="flex items-center gap-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className={cn("truncate font-medium", done.has(g.id) && "text-muted-foreground line-through")}>{g.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {g.whatsappNumber}
                                            {isLang(g.language) && g.language !== lang && <> · {LANGS.find((l) => l.value === g.language)?.label}</>}
                                            {kind === "reminder" && g.remindedAt && <> · {ago(g.remindedAt)}</>}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => send(g)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                                            done.has(g.id) ? "text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
                                        )}
                                    >
                                        {done.has(g.id) ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                                        {done.has(g.id) ? "Sent" : "Send"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                    {missing > 0 && <>{missing} {missing === 1 ? "household has" : "households have"} no WhatsApp number. </>}
                    Guests whose Language column is set get the message in their language.
                </p>
            </div>
        </div>
    );
}
