"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Check, CheckSquare, Wallet } from "lucide-react";
import { getThisWeek, updateBudgetItem, updateChecklistItem, updatePayment, type WeekItem } from "@/app/actions/data";
import { withWedding } from "@/lib/current-wedding";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);

function when(item: WeekItem) {
    const days = Math.round((new Date(item.date.slice(0, 10)).getTime() - new Date(todayIso()).getTime()) / DAY);
    const time = item.kind === "event" ? ` · ${new Date(item.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "";
    if (days < 0) return { text: days === -1 ? "Yesterday" : `${-days} days overdue`, overdue: true };
    if (days === 0) return { text: `Today${time}`, overdue: false };
    if (days === 1) return { text: `Tomorrow${time}`, overdue: false };
    return { text: new Date(item.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + time, overdue: false };
}

const ICON = { task: CheckSquare, payment: Wallet, budget: Wallet, event: CalendarDays };
const HREF = { task: "/dashboard/checklist", payment: "/dashboard/budget", budget: "/dashboard/budget", event: "/dashboard/itinerary" };

/** Overdue and next-7-days tasks, payments and events, each done in one tap. */
export function ThisWeek({ weddingId, currency, canEdit = true }: { weddingId: string; currency: string; canEdit?: boolean }) {
    const [data, setData] = useState<{ due: WeekItem[]; later: WeekItem[] } | null>(null);

    useEffect(() => {
        getThisWeek(weddingId).then(setData);
    }, [weddingId]);

    const complete = async (item: WeekItem) => {
        const before = data;
        setData((d) => d && { ...d, due: d.due.filter((i) => i.id !== item.id), later: d.later.filter((i) => i.id !== item.id) });
        try {
            if (item.kind === "task") await updateChecklistItem(item.id, { isCompleted: true });
            if (item.kind === "payment") await updatePayment(item.id, { paidAt: todayIso() });
            if (item.kind === "budget") await updateBudgetItem(item.id, { paidAt: todayIso(), paidAmount: item.price });
            toast.success(item.kind === "task" ? `Done: ${item.title}` : `Marked ${item.title} paid`);
        } catch (e) {
            setData(before);
            toast.error((e as Error).message);
        }
    };

    const money = (n: number) => `${currency} ${Math.round(n).toLocaleString()}`;
    const dueTotal = data?.due.reduce((n, i) => n + (i.amount ?? 0), 0) ?? 0;

    const row = (item: WeekItem) => {
        const Icon = ICON[item.kind];
        const w = when(item);
        const doable = canEdit && item.kind !== "event";
        return (
            <li key={`${item.kind}-${item.id}`} className="group flex items-center gap-3 py-2.5">
                {doable ? (
                    <button
                        onClick={() => complete(item)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-border text-transparent hover:border-primary hover:text-primary"
                        aria-label={item.kind === "task" ? `Mark "${item.title}" done` : `Mark ${item.title} paid`}
                        title={item.kind === "task" ? "Mark done" : "Mark paid"}
                    >
                        <Check className="h-4 w-4" />
                    </button>
                ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground"><Icon className="h-4 w-4" /></span>
                )}
                <Link href={withWedding(HREF[item.kind], weddingId)} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                        {item.title}
                        {item.subtitle && <span className="font-normal text-muted-foreground"> · {item.subtitle}</span>}
                    </p>
                    <p className={cn("text-xs", w.overdue ? "font-semibold text-rose-700" : "text-muted-foreground")}>
                        {w.text}
                        {item.assignee && <> · {item.assignee}</>}
                    </p>
                </Link>
                {item.amount !== undefined && <span className="shrink-0 text-sm font-semibold tabular-nums">{money(item.amount)}</span>}
                <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" aria-hidden />
            </li>
        );
    };

    return (
        <section className="rounded-2xl border-2 border-border bg-white p-5 shadow-sm md:p-6" aria-labelledby="this-week">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="this-week" className="font-serif text-xl font-bold">This week</h3>
                {data && data.due.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        {data.due.length} {data.due.length === 1 ? "thing" : "things"}
                        {dueTotal > 0 && <> · <b className="text-foreground">{money(dueTotal)}</b> to pay</>}
                    </p>
                )}
            </div>

            {!data ? (
                <div className="mt-4 space-y-3 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100" />)}</div>
            ) : data.due.length === 0 ? (
                <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Nothing due in the next 7 days. 🎉</p>
                    {data.later.length > 0 && (
                        <>
                            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coming up</p>
                            <ul className="divide-y divide-border">{data.later.map(row)}</ul>
                        </>
                    )}
                </div>
            ) : (
                <ul className="mt-2 divide-y divide-border">{data.due.map(row)}</ul>
            )}
        </section>
    );
}
