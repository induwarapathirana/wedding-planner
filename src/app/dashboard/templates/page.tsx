"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Copy, LayoutTemplate, ListChecks, Trash2, Wallet } from "lucide-react";
import {
    applyPlannerTemplate,
    deletePlannerTemplate,
    getMyPlan,
    getPlannerTemplates,
    getUserWeddings,
    renamePlannerTemplate,
    saveAsTemplate,
} from "@/app/actions/data";
import { KIND_LABELS, describeTemplate, type TemplateKind } from "@/lib/planner-templates";
import { cn } from "@/lib/utils";
import { UpgradeCard } from "@/components/dashboard/PlanBanner";

type Template = Awaited<ReturnType<typeof getPlannerTemplates>>[number];
type Wedding = Awaited<ReturnType<typeof getUserWeddings>>[number];

const KINDS: { kind: TemplateKind; icon: typeof ListChecks; hint: string }[] = [
    { kind: "checklist", icon: ListChecks, hint: "Tasks with due dates counted back from the wedding" },
    { kind: "budget", icon: Wallet, hint: "Categories as a share of the total, with your usual line items" },
    { kind: "dayOf", icon: CalendarClock, hint: "Slots and lengths, starting from your usual time" },
];

const coupleOf = (w: Wedding) => [w.coupleName1, w.coupleName2].filter(Boolean).join(" & ");

/** A planner's own checklists, budgets and runs of show, saved from a wedding and reused on the next. */
export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [weddings, setWeddings] = useState<Wedding[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState<{ weddingId: string; kind: TemplateKind; name: string }>({ weddingId: "", kind: "checklist", name: "" });
    const [saving, setSaving] = useState(false);
    const [isPro, setIsPro] = useState(true);

    const load = useCallback(async () => {
        const [list, ws, plan] = await Promise.all([getPlannerTemplates(), getUserWeddings(), getMyPlan()]);
        setIsPro(!!plan?.isPro);
        setTemplates(list);
        setWeddings(ws);
        setDraft((d) => ({ ...d, weddingId: d.weddingId || ws[0]?.id || "" }));
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.weddingId) return;
        setSaving(true);
        try {
            const created = await saveAsTemplate(draft.weddingId, { kind: draft.kind, name: draft.name || `${KIND_LABELS[draft.kind]} from ${coupleOf(weddings.find((w) => w.id === draft.weddingId)!)}` }, new Date().getTimezoneOffset());
            setTemplates((list) => [created, ...list]);
            setDraft((d) => ({ ...d, name: "" }));
            toast.success(`Saved "${created.name}"`, { description: describeTemplate(created.kind, created.items) });
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const rename = async (t: Template, name: string) => {
        if (!name.trim() || name === t.name) return;
        setTemplates((list) => list.map((x) => (x.id === t.id ? { ...x, name } : x)));
        try {
            await renamePlannerTemplate(t.id, name);
        } catch (err) {
            setTemplates((list) => list.map((x) => (x.id === t.id ? t : x)));
            toast.error((err as Error).message);
        }
    };

    const remove = async (t: Template) => {
        if (!confirm(`Delete "${t.name}"? Weddings already set up with it keep their tasks.`)) return;
        setTemplates((list) => list.filter((x) => x.id !== t.id));
        try {
            await deletePlannerTemplate(t.id);
        } catch (err) {
            setTemplates((list) => [t, ...list]);
            toast.error((err as Error).message);
        }
    };

    const apply = async (t: Template, weddingId: string) => {
        const w = weddings.find((x) => x.id === weddingId);
        if (!w) return;
        try {
            const { added } = await applyPlannerTemplate(weddingId, t.id, { tzOffsetMinutes: new Date().getTimezoneOffset() });
            toast.success(added ? `Added ${added} ${t.kind === "budget" ? "categories" : t.kind === "dayOf" ? "slots" : "tasks"} to ${coupleOf(w)}` : `${coupleOf(w)} already has everything in "${t.name}"`);
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-40 rounded-2xl border border-border bg-white" /></div>;
    }

    return (
        <div className="space-y-6 pb-6">
            <div>
                <h1 className="font-serif text-3xl font-bold">Templates</h1>
                <p className="text-sm text-muted-foreground">Save how you plan once, then set up every new client in one step. New workspaces use your newest template of each kind.</p>
            </div>

            {!isPro && (
                <UpgradeCard
                    feature="Your own templates"
                    detail="Save how you plan once and set up every new client in one step. Templates you've already saved are kept and come back when you upgrade."
                />
            )}

            {isPro && <form onSubmit={save} className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">Save a template from a wedding</p>
                {weddings.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Once you have a client wedding set up the way you like, save its checklist, budget or run of show here.</p>
                ) : (
                    <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Wedding</span>
                            <select value={draft.weddingId} onChange={(e) => setDraft((d) => ({ ...d, weddingId: e.target.value }))} className="rounded-lg border border-border bg-white px-3 py-2">
                                {weddings.map((w) => <option key={w.id} value={w.id}>{coupleOf(w)}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">What to save</span>
                            <select value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as TemplateKind }))} className="rounded-lg border border-border bg-white px-3 py-2">
                                {KINDS.map((k) => <option key={k.kind} value={k.kind}>{KIND_LABELS[k.kind]}</option>)}
                            </select>
                        </label>
                        <label className="flex min-w-48 flex-1 flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Name</span>
                            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Kandyan wedding, 300 guests" className="rounded-lg border border-border px-3 py-2" />
                        </label>
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">
                            <Copy className="h-4 w-4" /> {saving ? "Saving…" : "Save template"}
                        </button>
                    </div>
                )}
            </form>}

            {templates.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-12 text-center">
                    <LayoutTemplate className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">No templates yet</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Until you save your own, new workspaces start from the standard checklist, budget split and run of show.</p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                    {KINDS.map(({ kind, icon: Icon, hint }) => {
                        const own = templates.filter((t) => t.kind === kind);
                        return (
                            <section key={kind} className="rounded-2xl border border-border bg-white p-4">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="font-semibold">{KIND_LABELS[kind]}</h2>
                                    <span className="text-xs text-muted-foreground">{own.length}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{hint}</p>
                                <ul className="mt-3 space-y-2">
                                    {own.length === 0 && <li className="text-sm text-muted-foreground">None yet</li>}
                                    {own.map((t, i) => (
                                        <li key={t.id} className={cn("rounded-xl border p-3", i === 0 ? "border-primary/40 bg-primary/5" : "border-border")}>
                                            <div className="flex items-start gap-2">
                                                <input
                                                    defaultValue={t.name}
                                                    onBlur={(e) => rename(t, e.target.value.trim())}
                                                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                                                    aria-label="Template name"
                                                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 font-medium hover:border-border focus:border-primary focus:bg-white focus:outline-none"
                                                />
                                                <button onClick={() => remove(t)} className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${t.name}`}>
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="px-1 text-xs text-muted-foreground">
                                                {describeTemplate(t.kind, t.items)}
                                                {i === 0 && " · used for new workspaces"}
                                            </p>
                                            {isPro && weddings.length > 0 && (
                                                <select value="" onChange={(e) => e.target.value && apply(t, e.target.value)} aria-label={`Add ${t.name} to a wedding`} className="mt-2 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs">
                                                    <option value="">Add to a wedding…</option>
                                                    {weddings.map((w) => <option key={w.id} value={w.id}>{coupleOf(w)}</option>)}
                                                </select>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
