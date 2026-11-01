"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Armchair, Plus, Search, Trash2, X } from "lucide-react";
import {
    createSeatingTables,
    deleteSeatingTable,
    getGuests,
    getSeatingTables,
    updateGuest,
    updateSeatingTable,
} from "@/app/actions/data";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { cn } from "@/lib/utils";

type Guest = Awaited<ReturnType<typeof getGuests>>[number];
type Table = Awaited<ReturnType<typeof getSeatingTables>>[number];

const party = (g: Guest) => 1 + (g.companionGuestCount || 0);
/** Seats a household needs: what they confirmed, or everyone invited until they reply. */
const seats = (g: Guest) => (g.rsvpStatus === "accepted" && g.attendingCount !== null ? g.attendingCount : party(g));
const SIDE_STYLE: Record<string, string> = { bride: "bg-rose-100 text-rose-800", groom: "bg-sky-100 text-sky-800", both: "bg-violet-100 text-violet-800" };

export default function SeatingPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [includePending, setIncludePending] = useState(true);
    const [search, setSearch] = useState("");
    const [picked, setPicked] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [setup, setSetup] = useState({ count: 10, capacity: 10 });

    const load = useCallback(async (id: string) => {
        const [list, tbls] = await Promise.all([getGuests(id), getSeatingTables(id)]);
        setGuests(list);
        setTables(tbls);
        setLoading(false);
        return { list, tbls };
    }, []);

    useEffect(() => {
        if (weddingId === undefined) return;
        if (weddingId === null) {
            setLoading(false);
            return;
        }
        load(weddingId);
    }, [weddingId, load]);

    // Tables typed in the guest sheet that don't exist here yet
    useEffect(() => {
        if (!weddingId || !canEdit || loading) return;
        const known = new Set(tables.map((t) => t.name));
        const missing = [...new Set(guests.map((g) => g.tableAssignment?.trim()).filter((n): n is string => !!n && !known.has(n)))];
        if (missing.length === 0) return;
        (async () => {
            let latest = tables;
            for (const name of missing) latest = await createSeatingTables(weddingId, { name, capacity: 10 });
            setTables(latest);
        })().catch(() => {});
    }, [weddingId, canEdit, loading, guests, tables]);

    const candidates = useMemo(
        () => guests.filter((g) => g.rsvpStatus === "accepted" || (includePending && g.rsvpStatus === "pending")),
        [guests, includePending]
    );
    const byTable = useMemo(() => {
        const map = new Map<string, Guest[]>();
        for (const g of guests) {
            if (!g.tableAssignment || g.rsvpStatus === "declined") continue;
            map.set(g.tableAssignment, [...(map.get(g.tableAssignment) ?? []), g]);
        }
        return map;
    }, [guests]);
    const unseated = useMemo(() => {
        const q = search.trim().toLowerCase();
        return candidates
            .filter((g) => !g.tableAssignment && (!q || [g.name, g.groupCategory].some((f) => f?.toLowerCase().includes(q))))
            .sort((a, b) => (a.groupCategory ?? "~").localeCompare(b.groupCategory ?? "~") || a.name.localeCompare(b.name));
    }, [candidates, search]);

    const seat = async (guestId: string, table: string | null) => {
        const guest = guests.find((g) => g.id === guestId);
        if (!guest || guest.tableAssignment === table) return;
        const before = guest.tableAssignment;
        setGuests((list) => list.map((g) => (g.id === guestId ? { ...g, tableAssignment: table } : g)));
        setPicked(null);
        try {
            await updateGuest(guestId, { tableAssignment: table });
        } catch (e) {
            setGuests((list) => list.map((g) => (g.id === guestId ? { ...g, tableAssignment: before } : g)));
            toast.error((e as Error).message);
        }
    };

    const saveTable = async (table: Table, changes: { name?: string; capacity?: number }) => {
        if (changes.name !== undefined && (!changes.name || tables.some((t) => t.id !== table.id && t.name.toLowerCase() === changes.name!.toLowerCase()))) {
            toast.error(changes.name ? `There's already a table called "${changes.name}"` : "Give the table a name");
            return;
        }
        const before = { tables, guests };
        setTables((list) => list.map((t) => (t.id === table.id ? { ...t, ...changes } : t)));
        if (changes.name) setGuests((list) => list.map((g) => (g.tableAssignment === table.name ? { ...g, tableAssignment: changes.name! } : g)));
        try {
            await updateSeatingTable(table.id, changes);
        } catch (e) {
            setTables(before.tables);
            setGuests(before.guests);
            toast.error((e as Error).message);
        }
    };

    const addTables = async (count: number, capacity: number) => {
        if (!weddingId) return;
        try {
            setTables(await createSeatingTables(weddingId, { name: `Table ${tables.length + 1}`, capacity }, count));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const removeTable = async (table: Table) => {
        const seated = byTable.get(table.name)?.length ?? 0;
        if (seated && !confirm(`Remove ${table.name}? Its ${seated} ${seated === 1 ? "household goes" : "households go"} back to unseated.`)) return;
        const before = { tables, guests };
        setTables((list) => list.filter((t) => t.id !== table.id));
        setGuests((list) => list.map((g) => (g.tableAssignment === table.name ? { ...g, tableAssignment: null } : g)));
        try {
            await deleteSeatingTable(table.id);
        } catch (e) {
            setTables(before.tables);
            setGuests(before.guests);
            toast.error((e as Error).message);
        }
    };

    const seatedCount = candidates.filter((g) => g.tableAssignment).reduce((n, g) => n + seats(g), 0);
    const totalSeats = candidates.reduce((n, g) => n + seats(g), 0);
    const capacity = tables.reduce((n, t) => n + t.capacity, 0);

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

    const pickedGuest = guests.find((g) => g.id === picked);

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold">Seating</h1>
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {seatedCount} of {totalSeats} guests seated · {tables.length} tables · {capacity} seats
                        {capacity > 0 && capacity < totalSeats && <span className="font-semibold text-rose-700"> · {totalSeats - capacity} short</span>}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                        Include guests who haven&apos;t replied
                    </label>
                    {tables.length > 0 && <PrintButton kind="seating" weddingId={weddingId} />}
                </div>
            </div>

            {tables.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-14 text-center">
                    <Armchair className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Set up your tables</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        You have {totalSeats} guests to seat. Add your tables, then drag households onto them, or tap a household and then a table.
                    </p>
                    {canEdit && (
                        <form onSubmit={(e) => { e.preventDefault(); addTables(setup.count, setup.capacity); }} className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
                            <input type="number" min={1} max={60} value={setup.count} onChange={(e) => setSetup((s) => ({ ...s, count: Number(e.target.value) }))} aria-label="Number of tables" className="w-20 rounded-xl border border-border px-3 py-2 text-center" />
                            tables of
                            <input type="number" min={1} max={50} value={setup.capacity} onChange={(e) => setSetup((s) => ({ ...s, capacity: Number(e.target.value) }))} aria-label="Seats per table" className="w-20 rounded-xl border border-border px-3 py-2 text-center" />
                            seats
                            <button type="submit" className="rounded-xl bg-primary px-5 py-2 font-semibold text-white shadow">Create tables</button>
                        </form>
                    )}
                    {totalSeats > 0 && <p className="mt-2 text-xs text-muted-foreground">Tables of 10 would need {Math.ceil(totalSeats / 10)}.</p>}
                </div>
            ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    {/* Unseated households */}
                    <aside className="rounded-2xl border border-border bg-white lg:sticky lg:top-4 lg:w-72 lg:shrink-0 print:hidden">
                        <div className="border-b border-border p-3">
                            <p className="text-sm font-semibold">Not seated <span className="font-normal text-muted-foreground">· {unseated.length}</span></p>
                            <div className="relative mt-2">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search unseated guests" className="w-full rounded-lg border border-border py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                        </div>
                        <ul className="max-h-[50vh] overflow-y-auto p-2 lg:max-h-[65vh]">
                            {unseated.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">{search ? "No matches" : "Everyone has a seat 🎉"}</li>}
                            {unseated.map((g) => (
                                <li key={g.id}>
                                    <button
                                        draggable={canEdit}
                                        onDragStart={(e) => e.dataTransfer.setData("text/guest", g.id)}
                                        onClick={() => canEdit && setPicked(picked === g.id ? null : g.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                                            canEdit && "cursor-grab active:cursor-grabbing",
                                            picked === g.id ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-gray-50"
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{g.name}</span>
                                            {g.groupCategory && <span className="block truncate text-xs text-muted-foreground">{g.groupCategory}</span>}
                                        </span>
                                        {g.side && <span className={cn("rounded px-1.5 text-[10px] font-semibold uppercase", SIDE_STYLE[g.side])}>{g.side[0]}</span>}
                                        <span className={cn("w-6 text-right text-xs tabular-nums", g.rsvpStatus === "pending" ? "text-muted-foreground" : "font-semibold")} title={g.rsvpStatus === "pending" ? "Hasn't replied yet" : "Confirmed"}>
                                            {seats(g)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>

                    {/* Tables */}
                    <div className="min-w-0 flex-1 space-y-3">
                        {pickedGuest && (
                            <p className="rounded-xl bg-primary/10 px-4 py-2 text-sm print:hidden">
                                Tap a table to seat <b>{pickedGuest.name}</b> ({seats(pickedGuest)}).{" "}
                                <button onClick={() => setPicked(null)} className="font-medium underline">Cancel</button>
                            </p>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
                            {tables.map((t) => {
                                const seated = byTable.get(t.name) ?? [];
                                const used = seated.reduce((n, g) => n + seats(g), 0);
                                const over = used > t.capacity;
                                const fits = pickedGuest ? used + seats(pickedGuest) <= t.capacity : true;
                                return (
                                    <section
                                        key={t.id}
                                        onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragOver(t.id); } }}
                                        onDragLeave={() => setDragOver((d) => (d === t.id ? null : d))}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOver(null);
                                            const id = e.dataTransfer.getData("text/guest");
                                            if (id) seat(id, t.name);
                                        }}
                                        onClick={() => pickedGuest && seat(pickedGuest.id, t.name)}
                                        className={cn(
                                            "break-inside-avoid rounded-2xl border-2 bg-white p-3 transition-colors",
                                            dragOver === t.id ? "border-primary bg-primary/5" : over ? "border-rose-300" : "border-border",
                                            pickedGuest && "cursor-pointer hover:border-primary",
                                            pickedGuest && !fits && "opacity-60"
                                        )}
                                        aria-label={`${t.name}, ${used} of ${t.capacity} seats`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {canEdit ? (
                                                <InlineText value={t.name} onSave={(name) => saveTable(t, { name })} label="Table name" className="min-w-0 flex-1 font-semibold" />
                                            ) : (
                                                <span className="flex-1 font-semibold">{t.name}</span>
                                            )}
                                            <span className={cn("text-sm tabular-nums", over ? "font-semibold text-rose-700" : "text-muted-foreground")}>
                                                {used}/
                                                {canEdit ? (
                                                    <InlineText value={String(t.capacity)} onSave={(v) => Number(v) > 0 && saveTable(t, { capacity: Math.round(Number(v)) })} label="Seats" className="w-7 text-center" numeric />
                                                ) : t.capacity}
                                            </span>
                                            {canEdit && (
                                                <button onClick={(e) => { e.stopPropagation(); removeTable(t); }} className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700 print:hidden" aria-label={`Remove ${t.name}`}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                            <div className={cn("h-full rounded-full", over ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min(100, (used / Math.max(1, t.capacity)) * 100)}%` }} />
                                        </div>
                                        <ul className="mt-2 min-h-10 space-y-0.5">
                                            {seated.map((g) => (
                                                <li
                                                    key={g.id}
                                                    draggable={canEdit}
                                                    onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/guest", g.id); }}
                                                    className="group flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-gray-50"
                                                >
                                                    <span className={cn("min-w-0 flex-1 truncate", g.rsvpStatus === "pending" && "text-muted-foreground italic")}>{g.name}</span>
                                                    <span className="text-xs tabular-nums text-muted-foreground">{seats(g)}</span>
                                                    {canEdit && (
                                                        <button onClick={(e) => { e.stopPropagation(); seat(g.id, null); }} className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-rose-700 group-hover:opacity-100 focus:opacity-100 print:hidden" aria-label={`Unseat ${g.name}`}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                            {seated.length === 0 && <li className="px-1.5 py-2 text-xs text-muted-foreground print:hidden">Drop households here</li>}
                                        </ul>
                                    </section>
                                );
                            })}
                            {canEdit && (
                                <button onClick={() => addTables(1, tables[tables.length - 1]?.capacity ?? 10)} className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground print:hidden">
                                    <Plus className="h-4 w-4" /> Add a table
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground print:hidden">Grey italic names haven&apos;t replied yet. Numbers are seats: what they confirmed, or everyone invited until they reply.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function InlineText({ value, onSave, label, className, numeric }: { value: string; onSave: (v: string) => void; label: string; className?: string; numeric?: boolean }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    return (
        <input
            value={draft}
            onChange={(e) => setDraft(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => (draft.trim() && draft.trim() !== value ? onSave(draft.trim()) : setDraft(value))}
            onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setDraft(value); e.currentTarget.blur(); }
            }}
            inputMode={numeric ? "numeric" : undefined}
            aria-label={label}
            className={cn("rounded border border-transparent bg-transparent px-1 hover:border-border focus:border-primary focus:bg-white focus:outline-none", className)}
        />
    );
}
