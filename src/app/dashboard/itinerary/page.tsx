"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, Sparkles, Trash2 } from "lucide-react";
import { applyTemplate, createEvent, deleteEvent, getEvents, getWeddingById, updateEvent } from "@/app/actions/data";
import { SheetGrid, toDateInput, type SheetColumn, type SheetGroup } from "@/components/sheet/SheetGrid";
import { ShareDayOfButton } from "@/components/dashboard/ShareDayOfButton";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { cn } from "@/lib/utils";

type Slot = Awaited<ReturnType<typeof getEvents>>[number];

const CATEGORIES = [
    { value: "prep", label: "Getting ready" },
    { value: "photo", label: "Photos" },
    { value: "transport", label: "Transport" },
    { value: "ceremony", label: "Ceremony" },
    { value: "reception", label: "Reception" },
    { value: "meal", label: "Meal" },
    { value: "other", label: "Other" },
];
const UNSCHEDULED = "unscheduled";

const time = (d: Date | string | null) =>
    d ? new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
/** Local calendar day, so slots group the way they appear on the clock. */
const dayKey = (d: Date | string | null) => {
    if (!d) return UNSCHEDULED;
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const minutes = (s: Slot) =>
    s.startTime && s.endTime ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000) : null;
const formatDuration = (m: number | null) => {
    if (m === null || m <= 0) return "";
    const h = Math.floor(m / 60);
    return h ? `${h}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

/** Keep the length of a slot when its start moves; start before end. */
function toChanges(slot: Slot, key: string, value: unknown): Record<string, unknown> {
    if (key === "duration") {
        const m = Math.max(0, Number(value) || 0);
        return slot.startTime ? { endTime: new Date(new Date(slot.startTime).getTime() + m * 60000) } : {};
    }
    if (key === "startTime" && value) {
        const length = minutes(slot);
        return length !== null ? { startTime: value, endTime: new Date(new Date(value as Date).getTime() + length * 60000) } : { startTime: value };
    }
    return { [key]: value };
}

export default function ItineraryPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [weddingDate, setWeddingDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [ceremonyTime, setCeremonyTime] = useState("10:00");
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async (id: string) => {
        const [events, wedding] = await Promise.all([getEvents(id), getWeddingById(id)]);
        setSlots(events);
        setWeddingDate(wedding?.weddingDate ? toDateInput(wedding.weddingDate) : null);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (weddingId === undefined) return;
        if (weddingId === null) {
            setLoading(false);
            return;
        }
        load(weddingId);
    }, [weddingId, load]);

    const ordered = useMemo(
        () =>
            [...slots].sort((a, b) => {
                if (!a.startTime) return 1;
                if (!b.startTime) return -1;
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            }),
        [slots]
    );

    const groupBy = useCallback((rows: Slot[]): SheetGroup<Slot>[] => {
        const keys = [...new Set(rows.map((r) => dayKey(r.startTime)))].sort((a, b) =>
            a === UNSCHEDULED ? 1 : b === UNSCHEDULED ? -1 : a.localeCompare(b)
        );
        return keys.map((key) => ({
            key,
            label:
                key === UNSCHEDULED
                    ? "No time yet"
                    : new Date(key + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            rows: rows.filter((r) => dayKey(r.startTime) === key),
        }));
    }, []);

    /** Gaps and overlaps with the slot before, within a day. */
    const notes = useMemo(() => {
        const result = new Map<string, string>();
        for (let i = 1; i < ordered.length; i++) {
            const prev = ordered[i - 1];
            const cur = ordered[i];
            if (!prev.endTime || !cur.startTime || dayKey(prev.startTime) !== dayKey(cur.startTime)) continue;
            const gap = Math.round((new Date(cur.startTime).getTime() - new Date(prev.endTime).getTime()) / 60000);
            if (gap < 0) result.set(cur.id, `Overlaps "${prev.title}" by ${formatDuration(-gap)}`);
            else if (gap >= 30) result.set(cur.id, `${formatDuration(gap)} free before this`);
        }
        return result;
    }, [ordered]);

    const save = useCallback(async (id: string, changes: Record<string, unknown>) => {
        if (!Object.keys(changes).length) return;
        let previous: Slot | undefined;
        setSlots((list) => list.map((s) => (s.id === id ? ((previous = s), { ...s, ...changes } as Slot) : s)));
        try {
            const saved = await updateEvent(id, changes);
            setSlots((list) => list.map((s) => (s.id === id ? saved : s)));
        } catch (e) {
            if (previous) setSlots((list) => list.map((s) => (s.id === id ? previous! : s)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const addSlot = async (day?: string) => {
        if (!weddingId) return;
        // New slots start 30 minutes after the day's last slot, or at 9am
        const sameDay = ordered.filter((s) => dayKey(s.startTime) === day && s.startTime);
        const last = sameDay[sameDay.length - 1];
        let start: Date | null = null;
        if (last) start = new Date(new Date(last.endTime ?? last.startTime!).getTime());
        else if (day && day !== UNSCHEDULED) start = new Date(`${day}T09:00:00`);
        else if (weddingDate) start = new Date(`${weddingDate}T09:00:00`);
        try {
            const created = await createEvent(weddingId, {
                title: "New slot",
                startTime: start,
                endTime: start ? new Date(start.getTime() + 30 * 60000) : null,
                category: "other",
            });
            setSlots((list) => [...list, created]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const removeSlot = async (s: Slot) => {
        setSlots((list) => list.filter((x) => x.id !== s.id));
        try {
            await deleteEvent(s.id);
            toast.success(`Removed "${s.title}"`);
        } catch (e) {
            setSlots((list) => [...list, s]);
            toast.error((e as Error).message);
        }
    };

    const useTemplate = async () => {
        if (!weddingId) return;
        setSeeding(true);
        try {
            const { added } = await applyTemplate(weddingId, "dayOf", { ceremonyTime, tzOffsetMinutes: new Date().getTimezoneOffset() });
            await load(weddingId);
            toast.success(`Added ${added} slots around a ${ceremonyTime} ceremony`);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSeeding(false);
        }
    };

    const columns: SheetColumn<Slot>[] = [
        {
            key: "startTime", label: "Starts", type: "datetime", width: 120, summary: true,
            render: (s) => (s.startTime ? <span className="font-semibold tabular-nums">{time(s.startTime)}</span> : <span className="text-muted-foreground/60">Set a time</span>),
        },
        {
            key: "title", label: "What's happening", type: "text", width: 280, sticky: true,
            render: (s) => (
                <span className="flex flex-col leading-tight">
                    <span>{s.title}</span>
                    {notes.get(s.id) && (
                        <span className={cn("text-[11px]", notes.get(s.id)!.startsWith("Overlaps") ? "text-rose-700" : "text-muted-foreground")}>{notes.get(s.id)}</span>
                    )}
                </span>
            ),
        },
        {
            key: "duration", label: "Length (min)", type: "number", width: 110, align: "right", get: minutes, readOnly: (s) => !s.startTime, summary: true,
            render: (s) => <span className="tabular-nums">{formatDuration(minutes(s)) || "—"}</span>,
        },
        { key: "endTime", label: "Ends", type: "datetime", width: 120, render: (s) => <span className="tabular-nums text-muted-foreground">{time(s.endTime) || "—"}</span> },
        { key: "location", label: "Where", type: "text", width: 180 },
        { key: "category", label: "Type", type: "select", options: CATEGORIES, width: 130 },
        { key: "description", label: "Who & notes", type: "text", width: 260, placeholder: "Vendor, contact, what to bring" },
    ];

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-[60vh] rounded-2xl border border-border bg-white" /></div>;
    }

    if (!weddingId) {
        return (
            <div className="py-20 text-center">
                <p className="text-muted-foreground">Create your wedding first.</p>
                <Link href="/onboarding" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 font-medium text-white">Start planning</Link>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold">Itinerary</h1>
                    <p className="text-sm text-muted-foreground">
                        Your run of show. Change a start time and the slot keeps its length; type a length to set the end.
                    </p>
                </div>
                {slots.length > 0 && weddingId && <ShareDayOfButton weddingId={weddingId} canReset={canEdit} />}
            </div>

            {slots.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Plan the wedding day</h2>
                    {weddingDate ? (
                        <>
                            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                                We'll lay out about 10 slots, from hair and make-up to the going-away, around your ceremony or nekath time.
                            </p>
                            {canEdit && (
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                    <label className="flex items-center gap-2 text-sm font-medium">
                                        Ceremony at
                                        <input type="time" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} className="rounded-lg border border-border px-2 py-1.5" />
                                    </label>
                                    <button onClick={useTemplate} disabled={seeding} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">
                                        <Sparkles className="h-4 w-4" /> {seeding ? "Setting up…" : "Build my timeline"}
                                    </button>
                                    <button onClick={() => addSlot()} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium">Start from scratch</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                            Set your wedding date in <Link href="/dashboard/settings" className="font-medium text-primary underline">Settings</Link> first, then we can lay out the day.
                        </p>
                    )}
                </div>
            ) : (
                <SheetGrid
                    rows={ordered}
                    columns={columns}
                    getRowId={(s) => s.id}
                    onCommit={(row, key, value) => save(row.id, toChanges(row, key, value))}
                    readOnly={!canEdit}
                    groupBy={groupBy}
                    renderGroupHeader={(g) => (
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold">{g.label}</span>
                            <span className="text-muted-foreground">
                                {g.rows.length} {g.rows.length === 1 ? "slot" : "slots"}
                                {g.key !== UNSCHEDULED && g.rows[0]?.startTime ? ` · ${time(g.rows[0].startTime)} – ${time(g.rows[g.rows.length - 1].endTime ?? g.rows[g.rows.length - 1].startTime)}` : ""}
                            </span>
                        </div>
                    )}
                    onAddRow={canEdit ? addSlot : undefined}
                    addRowLabel="Add a slot"
                    rowActions={(s) =>
                        canEdit ? (
                            <button onClick={() => removeSlot(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${s.title}`}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : null
                    }
                />
            )}
        </div>
    );
}
