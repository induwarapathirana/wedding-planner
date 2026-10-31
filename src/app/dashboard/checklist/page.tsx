"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ListChecks, Sparkles, Trash2 } from "lucide-react";
import {
    applyTemplate,
    createChecklistItem,
    deleteChecklistItem,
    deleteChecklistItems,
    getChecklistItems,
    updateChecklistItem,
} from "@/app/actions/data";
import { SheetGrid, toDateInput, type SheetColumn, type SheetGroup } from "@/components/sheet/SheetGrid";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { cn } from "@/lib/utils";

type Task = Awaited<ReturnType<typeof getChecklistItems>>[number];

/** Same order the template and the old checklist used. */
const TIMEFRAMES = [
    "12+ Months Out",
    "9-12 Months Out",
    "6-9 Months Out",
    "4-6 Months Out",
    "2-4 Months Out",
    "1 Month Out",
    "Final Week",
    "Wedding Day",
];
const OTHER = "Anytime";

const today = () => toDateInput(new Date());
const isOverdue = (t: Task) => !t.isCompleted && !!t.dueDate && toDateInput(t.dueDate) < today();

const VIEWS: { key: string; label: string; match: (t: Task) => boolean }[] = [
    { key: "todo", label: "To do", match: (t) => !t.isCompleted },
    { key: "overdue", label: "Overdue", match: isOverdue },
    { key: "all", label: "Everything", match: () => true },
    { key: "done", label: "Done", match: (t) => t.isCompleted },
];

/** A hand-picked due date replaces the template's "days before the wedding". */
function toChanges(key: string, value: unknown): Record<string, unknown> {
    if (key === "dueDate") return { dueDate: value, dueOffsetDays: null };
    return { [key]: value };
}

