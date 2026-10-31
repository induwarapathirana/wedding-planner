"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Pencil, Plus, Sparkles, Trash2, Wallet } from "lucide-react";
import {
    applyTemplate,
    createBudgetCategory,
    createBudgetItem,
    deleteBudgetCategory,
    deleteBudgetItem,
    getBudgetCategories,
    getBudgetItems,
    getWeddingById,
    updateBudgetCategory,
    updateBudgetItem,
    updateWedding,
} from "@/app/actions/data";
import { SheetGrid, type SheetColumn, type SheetGroup } from "@/components/sheet/SheetGrid";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { CURRENCIES } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Item = Awaited<ReturnType<typeof getBudgetItems>>[number];
type Category = Awaited<ReturnType<typeof getBudgetCategories>>[number];

const num = (v: unknown) => Number(v) || 0;
/** What an item will cost: the actual price once known, otherwise the estimate. */
const cost = (i: Item) => (num(i.actualCost) > 0 ? num(i.actualCost) : num(i.estimatedCost));
const balance = (i: Item) => Math.max(0, cost(i) - num(i.paidAmount));

/** Map a grid edit to the item fields it changes (keeps estimate = qty × unit price). */
function toChanges(item: Item, key: string, value: unknown): Record<string, unknown> {
    if (key === "paidInFull") {
        return value ? { paidAt: new Date(), paidAmount: cost(item) } : { paidAt: null };
    }
    const changes: Record<string, unknown> = { [key]: value };
    if (key === "units" || key === "unitPrice") {
        const units = key === "units" ? num(value) || 1 : item.units || 1;
        const unitPrice = key === "unitPrice" ? value : item.unitPrice;
        if (unitPrice !== null && unitPrice !== undefined) changes.estimatedCost = units * num(unitPrice);
    }
    return changes;
}

