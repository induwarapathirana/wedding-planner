"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Download, FileUp, Link as LinkIcon, Search, Trash2, Users } from "lucide-react";
import {
    createGuest,
    createGuests,
    deleteGuest,
    deleteGuests,
    getGuests,
    getWeddingById,
    updateGuest,
    updateGuests,
} from "@/app/actions/data";
import { SheetGrid, type SheetColumn } from "@/components/sheet/SheetGrid";
import { ImportGuestsDialog } from "@/components/dashboard/guests/ImportGuestsDialog";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { downloadCsv } from "@/lib/csv";
import { normalizeGuest, type GuestField } from "@/lib/guest-import";
import { cn } from "@/lib/utils";

type Guest = Awaited<ReturnType<typeof getGuests>>[number];

const SIDES = [
    { value: "bride", label: "Bride" },
    { value: "groom", label: "Groom" },
    { value: "both", label: "Both" },
];
const RSVP = [
    { value: "pending", label: "No reply" },
    { value: "accepted", label: "Attending" },
    { value: "declined", label: "Declined" },
];
const INVITE = [
    { value: "not_sent", label: "Not sent" },
    { value: "sent", label: "Sent" },
];
const MEALS = ["Non-veg", "Veg", "Vegan", "Halal", "Kids"].map((m) => ({ value: m, label: m }));
const LISTS = ["A", "B", "C"].map((l) => ({ value: l, label: l }));

const party = (g: Guest) => 1 + (g.companionGuestCount || 0);
const headcount = (list: Guest[]) => list.reduce((n, g) => n + party(g), 0);

function companions(g: Guest): string[] {
    if (!g.companionNames) return [];
    try {
        const parsed = JSON.parse(g.companionNames);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
        return g.companionNames.split(",").map((s) => s.trim()).filter(Boolean);
    }
}

const VIEWS: { key: string; label: string; match: (g: Guest) => boolean }[] = [
    { key: "all", label: "Everyone", match: () => true },
    { key: "bride", label: "Bride's side", match: (g) => g.side === "bride" || g.side === "both" },
    { key: "groom", label: "Groom's side", match: (g) => g.side === "groom" || g.side === "both" },
    { key: "uninvited", label: "Invite not sent", match: (g) => g.inviteStatus !== "sent" },
    { key: "waiting", label: "No reply yet", match: (g) => g.rsvpStatus === "pending" },
    { key: "unseated", label: "Attending, no table", match: (g) => g.rsvpStatus === "accepted" && !g.tableAssignment },
];

/** Map a grid column key to the guest fields it writes. */
function toChanges(key: string, value: unknown): Record<string, unknown> {
    if (key === "party") return { companionGuestCount: Math.max(0, Math.round(Number(value) || 1) - 1) };
    if (key === "companions") {
        const names = String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        return { companionNames: names.length ? JSON.stringify(names) : null };
    }
    return { [key]: value };
}

