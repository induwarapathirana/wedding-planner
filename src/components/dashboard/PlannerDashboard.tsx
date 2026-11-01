"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Calendar, CheckSquare, FolderOpen, MapPin, Plus, Sparkles, TrendingUp, UserPlus, Users } from "lucide-react";
import { createClient, getClients, getPlannerWorkspaces } from "@/app/actions/data";
import { StartPlanningDialog } from "@/components/dashboard/clients/StartPlanningDialog";
import { AddClientModal } from "@/components/dashboard/clients/AddClientModal";
import { withWedding } from "@/lib/current-wedding";
import { cn } from "@/lib/utils";

type Workspace = Awaited<ReturnType<typeof getPlannerWorkspaces>>[number];
type Client = Awaited<ReturnType<typeof getClients>>[number];

const OPEN_LEAD = new Set(["lead", "contacted", "proposal"]);
const today = () => new Date().toISOString().slice(0, 10);
const nameOf = (c: Client) => c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed client";

/** Planner home: every wedding they work on, plus the leads waiting to be turned into one. */
export function PlannerDashboard() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [starting, setStarting] = useState<Client | null>(null);

    const load = useCallback(async () => {
        const [ws, cs] = await Promise.all([getPlannerWorkspaces(), getClients()]);
        setWorkspaces(ws);
        setClients(cs);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const addToClients = async (w: Workspace) => {
        try {
            await createClient({ name: w.couple, weddingDate: w.weddingDate, location: w.location, status: "active", weddingId: w.id });
            toast.success(`${w.couple} added to your clients`);
            load();
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const upcoming = workspaces
        .filter((w) => !w.weddingDate || w.weddingDate >= today())
        .sort((a, b) => (a.weddingDate ?? "9999").localeCompare(b.weddingDate ?? "9999"));
    const past = workspaces.filter((w) => w.weddingDate && w.weddingDate < today()).sort((a, b) => b.weddingDate!.localeCompare(a.weddingDate!));
    const leads = clients.filter((c) => OPEN_LEAD.has(c.status) && !c.weddingId);
    const next30 = upcoming.filter((w) => w.weddingDate && new Date(w.weddingDate).getTime() - Date.now() < 30 * 86_400_000).length;

    return (
        <div className="space-y-8">
            <AddClientModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSuccess={load} />
            {starting && (
                <StartPlanningDialog
                    client={{ id: starting.id, name: nameOf(starting), weddingDate: starting.weddingDate ? new Date(starting.weddingDate).toISOString().slice(0, 10) : null }}
                    onClose={() => setStarting(null)}
                />
            )}

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Your weddings</h1>
                    <p className="mt-1 text-muted-foreground">Every wedding you plan or help with, and the leads waiting on you.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/calendar" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <Calendar className="h-4 w-4" /> Calendar
                    </Link>
                    <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-gray-800">
                        <Plus className="h-4 w-4" /> Add client
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                    { label: "Weddings in progress", value: upcoming.length, icon: Sparkles, tone: "bg-purple-50 text-purple-600" },
                    { label: "In the next 30 days", value: next30, icon: Calendar, tone: "bg-emerald-50 text-emerald-600" },
                    { label: "Open leads", value: leads.length, icon: TrendingUp, tone: "bg-blue-50 text-blue-600", href: "/dashboard/clients" },
                ].map((s) => {
                    const body = (
                        <>
                            <div className="mb-3 flex items-center justify-between">
                                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", s.tone)}><s.icon className="h-5 w-5" /></span>
                                <span className="text-2xl font-bold text-gray-900">{loading ? "–" : s.value}</span>
                            </div>
                            <p className="font-medium text-gray-900">{s.label}</p>
                        </>
                    );
                    return s.href ? (
                        <Link key={s.label} href={s.href} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md">{body}</Link>
                    ) : (
                        <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">{body}</div>
                    );
                })}
            </div>

            <section className="space-y-3">
                <h2 className="font-serif text-xl font-bold text-gray-900">Coming up</h2>
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)}</div>
                ) : upcoming.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No weddings yet. Add a client, or turn a lead into a wedding with Start planning.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcoming.map((w) => <WorkspaceCard key={w.id} w={w} onAddToClients={() => addToClients(w)} />)}
                    </div>
                )}
            </section>

            {leads.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-baseline justify-between">
                        <h2 className="font-serif text-xl font-bold text-gray-900">Leads waiting</h2>
                        <Link href="/dashboard/clients" className="text-sm font-medium underline decoration-primary underline-offset-4">Open the pipeline</Link>
                    </div>
                    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
                        {leads.slice(0, 6).map((c) => (
                            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{nameOf(c)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {c.weddingDate ? new Date(c.weddingDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "No date yet"}
                                        {c.location && ` · ${c.location}`}
                                    </p>
                                </div>
                                <button onClick={() => setStarting(c)} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold hover:bg-primary/20">
                                    <Sparkles className="h-3.5 w-3.5" /> Start planning
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {past.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-serif text-xl font-bold text-gray-900">Past weddings</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {past.map((w) => <WorkspaceCard key={w.id} w={w} onAddToClients={() => addToClients(w)} />)}
                    </div>
                </section>
            )}
        </div>
    );
}

function WorkspaceCard({ w, onAddToClients }: { w: Workspace; onAddToClients: () => void }) {
    const days = w.weddingDate ? Math.ceil((new Date(w.weddingDate).getTime() - Date.now()) / 86_400_000) : null;
    const badge = w.client
        ? { text: "Client", tone: "bg-emerald-50 text-emerald-700" }
        : w.createdByMe
            ? { text: "Your own", tone: "bg-gray-100 text-gray-600" }
            : { text: "Invited", tone: "bg-sky-50 text-sky-700" };
    return (
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900">{w.couple}</h3>
                    <p className="text-sm text-gray-500">
                        {w.weddingDate ? new Date(w.weddingDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "No date yet"}
                        {days !== null && days >= 0 && <span className="font-medium text-gray-700"> · {days === 0 ? "today" : `in ${days}d`}</span>}
                    </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", badge.tone)}>{badge.text}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {w.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{w.location}</span>}
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{w.guests} households</span>
                <span className="inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" />{w.openTasks} open tasks</span>
                {w.role === "viewer" && <span>View only</span>}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3">
                <Link href={withWedding("/dashboard", w.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-sm font-medium hover:bg-primary/20">
                    <FolderOpen className="h-4 w-4" /> Open
                </Link>
                {!w.client && (
                    <button onClick={onAddToClients} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50" title="Track this wedding in your client pipeline">
                        <UserPlus className="h-3.5 w-3.5" /> Add to clients
                    </button>
                )}
            </div>
        </div>
    );
}