export default function BudgetPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [total, setTotal] = useState(0);
    const [currency, setCurrency] = useState("LKR");
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState("");
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async (id: string) => {
        const [list, cats, wedding] = await Promise.all([getBudgetItems(id), getBudgetCategories(id), getWeddingById(id)]);
        setItems(list);
        setCategories(cats);
        setTotal(num(wedding?.estimatedBudget));
        setCurrency(wedding?.currency || "LKR");
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

    const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
    const money = useCallback((n: number) => `${symbol} ${Math.round(n).toLocaleString()}`, [symbol]);

    // Every known category, in order, plus any used by items but missing a row
    const categoryNames = useMemo(() => {
        const names = categories.map((c) => c.name);
        for (const i of items) if (!names.includes(i.category)) names.push(i.category);
        return names;
    }, [categories, items]);

    const groupBy = useCallback(
        (rows: Item[]): SheetGroup<Item>[] =>
            categoryNames.map((name) => ({ key: name, label: name, rows: rows.filter((r) => r.category === name) })),
        [categoryNames]
    );

    const saveItem = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Item | undefined;
        setItems((list) =>
            list.map((i) => {
                if (i.id !== id) return i;
                previous = i;
                return { ...i, ...changes } as Item;
            })
        );
        try {
            const saved = await updateBudgetItem(id, changes);
            setItems((list) => list.map((i) => (i.id === id ? saved : i)));
            if (changes.category && !categories.some((c) => c.name === changes.category) && weddingId) {
                setCategories(await getBudgetCategories(weddingId));
            }
        } catch (e) {
            if (previous) setItems((list) => list.map((i) => (i.id === id ? previous! : i)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, [categories, weddingId]);

    const onCommit = useCallback((row: Item, key: string, value: unknown) => saveItem(row.id, toChanges(row, key, value)), [saveItem]);

    const addItem = async (category?: string) => {
        if (!weddingId) return;
        try {
            const created = await createBudgetItem(weddingId, { name: "New item", category: category || categoryNames[0] || "General" });
            setItems((list) => [...list, created]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const onPasteRows = async (rows: Record<string, string>[]) => {
        if (!weddingId) return;
        let added = 0;
        for (const r of rows) {
            if (!r.name?.trim()) continue;
            try {
                const created = await createBudgetItem(weddingId, {
                    name: r.name,
                    category: r.category?.trim() || categoryNames[0] || "General",
                    units: r.units,
                    unitPrice: r.unitPrice,
                    estimatedCost: r.estimatedCost ?? (r.unitPrice ? num(r.unitPrice.replace(/[^\d.]/g, "")) * (num(r.units) || 1) : undefined),
                    actualCost: r.actualCost,
                    paidAmount: r.paidAmount,
                    notes: r.notes,
                });
                setItems((list) => [...list, created]);
                added++;
            } catch (e) {
                toast.error(`${r.name}: ${(e as Error).message}`);
            }
        }
        if (added) {
            toast.success(`Added ${added} budget ${added === 1 ? "item" : "items"}`);
            setCategories(await getBudgetCategories(weddingId));
        }
    };

    const removeItem = async (item: Item) => {
        setItems((list) => list.filter((i) => i.id !== item.id));
        try {
            await deleteBudgetItem(item.id);
            toast.success(`Deleted ${item.name}`);
        } catch (e) {
            setItems((list) => [...list, item]);
            toast.error((e as Error).message);
        }
    };

    const saveCategory = async (cat: Category, changes: { name?: string; allocated?: number }) => {
        const before = categories;
        setCategories((list) => list.map((c) => (c.id === cat.id ? { ...c, ...changes } : c)));
        if (changes.name) setItems((list) => list.map((i) => (i.category === cat.name ? { ...i, category: changes.name! } : i)));
        try {
            await updateBudgetCategory(cat.id, changes);
        } catch (e) {
            setCategories(before);
            if (weddingId) load(weddingId);
            toast.error((e as Error).message);
        }
    };

    const addCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newCategory.trim();
        if (!name || !weddingId) return;
        try {
            const created = await createBudgetCategory(weddingId, { name });
            setCategories((list) => [...list, created]);
            setNewCategory("");
        } catch (err) {
            toast.error((err as Error).message.includes("Unique") ? `"${name}" already exists` : (err as Error).message);
        }
    };

    const removeCategory = async (cat: Category) => {
        try {
            await deleteBudgetCategory(cat.id);
            setCategories((list) => list.filter((c) => c.id !== cat.id));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const saveTotal = async (value: number) => {
        if (!weddingId || value === total) return;
        const before = total;
        setTotal(value);
        try {
            await updateWedding(weddingId, { estimatedBudget: value });
        } catch (e) {
            setTotal(before);
            toast.error((e as Error).message);
        }
    };

    const useTemplate = async () => {
        if (!weddingId) return;
        setSeeding(true);
        try {
            const { added } = await applyTemplate(weddingId, "budget");
            await load(weddingId);
            toast.success(added ? `Added ${added} categories with starter items` : "Your budget already has these categories");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSeeding(false);
        }
    };

    const exportCsv = () =>
        downloadCsv(
            `budget-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Category", "Item", "Qty", "Unit price", "Estimate", "Actual", "Paid", "Balance", "Due", "Notes"],
            categoryNames.flatMap((c) =>
                items.filter((i) => i.category === c).map((i) => [
                    c, i.name, i.units, i.unitPrice, num(i.estimatedCost), num(i.actualCost), num(i.paidAmount), balance(i),
                    i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : "", i.notes,
                ])
            )
        );

    const totals = {
        planned: items.reduce((n, i) => n + cost(i), 0),
        paid: items.reduce((n, i) => n + num(i.paidAmount), 0),
        due: items.reduce((n, i) => n + balance(i), 0),
        allocated: categories.reduce((n, c) => n + num(c.allocated), 0),
    };
    const overBudget = total > 0 && totals.planned > total;

    const columns: SheetColumn<Item>[] = [
        { key: "name", label: "Item", type: "text", width: 220, sticky: true },
        { key: "category", label: "Category", type: "select", options: categoryNames.map((c) => ({ value: c, label: c })), width: 150 },
        { key: "units", label: "Qty", type: "number", width: 60, align: "right" },
        { key: "unitPrice", label: "Unit price", type: "money", width: 120, align: "right" },
        {
            key: "estimatedCost", label: "Estimate", type: "money", width: 130, align: "right", summary: true,
            readOnly: (i) => i.unitPrice !== null && i.unitPrice !== undefined,
        },
        { key: "actualCost", label: "Actual", type: "money", width: 120, align: "right", placeholder: "—" },
        { key: "paidAmount", label: "Paid", type: "money", width: 120, align: "right" },
        {
            key: "balance", label: "Balance", type: "money", width: 120, align: "right", get: balance, summary: true,
            render: (i) => <span className={cn(balance(i) === 0 ? "text-emerald-700" : "font-medium")}>{balance(i) === 0 ? "Paid" : money(balance(i))}</span>,
        },
        { key: "dueDate", label: "Due", type: "date", width: 130, summary: true },
        { key: "paidInFull", label: "Paid in full", type: "checkbox", width: 100, align: "center", get: (i) => !!i.paidAt, readOnly: false },
        { key: "notes", label: "Notes", type: "text", width: 200 },
    ];

    const renderGroupHeader = (group: SheetGroup<Item>) => {
        const cat = categories.find((c) => c.name === group.key);
        const planned = group.rows.reduce((n, i) => n + cost(i), 0);
        const paid = group.rows.reduce((n, i) => n + num(i.paidAmount), 0);
        const allocated = num(cat?.allocated);
        const left = allocated - planned;
        return (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                {cat && canEdit ? (
                    <CategoryName name={group.label} onRename={(name) => saveCategory(cat, { name })} />
                ) : (
                    <span className="font-semibold">{group.label}</span>
                )}
                <span className="text-muted-foreground tabular-nums">Planned <b className="text-foreground">{money(planned)}</b></span>
                <span className="text-muted-foreground tabular-nums">Paid <b className="text-foreground">{money(paid)}</b></span>
                {cat && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                        of
                        {canEdit ? (
                            <AmountInput value={allocated} symbol={symbol} label={`Allocation for ${group.label}`} onSave={(v) => saveCategory(cat, { allocated: v })} />
                        ) : (
                            <b className="text-foreground">{money(allocated)}</b>
                        )}
                    </span>
                )}
                {allocated > 0 && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", left < 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800")}>
                        {left < 0 ? `${money(-left)} over` : `${money(left)} left`}
                    </span>
                )}
                {cat && canEdit && group.rows.length === 0 && (
                    <button onClick={() => removeCategory(cat)} className="ml-auto rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete category ${group.label}`}>
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-28 rounded-2xl bg-white border border-border" /><div className="h-[50vh] rounded-2xl border border-border bg-white" /></div>;
    }

    if (!weddingId) {
        return (
            <div className="py-20 text-center">
                <p className="text-muted-foreground">Create your wedding first.</p>
                <Link href="/onboarding" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 font-medium text-white">Start planning</Link>
            </div>
        );
    }

    const isEmpty = items.length === 0 && categories.length === 0;

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold">Budget</h1>
                    <p className="text-sm text-muted-foreground">Click any cell to edit. Quantity × unit price fills in the estimate.</p>
                </div>
                <button onClick={exportCsv} disabled={!items.length} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
                    <Download className="h-4 w-4" /> Export
                </button>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total budget</p>
                    {canEdit ? (
                        <AmountInput value={total} symbol={symbol} label="Total budget" onSave={saveTotal} large />
                    ) : (
                        <p className="mt-1 font-serif text-2xl font-bold tabular-nums">{money(total)}</p>
                    )}
                    {total > 0 && totals.allocated !== total && categories.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {totals.allocated < total ? `${money(total - totals.allocated)} not allocated to a category` : `Categories add up to ${money(totals.allocated - total)} more`}
                        </p>
                    )}
                </div>
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned spend</p>
                    <p className={cn("mt-1 font-serif text-2xl font-bold tabular-nums", overBudget && "text-rose-700")}>{money(totals.planned)}</p>
                    {total > 0 && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className={cn("h-full rounded-full", overBudget ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min(100, (totals.planned / total) * 100)}%` }} />
                        </div>
                    )}
                </div>
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid so far</p>
                    <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-emerald-700">{money(totals.paid)}</p>
                </div>
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still to pay</p>
                    <p className="mt-1 font-serif text-2xl font-bold tabular-nums">{money(totals.due)}</p>
                </div>
            </div>

            {isEmpty ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Start from a budget split</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        We'll add 10 categories (venue & food, photo & video, attire and more) with a share of your total and a few starter items. Everything stays editable.
                    </p>
                    {canEdit && (
                        <button onClick={useTemplate} disabled={seeding} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">
                            <Sparkles className="h-4 w-4" /> {seeding ? "Setting up…" : "Set up my budget"}
                        </button>
                    )}
                    {total === 0 && <p className="mt-3 text-xs text-muted-foreground">Tip: enter your total budget above first, so each category gets its share.</p>}
                </div>
            ) : (
                <SheetGrid
                    rows={items}
                    columns={columns}
                    getRowId={(i) => i.id}
                    onCommit={onCommit}
                    readOnly={!canEdit}
                    formatMoney={money}
                    groupBy={groupBy}
                    renderGroupHeader={renderGroupHeader}
                    onAddRow={canEdit ? addItem : undefined}
                    addRowLabel={(group) => `Add to ${group}`}
                    onPasteRows={canEdit ? onPasteRows : undefined}
                    maxHeight="65vh"
                    rowActions={(i) =>
                        canEdit ? (
                            <button onClick={() => removeItem(i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${i.name}`}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : null
                    }
                />
            )}

            {!isEmpty && canEdit && (
                <form onSubmit={addCategory} className="flex flex-wrap items-center gap-2">
                    <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category, e.g. Homecoming"
                        aria-label="New category name"
                        className="w-64 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button type="submit" disabled={!newCategory.trim()} className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium disabled:opacity-40">
                        <Plus className="h-4 w-4" /> Add category
                    </button>
                </form>
            )}
        </div>
    );
}

function AmountInput({ value, symbol, label, onSave, large }: { value: number; symbol: string; label: string; onSave: (v: number) => void; large?: boolean }) {
    const [draft, setDraft] = useState(String(Math.round(value)));
    useEffect(() => setDraft(String(Math.round(value))), [value]);
    const commit = () => {
        const n = Number(draft.replace(/[^\d.]/g, ""));
        if (Number.isFinite(n)) onSave(n);
        else setDraft(String(Math.round(value)));
    };
    return (
        <span className={cn("inline-flex items-baseline gap-1", large && "mt-1")}>
            <span className={cn("text-muted-foreground", large ? "text-lg" : "text-xs")}>{symbol}</span>
            <input
                value={Number(draft) ? Number(draft).toLocaleString() : draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                inputMode="decimal"
                aria-label={label}
                className={cn(
                    "rounded-md border border-transparent bg-transparent tabular-nums hover:border-border focus:border-primary focus:bg-white focus:outline-none",
                    large ? "w-40 px-1 font-serif text-2xl font-bold" : "w-28 px-1 py-0.5 text-sm font-semibold text-foreground"
                )}
            />
        </span>
    );
}

function CategoryName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(name);
    if (!editing) {
        return (
            <button onClick={() => { setDraft(name); setEditing(true); }} className="group inline-flex items-center gap-1 font-semibold" aria-label={`Rename ${name}`}>
                {name}
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
        );
    }
    const done = () => {
        setEditing(false);
        if (draft.trim() && draft.trim() !== name) onRename(draft.trim());
    };
    return (
        <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={done}
            onKeyDown={(e) => {
                if (e.key === "Enter") done();
                if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Category name"
            className="w-48 rounded-md border border-primary bg-white px-2 py-0.5 text-sm font-semibold focus:outline-none"
        />
    );
}