export default function GuestsPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [target, setTarget] = useState(0);
    const [view, setView] = useState("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [importOpen, setImportOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (weddingId === undefined) return;
        if (weddingId === null) {
            setLoading(false);
            return;
        }
        Promise.all([getGuests(weddingId), getWeddingById(weddingId)]).then(([list, wedding]) => {
            setGuests(list);
            setTarget(wedding?.targetGuestCount ?? 0);
            setLoading(false);
        });
    }, [weddingId]);

    const visible = useMemo(() => {
        const match = VIEWS.find((v) => v.key === view)?.match ?? (() => true);
        const q = search.trim().toLowerCase();
        return guests.filter(
            (g) =>
                match(g) &&
                (!q ||
                    [g.name, g.groupCategory, g.whatsappNumber, g.email, g.tableAssignment, g.notes]
                        .some((f) => f?.toLowerCase().includes(q)))
        );
    }, [guests, view, search]);

    /** Apply locally first, then save; roll back if the save fails. */
    const saveChanges = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Guest | undefined;
        setGuests((list) =>
            list.map((g) => {
                if (g.id !== id) return g;
                previous = g;
                return { ...g, ...changes } as Guest;
            })
        );
        try {
            const saved = await updateGuest(id, changes);
            setGuests((list) => list.map((g) => (g.id === id ? saved : g)));
        } catch (e) {
            if (previous) setGuests((list) => list.map((g) => (g.id === id ? previous! : g)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const onCommit = useCallback(
        (row: Guest, key: string, value: unknown) => saveChanges(row.id, toChanges(key, value)),
        [saveChanges]
    );

    const addGuest = async () => {
        if (!weddingId) return;
        try {
            const created = await createGuest(weddingId, { name: "New guest" });
            setView("all");
            setSearch("");
            setGuests((list) => [created, ...list]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const addMany = async (records: NonNullable<ReturnType<typeof normalizeGuest>>[]) => {
        if (!weddingId || records.length === 0) return;
        const created = await createGuests(weddingId, records);
        setGuests((list) => [...created, ...list]);
        setView("all");
        toast.success(`Added ${created.length} ${created.length === 1 ? "household" : "households"}`);
    };

    const onPasteRows = async (rows: Record<string, string>[]) => {
        const records = rows
            .map((r) => {
                const raw = { ...r } as Partial<Record<GuestField, string>>;
                if (r.companions) raw.companionNames = r.companions;
                return normalizeGuest(raw);
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);
        if (!records.length) {
            toast.error("Paste rows that start with a name in the first column");
            return;
        }
        try {
            await addMany(records);
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const bulk = async (changes: Record<string, unknown>, label: string) => {
        const ids = [...selected];
        const before = guests;
        setGuests((list) => list.map((g) => (selected.has(g.id) ? ({ ...g, ...changes } as Guest) : g)));
        try {
            await updateGuests(ids, changes);
            toast.success(`${label} for ${ids.length} ${ids.length === 1 ? "household" : "households"}`);
        } catch (e) {
            setGuests(before);
            toast.error((e as Error).message);
        }
    };

    const removeSelected = async () => {
        const ids = [...selected];
        const removed = guests.filter((g) => selected.has(g.id));
        setGuests((list) => list.filter((g) => !selected.has(g.id)));
        setSelected(new Set());
        try {
            await deleteGuests(ids);
            toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "household" : "households"}`, {
                action: { label: "Undo", onClick: () => addMany(removed.map(toRecord)) },
            });
        } catch (e) {
            setGuests((list) => [...removed, ...list]);
            toast.error((e as Error).message);
        }
    };

    const removeOne = async (g: Guest) => {
        setGuests((list) => list.filter((x) => x.id !== g.id));
        try {
            await deleteGuest(g.id);
            toast.success(`Deleted ${g.name}`, { action: { label: "Undo", onClick: () => addMany([toRecord(g)]) } });
        } catch (e) {
            setGuests((list) => [g, ...list]);
            toast.error((e as Error).message);
        }
    };

    const copyLink = async (g: Guest) => {
        const link = `${window.location.origin}/invitation/${g.id}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedId(g.id);
            setTimeout(() => setCopiedId((id) => (id === g.id ? null : id)), 2000);
            toast.success(`RSVP link for ${g.name} copied`);
        } catch {
            toast.message("Copy this RSVP link", { description: link });
        }
    };

    const exportCsv = () =>
        downloadCsv(
            `guest-list-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Name", "Side", "Group", "Party", "WhatsApp", "Email", "Address", "Invite", "RSVP", "Meal", "Table", "List", "Companions", "Notes"],
            visible.map((g) => [
                g.name, g.side, g.groupCategory, party(g), g.whatsappNumber, g.email, g.address,
                g.inviteStatus === "sent" ? "Sent" : "Not sent", RSVP.find((r) => r.value === g.rsvpStatus)?.label,
                g.mealPreference, g.tableAssignment, g.priority, companions(g).join("; "), g.notes,
            ])
        );

    const columns: SheetColumn<Guest>[] = [
        { key: "name", label: "Household", type: "text", width: 220, sticky: true, placeholder: "Name" },
        { key: "side", label: "Side", type: "select", options: SIDES, width: 90 },
        { key: "groupCategory", label: "Group", type: "text", width: 130 },
        { key: "party", label: "Party", type: "number", width: 70, align: "right", get: party, readOnly: false },
        { key: "whatsappNumber", label: "WhatsApp", type: "text", width: 150 },
        {
            key: "inviteStatus", label: "Invite", type: "select", options: INVITE, width: 100,
            render: (g) => (
                <span className={cn("text-xs font-medium", g.inviteStatus === "sent" ? "text-emerald-700" : "text-muted-foreground")}>
                    {g.inviteStatus === "sent" ? "Sent" : "Not sent"}
                </span>
            ),
        },
        {
            key: "rsvpStatus", label: "RSVP", type: "select", options: RSVP, width: 110,
            render: (g) => (
                <span
                    className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                        g.rsvpStatus === "accepted" && "bg-emerald-100 text-emerald-800",
                        g.rsvpStatus === "declined" && "bg-rose-100 text-rose-800",
                        g.rsvpStatus === "pending" && "bg-amber-100 text-amber-800"
                    )}
                >
                    {RSVP.find((r) => r.value === g.rsvpStatus)?.label ?? g.rsvpStatus}
                </span>
            ),
        },
        { key: "mealPreference", label: "Meal", type: "select", options: MEALS, width: 100 },
        { key: "tableAssignment", label: "Table", type: "text", width: 70 },
        {
            key: "priority", label: "List", type: "select", options: LISTS, width: 60, align: "center",
            render: (g) => (
                <span className={cn("inline-grid h-6 w-6 place-items-center rounded-md border text-xs font-bold", g.priority === "A" ? "border-primary bg-primary/15" : "border-border")}>
                    {g.priority}
                </span>
            ),
        },
        { key: "companions", label: "Companions", type: "text", width: 180, get: (g) => companions(g).join(", "), readOnly: false, placeholder: "Names, comma separated" },
        { key: "email", label: "Email", type: "text", width: 180 },
        { key: "address", label: "Address", type: "text", width: 220 },
        { key: "notes", label: "Notes", type: "text", width: 200 },
    ];

    const attending = guests.filter((g) => g.rsvpStatus === "accepted");
    const stats = {
        households: guests.length,
        guests: headcount(guests),
        attending: headcount(attending),
        waiting: headcount(guests.filter((g) => g.rsvpStatus === "pending")),
        declined: headcount(guests.filter((g) => g.rsvpStatus === "declined")),
        veg: headcount(attending.filter((g) => g.mealPreference === "Veg" || g.mealPreference === "Vegan")),
        halal: headcount(attending.filter((g) => g.mealPreference === "Halal")),
        unseated: attending.filter((g) => !g.tableAssignment).length,
    };

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
                    <h1 className="font-serif text-3xl font-bold">Guests</h1>
                    <p className="text-sm text-muted-foreground">
                        {stats.households} households · {stats.guests} guests{target ? ` of ${target} planned` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canEdit && (
                        <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                            <FileUp className="h-4 w-4" /> Import
                        </button>
                    )}
                    <button onClick={exportCsv} disabled={!visible.length} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
                        <Download className="h-4 w-4" /> Export
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Views">
                    {VIEWS.map((v) => (
                        <button
                            key={v.key}
                            role="tab"
                            aria-selected={view === v.key}
                            onClick={() => setView(v.key)}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                view === v.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {v.label}
                            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{guests.filter(v.match).length}</span>
                        </button>
                    ))}
                </div>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search guests"
                        aria-label="Search guests"
                        className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            </div>

            {selected.size > 0 && canEdit && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
                    <span className="font-semibold">{selected.size} selected</span>
                    <span className="text-muted-foreground">Set:</span>
                    <select
                        aria-label="Set RSVP for selected"
                        value=""
                        onChange={(e) => e.target.value && bulk({ rsvpStatus: e.target.value }, "RSVP updated")}
                        className="rounded-lg border border-border bg-white px-2 py-1"
                    >
                        <option value="">RSVP…</option>
                        {RSVP.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select
                        aria-label="Set side for selected"
                        value=""
                        onChange={(e) => e.target.value && bulk({ side: e.target.value }, "Side updated")}
                        className="rounded-lg border border-border bg-white px-2 py-1"
                    >
                        <option value="">Side…</option>
                        {SIDES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <TableInput onSet={(table) => bulk({ tableAssignment: table }, `Table ${table} set`)} />
                    <button onClick={() => bulk({ inviteStatus: "sent" }, "Marked as invited")} className="rounded-lg border border-border bg-white px-3 py-1 font-medium hover:bg-gray-50">
                        Mark invited
                    </button>
                    <button onClick={removeSelected} className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1 font-medium text-rose-700 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            )}

            {guests.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Bring your guest list in</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        Import the sheet you already have, or start typing. Each row is a household: the main guest plus anyone coming with them.
                    </p>
                    {canEdit && (
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button onClick={() => setImportOpen(true)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow">Import from Excel or Sheets</button>
                            <button onClick={addGuest} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium">Add the first guest</button>
                        </div>
                    )}
                </div>
            ) : (
                <SheetGrid
                    rows={visible}
                    columns={columns}
                    getRowId={(g) => g.id}
                    onCommit={onCommit}
                    readOnly={!canEdit}
                    onAddRow={canEdit ? addGuest : undefined}
                    addRowLabel="Add a household"
                    onPasteRows={canEdit ? onPasteRows : undefined}
                    selectedIds={canEdit ? selected : undefined}
                    onSelectionChange={canEdit ? setSelected : undefined}
                    emptyState="No guests match this view."
                    rowActions={(g) => (
                        <>
                            <button onClick={() => copyLink(g)} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" title="Copy RSVP link" aria-label={`Copy RSVP link for ${g.name}`}>
                                {copiedId === g.id ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
                            </button>
                            {canEdit && (
                                <button onClick={() => removeOne(g)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" title="Delete" aria-label={`Delete ${g.name}`}>
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </>
                    )}
                />
            )}

            {guests.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-gray-50 px-4 py-3 text-sm text-muted-foreground tabular-nums">
                    <span><b className="text-foreground">{stats.attending}</b> attending</span>
                    <span><b className="text-foreground">{stats.waiting}</b> waiting</span>
                    <span><b className="text-foreground">{stats.declined}</b> declined</span>
                    <span>Meals: <b className="text-foreground">{stats.veg}</b> veg · <b className="text-foreground">{stats.halal}</b> halal</span>
                    <span><b className="text-foreground">{stats.unseated}</b> attending households without a table</span>
                    {canEdit && <span className="ml-auto hidden md:inline">Tip: paste rows from Excel straight into the sheet</span>}
                </div>
            )}

            <ImportGuestsDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={addMany} />
        </div>
    );
}

/** Rebuild a create payload from a deleted guest, for Undo. */
function toRecord(g: Guest) {
    return {
        name: g.name,
        side: (g.side as "bride" | "groom" | "both" | null) ?? null,
        groupCategory: g.groupCategory,
        companionGuestCount: g.companionGuestCount,
        companionNames: g.companionNames,
        whatsappNumber: g.whatsappNumber,
        email: g.email,
        address: g.address,
        rsvpStatus: g.rsvpStatus as "pending" | "accepted" | "declined",
        mealPreference: g.mealPreference,
        tableAssignment: g.tableAssignment,
        priority: g.priority as "A" | "B" | "C",
        notes: g.notes,
    };
}

function TableInput({ onSet }: { onSet: (table: string) => void }) {
    const [value, setValue] = useState("");
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) {
                    onSet(value.trim());
                    setValue("");
                }
            }}
            className="flex items-center gap-1"
        >
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Table…"
                aria-label="Set table for selected"
                className="w-20 rounded-lg border border-border bg-white px-2 py-1"
            />
        </form>
    );
}
