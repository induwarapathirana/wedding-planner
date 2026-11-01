"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Columns3, FolderOpen, Link as LinkIcon, Mail, MapPin, MessageCircle, Phone, Plus, Search, Sparkles, Table2, Users } from "lucide-react";
import { createClient, getClients, getUserIdFromSession, updateClient } from "@/app/actions/data";
import { SheetGrid, toDateInput, type SheetColumn } from "@/components/sheet/SheetGrid";
import { StartPlanningDialog } from "@/components/dashboard/clients/StartPlanningDialog";
import { PlanBanner } from "@/components/dashboard/PlanBanner";
import { waNumber } from "@/components/dashboard/guests/WhatsAppQueue";
import { withWedding } from "@/lib/current-wedding";
import { cn } from "@/lib/utils";

type Client = Awaited<ReturnType<typeof getClients>>[number];

const STAGES = [
    { value: "lead", label: "New inquiry", tone: "bg-amber-100 text-amber-800", bar: "bg-amber-400" },
    { value: "contacted", label: "Contacted", tone: "bg-sky-100 text-sky-800", bar: "bg-sky-400" },
    { value: "proposal", label: "Proposal sent", tone: "bg-violet-100 text-violet-800", bar: "bg-violet-400" },
    { value: "active", label: "Booked", tone: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
    { value: "completed", label: "Completed", tone: "bg-gray-100 text-gray-700", bar: "bg-gray-400" },
    { value: "lost", label: "Lost", tone: "bg-rose-100 text-rose-700", bar: "bg-rose-300" },
] as const;
const OPEN = new Set(["lead", "contacted", "proposal"]);
const DAY = 86_400_000;

const nameOf = (c: Client) => c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed client";
const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (d: Date | string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : null);
const money = (n: unknown) => (Number(n) ? `Rs ${Math.round(Number(n)).toLocaleString()}` : null);

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"board" | "table">("board");
    const [search, setSearch] = useState("");
    const [showLost, setShowLost] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [starting, setStarting] = useState<Client | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);

    const load = useCallback(async () => {
        setClients(await getClients());
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        getUserIdFromSession().then(setUserId);
        try {
            const saved = localStorage.getItem("clients_view");
            if (saved === "table" || saved === "board") setView(saved);
        } catch {}
    }, [load]);

    const switchView = (v: "board" | "table") => {
        setView(v);
        try {
            localStorage.setItem("clients_view", v);
        } catch {}
    };

    const save = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Client | undefined;
        setClients((list) => list.map((c) => (c.id === id ? ((previous = c), { ...c, ...changes, ...(changes.status ? { stageChangedAt: new Date() } : {}) } as Client) : c)));
        try {
            await updateClient(id, changes);
        } catch (e) {
            if (previous) setClients((list) => list.map((c) => (c.id === id ? previous! : c)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const addClient = async () => {
        try {
            const created = await createClient({ name: "New client", status: "lead" });
            setClients((list) => [{ ...created, wedding: null } as Client, ...list]);
            switchView("table");
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const copyInquiryLink = async () => {
        if (!userId) return;
        const link = `${window.location.origin}/inquiry/${userId}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Inquiry form link copied", { description: "Put it on your website, Instagram bio or Facebook page." });
        } catch {
            toast.message("Your inquiry form link", { description: link });
        }
    };

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return clients.filter((c) => !q || [nameOf(c), c.email, c.phone, c.location].some((f) => f?.toLowerCase().includes(q)));
    }, [clients, search]);

    const open = clients.filter((c) => OPEN.has(c.status));
    const decided = clients.filter((c) => c.status === "active" || c.status === "completed" || c.status === "lost");
    const won = decided.filter((c) => c.status !== "lost").length;
    const followUps = open.filter((c) => c.nextFollowUp && toDateInput(c.nextFollowUp) <= today()).length;

    const columns: SheetColumn<Client>[] = [
        { key: "name", label: "Client", type: "text", width: 200, sticky: true, get: nameOf, readOnly: false },
        {
            key: "status", label: "Stage", type: "select", width: 130, summary: true, options: STAGES.map((s) => ({ value: s.value, label: s.label })),
            render: (c) => {
                const s = STAGES.find((x) => x.value === c.status) ?? STAGES[0];
                return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", s.tone)}>{s.label}</span>;
            },
        },
        { key: "weddingDate", label: "Wedding", type: "date", width: 130, summary: true },
        { key: "location", label: "Where", type: "text", width: 140 },
        { key: "guestCount", label: "Guests", type: "number", width: 80, align: "right" },
        { key: "budget", label: "Budget", type: "money", width: 130, align: "right" },
        { key: "phone", label: "Phone", type: "text", width: 140, summary: true },
        { key: "email", label: "Email", type: "text", width: 190 },
        { key: "nextFollowUp", label: "Follow up", type: "date", width: 130 },
        { key: "source", label: "Source", type: "text", width: 90, readOnly: true, get: (c) => (c.source === "inquiry" ? "Form" : c.source === "manual" ? "Added" : "") },
        { key: "notes", label: "Notes", type: "text", width: 260 },
    ];

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-[60vh] rounded-2xl border border-border bg-white" /></div>;
    }

    const stages = STAGES.filter((s) => s.value !== "lost" || showLost);

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold">Clients</h1>
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {open.length} open {open.length === 1 ? "lead" : "leads"}
                        {followUps > 0 && <> · <b className="text-rose-700">{followUps} to follow up</b></>}
                        {" · "}{clients.filter((c) => c.status === "active").length} booked
                        {decided.length > 0 && <> · {Math.round((won / decided.length) * 100)}% won</>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {userId && (
                        <button onClick={copyInquiryLink} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50" title="Share this form so couples can send you an inquiry">
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
                            Inquiry form link
                        </button>
                    )}
                    <button onClick={addClient} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
                        <Plus className="h-4 w-4" /> Add client
                    </button>
                </div>
            </div>

            <PlanBanner />

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Views">
                    {([["board", "Pipeline", Columns3], ["table", "Table", Table2]] as const).map(([value, label, Icon]) => (
                        <button key={value} role="tab" aria-selected={view === value} onClick={() => switchView(value)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium", view === value ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <Icon className="h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
                {view === "board" && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                        Show lost
                    </label>
                )}
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients" aria-label="Search clients" className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Bring in your first leads</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Share your inquiry form link on your website or social pages. Every couple who fills it in lands here as a new inquiry.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <button onClick={copyInquiryLink} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow">Copy my inquiry form link</button>
                        <button onClick={addClient} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium">Add a client myself</button>
                    </div>
                </div>
            ) : view === "table" ? (
                <SheetGrid
                    rows={visible}
                    columns={columns}
                    getRowId={(c) => c.id}
                    onCommit={(row, key, value) => save(row.id, { [key]: value })}
                    onAddRow={addClient}
                    addRowLabel="Add a client"
                    emptyState="No clients match."
                    rowActions={(c) => <RowActions client={c} onStart={() => setStarting(c)} />}
                />
            ) : (
                <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    <div className="flex snap-x gap-3" style={{ minWidth: `${stages.length * 272}px` }}>
                        {stages.map((stage) => {
                            const cards = visible
                                .filter((c) => (c.status === stage.value) || (stage.value === "lead" && !STAGES.some((s) => s.value === c.status)))
                                .sort((a, b) => (toDateInput(a.nextFollowUp) || "9999").localeCompare(toDateInput(b.nextFollowUp) || "9999") || +new Date(b.createdAt) - +new Date(a.createdAt));
                            const value = cards.reduce((n, c) => n + (Number(c.budget) || 0), 0);
                            return (
                                <section
                                    key={stage.value}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(stage.value); }}
                                    onDragLeave={() => setDragOver((d) => (d === stage.value ? null : d))}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragOver(null);
                                        const id = e.dataTransfer.getData("text/client");
                                        const client = clients.find((c) => c.id === id);
                                        if (client && client.status !== stage.value) {
                                            if (stage.value === "active" && !client.weddingId) setStarting(client);
                                            else save(id, { status: stage.value });
                                        }
                                    }}
                                    className={cn("flex w-64 shrink-0 snap-start flex-col rounded-2xl bg-gray-50 p-2 transition-colors", dragOver === stage.value && "bg-primary/10 ring-2 ring-primary")}
                                    aria-label={stage.label}
                                >
                                    <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                                        <span className={cn("h-2 w-2 rounded-full", stage.bar)} />
                                        <h2 className="text-sm font-semibold">{stage.label}</h2>
                                        <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
                                        {value > 0 && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{money(value)}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        {cards.map((c) => (
                                            <ClientCard key={c.id} client={c} onSave={(changes) => save(c.id, changes)} onStart={() => setStarting(c)} />
                                        ))}
                                        {cards.length === 0 && <p className="rounded-xl border-2 border-dashed border-gray-200 px-3 py-6 text-center text-xs text-muted-foreground">Drag clients here</p>}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>
            )}

            {starting && (
                <StartPlanningDialog
                    client={{ id: starting.id, name: nameOf(starting), weddingDate: starting.weddingDate ? toDateInput(starting.weddingDate) : null }}
                    onClose={() => setStarting(null)}
                />
            )}
        </div>
    );
}

function RowActions({ client, onStart }: { client: Client; onStart: () => void }) {
    const wa = waNumber(client.phone);
    return (
        <>
            {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700" aria-label={`WhatsApp ${nameOf(client)}`} title="WhatsApp">
                    <MessageCircle className="h-4 w-4" />
                </a>
            )}
            {client.phone && (
                <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" aria-label={`Call ${nameOf(client)}`} title="Call">
                    <Phone className="h-4 w-4" />
                </a>
            )}
            {client.email && (
                <a href={`mailto:${client.email}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" aria-label={`Email ${nameOf(client)}`} title="Email">
                    <Mail className="h-4 w-4" />
                </a>
            )}
            {client.weddingId ? (
                <Link href={withWedding("/dashboard", client.weddingId)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                    <FolderOpen className="h-3.5 w-3.5" /> Open
                </Link>
            ) : (
                client.status !== "lost" && (
                    <button onClick={onStart} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold hover:bg-primary/20">
                        <Sparkles className="h-3.5 w-3.5" /> Start planning
                    </button>
                )
            )}
        </>
    );
}

function ClientCard({ client, onSave, onStart }: { client: Client; onSave: (changes: Record<string, unknown>) => void; onStart: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const followUp = client.nextFollowUp ? toDateInput(client.nextFollowUp) : "";
    const due = followUp && followUp <= today();
    const inStage = daysSince(client.stageChangedAt ?? client.createdAt);
    const date = client.weddingDate ? toDateInput(client.weddingDate) : "";
    const daysTo = date ? Math.ceil((new Date(date).getTime() - Date.now()) / DAY) : null;
    const isOpen = OPEN.has(client.status);

    return (
        <article
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/client", client.id)}
            className="cursor-grab rounded-xl border border-border bg-white p-3 shadow-sm active:cursor-grabbing"
        >
            <div className="flex items-start gap-2">
                <button onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                    <p className="truncate font-semibold">{nameOf(client)}</p>
                    <p className="text-xs text-muted-foreground">
                        {date ? `${new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}${daysTo !== null && daysTo >= 0 ? ` · in ${daysTo}d` : ""}` : "No date yet"}
                    </p>
                </button>
                {client.source === "inquiry" && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Form</span>}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {client.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{client.location}</span>}
                {client.guestCount ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{client.guestCount}</span> : null}
                {money(client.budget) && <span>{money(client.budget)}</span>}
            </div>

            {isOpen && (followUp || (inStage !== null && inStage >= 3)) && (
                <p className={cn("mt-2 text-xs font-medium", due ? "text-rose-700" : "text-muted-foreground")}>
                    {followUp ? (due ? `Follow up ${followUp === today() ? "today" : "overdue"}` : `Follow up ${new Date(followUp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`) : `${inStage} days in this stage`}
                </p>
            )}

            {expanded && (
                <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                    <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        Follow up on
                        <input type="date" defaultValue={followUp} onChange={(e) => onSave({ nextFollowUp: e.target.value || null })} className="rounded-md border border-border px-2 py-1 text-foreground" />
                    </label>
                    {client.email && <p className="truncate text-xs text-muted-foreground">{client.email}</p>}
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                    <textarea
                        defaultValue={client.notes ?? ""}
                        onBlur={(e) => e.target.value !== (client.notes ?? "") && onSave({ notes: e.target.value })}
                        rows={3}
                        placeholder="Notes"
                        aria-label={`Notes for ${nameOf(client)}`}
                        className="w-full rounded-lg border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            )}

            <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-border pt-2">
                <RowActions client={client} onStart={onStart} />
            </div>
        </article>
    );
}
