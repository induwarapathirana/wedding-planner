"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Package, Trash2 } from "lucide-react";
import { createInventoryItem, deleteInventoryItem, getInventoryItems, getWeddingById, updateInventoryItem } from "@/app/actions/data";
import { SheetGrid, type SheetColumn } from "@/components/sheet/SheetGrid";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Item = Awaited<ReturnType<typeof getInventoryItems>>[number];

const STATUSES = [
    { value: "needed", label: "Needed" },
    { value: "purchased", label: "Bought" },
    { value: "rented", label: "Rented" },
    { value: "borrowed", label: "Borrowed" },
    { value: "packed", label: "Packed" },
];
const STATUS_STYLE: Record<string, string> = {
    needed: "bg-amber-100 text-amber-800",
    purchased: "bg-emerald-100 text-emerald-800",
    rented: "bg-sky-100 text-sky-800",
    borrowed: "bg-violet-100 text-violet-800",
    packed: "bg-gray-200 text-gray-700",
};

const total = (i: Item) => (Number(i.unitPrice) || 0) * (i.quantity || 0);
const safeUrl = (link?: string | null) => {
    if (!link) return null;
    const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    try {
        return new URL(url).href;
    } catch {
        return null;
    }
};

export default function InventoryPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [items, setItems] = useState<Item[]>([]);
    const [currency, setCurrency] = useState("LKR");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (weddingId === undefined) return;
        if (weddingId === null) {
            setLoading(false);
            return;
        }
        Promise.all([getInventoryItems(weddingId), getWeddingById(weddingId)]).then(([list, wedding]) => {
            setItems(list);
            setCurrency(wedding?.currency || "LKR");
            setLoading(false);
        });
    }, [weddingId]);

    const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
    const money = useCallback((n: number) => `${symbol} ${Math.round(n).toLocaleString()}`, [symbol]);

    const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[], [items]);

    const save = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Item | undefined;
        setItems((list) => list.map((i) => (i.id === id ? ((previous = i), { ...i, ...changes } as Item) : i)));
        try {
            const saved = await updateInventoryItem(id, changes);
            setItems((list) => list.map((i) => (i.id === id ? saved : i)));
        } catch (e) {
            if (previous) setItems((list) => list.map((i) => (i.id === id ? previous! : i)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const addItem = async () => {
        if (!weddingId) return;
        try {
            const created = await createInventoryItem(weddingId, { name: "New item", quantity: 1, status: "needed" });
            setItems((list) => [...list, created]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const removeItem = async (item: Item) => {
        setItems((list) => list.filter((i) => i.id !== item.id));
        try {
            await deleteInventoryItem(item.id);
            toast.success(`Removed ${item.name}`);
        } catch (e) {
            setItems((list) => [...list, item]);
            toast.error((e as Error).message);
        }
    };

    const columns: SheetColumn<Item>[] = [
        { key: "name", label: "Item", type: "text", width: 220, sticky: true },
        {
            key: "status", label: "Status", type: "select", options: STATUSES, width: 110, summary: true,
            render: (i) => <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[i.status] ?? STATUS_STYLE.needed)}>{STATUSES.find((s) => s.value === i.status)?.label ?? i.status}</span>,
        },
        { key: "quantity", label: "Qty", type: "number", width: 70, align: "right", summary: true },
        { key: "unitPrice", label: "Unit cost", type: "money", width: 120, align: "right" },
        { key: "total", label: "Total", type: "money", width: 120, align: "right", get: total, summary: true },
        { key: "category", label: "Category", type: "text", width: 140, placeholder: categories[0] ?? "Décor" },
        {
            key: "link", label: "Link", type: "text", width: 200, placeholder: "Shop or product link",
            render: (i) => {
                const href = safeUrl(i.link);
                return href ? (
                    <a href={href} target="_blank" rel="noreferrer" onMouseDown={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary-foreground underline decoration-primary underline-offset-2">
                        {new URL(href).hostname.replace(/^www\./, "")} <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    <span className="text-muted-foreground/60">{i.link || "Shop or product link"}</span>
                );
            },
        },
        { key: "notes", label: "Notes", type: "text", width: 220, placeholder: "Who's bringing it" },
    ];

    const needed = items.filter((i) => i.status === "needed");
    const totals = { all: items.reduce((n, i) => n + total(i), 0), needed: needed.reduce((n, i) => n + total(i), 0) };

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-[50vh] rounded-2xl border border-border bg-white" /></div>;
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
                    <h1 className="font-serif text-3xl font-bold">Inventory</h1>
                    <p className="text-sm text-muted-foreground">Décor, favours and everything else to buy, rent or borrow.</p>
                </div>
                {items.length > 0 && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                        <b className="text-foreground">{needed.length}</b> still needed ({money(totals.needed)}) · <b className="text-foreground">{money(totals.all)}</b> in total
                    </p>
                )}
            </div>

            {items.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Keep track of the little things</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Oil lamp, guest book, favours, signage: note what you need, where to get it and who's bringing it.</p>
                    {canEdit && <button onClick={addItem} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow">Add the first item</button>}
                </div>
            ) : (
                <SheetGrid
                    rows={items}
                    columns={columns}
                    getRowId={(i) => i.id}
                    onCommit={(row, key, value) => save(row.id, { [key]: value })}
                    readOnly={!canEdit}
                    formatMoney={money}
                    onAddRow={canEdit ? addItem : undefined}
                    addRowLabel="Add an item"
                    rowActions={(i) =>
                        canEdit ? (
                            <button onClick={() => removeItem(i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${i.name}`}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : null
                    }
                />
            )}
        </div>
    );
}