export default function ChecklistPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("todo");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async (id: string) => {
        setTasks(await getChecklistItems(id));
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

    const visible = useMemo(() => tasks.filter(VIEWS.find((v) => v.key === view)?.match ?? (() => true)), [tasks, view]);

    const timeframes = useMemo(() => {
        const used = new Set(tasks.map((t) => t.category || OTHER));
        const extra = [...used].filter((c) => !TIMEFRAMES.includes(c) && c !== OTHER);
        return [...TIMEFRAMES, ...extra, OTHER];
    }, [tasks]);

    const groupBy = useCallback(
        (rows: Task[]): SheetGroup<Task>[] =>
            timeframes
                .map((name) => ({ key: name, label: name, rows: rows.filter((t) => (t.category || OTHER) === name) }))
                // Keep empty timeframes out of the way except where tasks usually go
                .filter(
                    (g) =>
                        g.rows.length > 0 ||
                        (view === "all" && TIMEFRAMES.includes(g.key)) ||
                        // Always leave somewhere to add a task
                        (rows.length === 0 && g.key === OTHER)
                ),
        [timeframes, view]
    );

    const save = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Task | undefined;
        setTasks((list) =>
            list.map((t) => {
                if (t.id !== id) return t;
                previous = t;
                return { ...t, ...changes } as Task;
            })
        );
        try {
            const saved = await updateChecklistItem(id, changes);
            setTasks((list) => list.map((t) => (t.id === id ? saved : t)));
        } catch (e) {
            if (previous) setTasks((list) => list.map((t) => (t.id === id ? previous! : t)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const onCommit = useCallback((row: Task, key: string, value: unknown) => save(row.id, toChanges(key, value)), [save]);

    const addTask = useCallback(
        async (timeframe?: string) => {
            if (!weddingId) return;
            try {
                const created = await createChecklistItem(weddingId, {
                    title: "New task",
                    category: timeframe && timeframe !== OTHER ? timeframe : null,
                });
                if (view === "done" || view === "overdue") setView("todo");
                setTasks((list) => [...list, created]);
                return created.id;
            } catch (e) {
                toast.error((e as Error).message);
            }
        },
        [weddingId, view]
    );

    // "+ Add to Checklist" from the dashboard links here with ?new=true
    useEffect(() => {
        if (loading || !canEdit || !weddingId) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("new") === "true") {
            params.delete("new");
            window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
            addTask();
        }
    }, [loading, canEdit, weddingId, addTask]);

    const removeOne = async (t: Task) => {
        setTasks((list) => list.filter((x) => x.id !== t.id));
        try {
            await deleteChecklistItem(t.id);
            toast.success(`Deleted "${t.title}"`);
        } catch (e) {
            setTasks((list) => [...list, t]);
            toast.error((e as Error).message);
        }
    };

    const bulkComplete = async (done: boolean) => {
        const ids = [...selected];
        await Promise.all(ids.map((id) => save(id, { isCompleted: done })));
        setSelected(new Set());
        toast.success(`${ids.length} ${ids.length === 1 ? "task" : "tasks"} marked ${done ? "done" : "to do"}`);
    };

    const removeSelected = async () => {
        const ids = [...selected];
        const removed = tasks.filter((t) => selected.has(t.id));
        setTasks((list) => list.filter((t) => !selected.has(t.id)));
        setSelected(new Set());
        try {
            await deleteChecklistItems(ids);
            toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "task" : "tasks"}`);
        } catch (e) {
            setTasks((list) => [...list, ...removed]);
            toast.error((e as Error).message);
        }
    };

    const useTemplate = async () => {
        if (!weddingId) return;
        setSeeding(true);
        try {
            const { added } = await applyTemplate(weddingId, "checklist");
            await load(weddingId);
            setView("todo");
            toast.success(added ? `Added ${added} tasks` : "You already have these tasks");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSeeding(false);
        }
    };

    const done = tasks.filter((t) => t.isCompleted).length;
    const overdue = tasks.filter(isOverdue).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

    const columns: SheetColumn<Task>[] = [
        { key: "isCompleted", label: "Done", type: "checkbox", width: 60, align: "center", summary: true },
        {
            key: "title", label: "Task", type: "text", width: 320, sticky: true,
            render: (t) => <span className={cn(t.isCompleted && "text-muted-foreground line-through")}>{t.title}</span>,
        },
        {
            key: "dueDate", label: "Due", type: "date", width: 130, summary: true,
            render: (t) =>
                t.dueDate ? (
                    <span className={cn(isOverdue(t) && "font-semibold text-rose-700")}>
                        {new Date(toDateInput(t.dueDate) + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        {isOverdue(t) && " · overdue"}
                    </span>
                ) : (
                    <span className="text-muted-foreground/60">—</span>
                ),
        },
        { key: "category", label: "Timeframe", type: "select", options: TIMEFRAMES.map((t) => ({ value: t, label: t })), width: 150 },
        { key: "notes", label: "Notes", type: "text", width: 280 },
    ];

    const renderGroupHeader = (group: SheetGroup<Task>) => {
        const all = tasks.filter((t) => (t.category || OTHER) === group.key);
        const finished = all.filter((t) => t.isCompleted).length;
        return (
            <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{group.label}</span>
                <span className="text-muted-foreground tabular-nums">{finished}/{all.length} done</span>
            </div>
        );
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
                    <h1 className="font-serif text-3xl font-bold">Checklist</h1>
                    <p className="text-sm text-muted-foreground">
                        {done} of {tasks.length} done{overdue ? ` · ${overdue} overdue` : ""}
                    </p>
                </div>
                {tasks.length > 0 && (
                    <div className="w-full max-w-xs">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{pct}% complete</p>
                    </div>
                )}
            </div>

            {tasks.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <ListChecks className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Start from a checklist</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        About 30 tasks, from booking the venue to final fittings, dated back from your wedding day. Remove what you don't need.
                    </p>
                    {canEdit && (
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button onClick={useTemplate} disabled={seeding} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">
                                <Sparkles className="h-4 w-4" /> {seeding ? "Adding…" : "Add the starter checklist"}
                            </button>
                            <button onClick={() => addTask()} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium">Write my own</button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 w-fit" role="tablist" aria-label="Views">
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
                                <span className={cn("ml-1.5 text-xs tabular-nums", v.key === "overdue" && overdue ? "text-rose-700" : "text-muted-foreground")}>
                                    {tasks.filter(v.match).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {selected.size > 0 && canEdit && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
                            <span className="font-semibold">{selected.size} selected</span>
                            <button onClick={() => bulkComplete(true)} className="rounded-lg border border-border bg-white px-3 py-1 font-medium">Mark done</button>
                            <button onClick={() => bulkComplete(false)} className="rounded-lg border border-border bg-white px-3 py-1 font-medium">Mark to do</button>
                            <button onClick={removeSelected} className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1 font-medium text-rose-700 hover:bg-rose-50">
                                <Trash2 className="h-4 w-4" /> Delete
                            </button>
                        </div>
                    )}

                    <SheetGrid
                        rows={visible}
                        columns={columns}
                        getRowId={(t) => t.id}
                        onCommit={onCommit}
                        readOnly={!canEdit}
                        groupBy={groupBy}
                        renderGroupHeader={renderGroupHeader}
                        onAddRow={canEdit ? addTask : undefined}
                        addRowLabel={(group) => (group && group !== OTHER ? `Add a task for ${group.toLowerCase()}` : "Add a task")}
                        selectedIds={canEdit ? selected : undefined}
                        onSelectionChange={canEdit ? setSelected : undefined}
                        rowActions={(t) =>
                            canEdit ? (
                                <button onClick={() => removeOne(t)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${t.title}`}>
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            ) : null
                        }
                    />
                    {visible.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground">
                            {view === "overdue" ? "Nothing overdue. Nice." : view === "done" ? "Nothing ticked off yet." : "Nothing left to do here."}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
