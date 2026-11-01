"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { getMyPlan, getPlannerTemplates, startClientWedding } from "@/app/actions/data";
import { CURRENCIES } from "@/lib/constants";
import { KIND_LABELS, describeTemplate, type TemplateKind } from "@/lib/planner-templates";
import { withWedding } from "@/lib/current-wedding";

type Template = Awaited<ReturnType<typeof getPlannerTemplates>>[number];

const STANDARD: Record<TemplateKind, string> = {
    checklist: "Standard checklist (about 40 tasks)",
    budget: "Standard budget split (10 categories)",
    dayOf: "Standard run of show (about 10 slots)",
};

/** Turns a lead into a set-up wedding workspace, from the standard starters or the planner's own templates. */
export function StartPlanningDialog({
    client,
    onClose,
}: {
    client: { id: string; name: string; weddingDate: string | null };
    onClose: () => void;
}) {
    const router = useRouter();
    const parts = client.name.split(/ and | & /i);
    const [names, setNames] = useState({ one: parts[0]?.trim() ?? client.name, two: parts[1]?.trim() ?? "" });
    const [currency, setCurrency] = useState("LKR");
    const [ceremonyTime, setCeremonyTime] = useState("");
    const [templates, setTemplates] = useState<Template[]>([]);
    const [choice, setChoice] = useState<Record<TemplateKind, string>>({ checklist: "standard", budget: "standard", dayOf: "standard" });
    const [saving, setSaving] = useState(false);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        Promise.all([getPlannerTemplates(), getMyPlan()]).then(([list, plan]) => {
            setTemplates(list);
            setIsPro(!!plan?.isPro);
            if (!plan?.isPro) return;
            // Prefer the planner's newest template of each kind
            setChoice((c) => {
                const next = { ...c };
                for (const kind of ["checklist", "budget", "dayOf"] as TemplateKind[]) {
                    const own = list.find((t) => t.kind === kind);
                    if (own) next[kind] = own.id;
                }
                return next;
            });
        });
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { weddingId } = await startClientWedding(client.id, {
                coupleName1: names.one,
                coupleName2: names.two,
                currency,
                checklist: choice.checklist,
                budget: choice.budget,
                dayOf: choice.dayOf,
                ceremonyTime: ceremonyTime || undefined,
                tzOffsetMinutes: new Date().getTimezoneOffset(),
            });
            toast.success(`${names.one}${names.two ? ` & ${names.two}` : ""}'s workspace is ready`);
            router.push(withWedding("/dashboard", weddingId));
        } catch (err) {
            toast.error((err as Error).message);
            setSaving(false);
        }
    };

    const field = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
    const usesStandardDayOf = choice.dayOf !== "none";

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="start-title" className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                        <h2 id="start-title" className="font-serif text-2xl font-bold">Start planning</h2>
                        <p className="text-sm text-muted-foreground">Creates the wedding workspace, set up and ready, and moves {client.name} to Booked.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                            Partner 1
                            <input required value={names.one} onChange={(e) => setNames((n) => ({ ...n, one: e.target.value }))} className={field} />
                        </label>
                        <label className="block text-sm font-medium">
                            Partner 2
                            <input value={names.two} onChange={(e) => setNames((n) => ({ ...n, two: e.target.value }))} className={field} />
                        </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                            Currency
                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>
                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </label>
                        {client.weddingDate && usesStandardDayOf && (
                            <label className="block text-sm font-medium">
                                Day starts at
                                <input type="time" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} className={field} />
                                <span className="text-xs font-normal text-muted-foreground">Leave empty to use the template&apos;s time</span>
                            </label>
                        )}
                    </div>

                    <fieldset className="space-y-3">
                        <legend className="text-sm font-medium">Set it up with</legend>
                        {(["checklist", "budget", "dayOf"] as TemplateKind[]).map((kind) => {
                            const own = templates.filter((t) => t.kind === kind);
                            const disabled = kind === "dayOf" && !client.weddingDate;
                            return (
                                <label key={kind} className="block text-sm">
                                    <span className="text-muted-foreground">{KIND_LABELS[kind]}</span>
                                    <select value={disabled ? "none" : choice[kind]} disabled={disabled} onChange={(e) => setChoice((c) => ({ ...c, [kind]: e.target.value }))} className={field}>
                                        {own.length > 0 && (
                                            <optgroup label="My templates">
                                                {own.map((t) => (
                                                    <option key={t.id} value={t.id} disabled={!isPro}>
                                                        {t.name} · {describeTemplate(t.kind, t.items)}{isPro ? "" : " (Planner Pro)"}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        <option value="standard">{STANDARD[kind]}</option>
                                        <option value="none">Nothing, start empty</option>
                                    </select>
                                    {disabled && <span className="text-xs text-muted-foreground">Needs a wedding date on the lead</span>}
                                </label>
                            );
                        })}
                    </fieldset>
                </div>

                <div className="flex justify-end gap-2 border-t border-border p-4">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={saving || !names.one.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50">
                        <Sparkles className="h-4 w-4" /> {saving ? "Setting up…" : "Create workspace"}
                    </button>
                </div>
            </form>
        </div>
    );
}
