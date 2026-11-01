"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Plus, Trash2, X } from "lucide-react";
import { bookVendor, getVendorBooking } from "@/app/actions/data";
import { toDateInput } from "@/components/sheet/SheetGrid";
import { cn } from "@/lib/utils";

type Row = { label: string; amount: string; dueDate: string; paid: boolean };
type Booked = Awaited<ReturnType<typeof bookVendor>>;

/** Vendor categories → the budget template's categories. */
const BUDGET_MATCH: [RegExp, string][] = [
    [/venue|catering|food|hotel/i, "Venue & food"],
    [/photo|video/i, "Photo & video"],
    [/attire|saree|dress|hair|make-?up|beauty|jewel/i, "Attire & beauty"],
    [/d[ée]cor|flower/i, "Décor & flowers"],
    [/ashtaka|poruwa|ceremony|drummer|dancer/i, "Ceremony"],
    [/music|dj|band|entertain/i, "Music & entertainment"],
    [/stationery|invitation|card/i, "Stationery"],
    [/transport|car/i, "Transport"],
    [/cake|favour/i, "Cake & favours"],
];

function guessCategory(vendorCategory: string | null, categories: string[]) {
    if (vendorCategory && categories.includes(vendorCategory)) return vendorCategory;
    const match = BUDGET_MATCH.find(([re]) => vendorCategory && re.test(vendorCategory))?.[1];
    if (match && categories.includes(match)) return match;
    return match || vendorCategory || categories[0] || "Vendors";
}

const todayInput = () => new Date().toISOString().slice(0, 10);
const daysBefore = (date: Date | string | null | undefined, days: number) => {
    if (!date) return "";
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - days);
    const iso = d.toISOString().slice(0, 10);
    return iso < todayInput() ? todayInput() : iso;
};
const toNumber = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0;

export function BookVendorDialog({
    vendor,
    categories,
    symbol,
    onClose,
    onBooked,
}: {
    vendor: { id: string; companyName: string | null; category: string | null; priceEstimate: number | null; cost: number | null };
    categories: string[];
    symbol: string;
    onClose: () => void;
    onBooked: (result: Booked) => void;
}) {
    const name = vendor.companyName || "this vendor";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [weddingDate, setWeddingDate] = useState<Date | string | null>(null);
    const [total, setTotal] = useState(String(Math.round(vendor.cost || vendor.priceEstimate || 0) || ""));
    const [category, setCategory] = useState(guessCategory(vendor.category, categories));
    const [rows, setRows] = useState<Row[]>([]);
    const [hasTasks, setHasTasks] = useState(false);
    const [addTasks, setAddTasks] = useState(true);

    const totalNum = toNumber(total);

    const preset = (kind: "split" | "full" | "thirds", amount = totalNum, date = weddingDate) => {
        const round = (n: number) => String(Math.round(n));
        if (kind === "full") return [{ label: "Full payment", amount: round(amount), dueDate: daysBefore(date, 14) || todayInput(), paid: false }];
        if (kind === "thirds") {
            const third = Math.round(amount / 3);
            return [
                { label: "Advance", amount: round(third), dueDate: todayInput(), paid: false },
                { label: "Second payment", amount: round(third), dueDate: daysBefore(date, 60), paid: false },
                { label: "Balance", amount: round(amount - third * 2), dueDate: daysBefore(date, 7), paid: false },
            ];
        }
        const advance = Math.round(amount * 0.3);
        return [
            { label: "Advance", amount: round(advance), dueDate: todayInput(), paid: false },
            { label: "Balance", amount: round(amount - advance), dueDate: daysBefore(date, 7), paid: false },
        ];
    };

    useEffect(() => {
        getVendorBooking(vendor.id).then((b) => {
            if (b) {
                setWeddingDate(b.wedding.weddingDate);
                setHasTasks(b.hasTasks);
                const item = b.budgetItem;
                if (item) {
                    setCategory(item.category);
                    const price = item.actualCost || item.estimatedCost;
                    if (price) setTotal(String(Math.round(price)));
                    if (item.payments.length) {
                        setRows(item.payments.map((p) => ({ label: p.label, amount: String(Math.round(p.amount)), dueDate: toDateInput(p.dueDate), paid: !!p.paidAt })));
                    } else {
                        setRows(preset("split", price || totalNum, b.wedding.weddingDate));
                    }
                } else {
                    setRows(preset("split", totalNum, b.wedding.weddingDate));
                }
            }
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendor.id]);

    const scheduled = rows.reduce((n, r) => n + toNumber(r.amount), 0);
    const gap = Math.round(totalNum - scheduled);
    const options = useMemo(() => (categories.includes(category) ? categories : [category, ...categories]), [categories, category]);

    const update = (i: number, changes: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...changes } : r)));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rows.length && gap !== 0) {
            toast.error(`The payments are ${symbol} ${Math.abs(gap).toLocaleString()} ${gap > 0 ? "short of" : "over"} the total`);
            return;
        }
        setSaving(true);
        try {
            const result = await bookVendor(vendor.id, {
                total: totalNum,
                category,
                addTasks: addTasks && !hasTasks,
                payments: rows.map((r) => ({ label: r.label || "Payment", amount: toNumber(r.amount), dueDate: r.dueDate || null, paidAt: r.paid ? r.dueDate || todayInput() : null })),
            });
            onBooked(result);
        } catch (err) {
            toast.error((err as Error).message);
            setSaving(false);
        }
    };

    const field = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="book-title" className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                        <h2 id="book-title" className="font-serif text-2xl font-bold">Book {name}</h2>
                        <p className="text-sm text-muted-foreground">Marks them hired, adds the cost to your budget and schedules the payments.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-gray-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5 animate-pulse"><div className="h-10 rounded-lg bg-gray-100" /><div className="h-32 rounded-lg bg-gray-100" /></div>
                ) : (
                    <div className="flex-1 space-y-5 overflow-y-auto p-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                                Agreed price
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">{symbol}</span>
                                    <input
                                        autoFocus
                                        required
                                        inputMode="decimal"
                                        value={totalNum ? totalNum.toLocaleString() : total}
                                        onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))}
                                        className={cn(field, "font-semibold tabular-nums")}
                                    />
                                </div>
                            </label>
                            <label className="block text-sm font-medium">
                                Budget category
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(field, "mt-1")}>
                                    {options.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </label>
                        </div>

                        <fieldset>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <legend className="text-sm font-medium">Payment schedule</legend>
                                <div className="flex gap-1 text-xs">
                                    {([["split", "Advance + balance"], ["thirds", "3 payments"], ["full", "Pay in full"]] as const).map(([kind, label]) => (
                                        <button key={kind} type="button" onClick={() => setRows(preset(kind))} className="rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground hover:border-primary hover:text-foreground">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                {rows.map((r, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-border p-2 sm:grid-cols-[1.2fr_1fr_1fr_auto_auto] sm:items-center sm:border-0 sm:p-0">
                                        <input value={r.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="Payment name" placeholder="Advance" className={cn(field, "col-span-2 sm:col-span-1")} />
                                        <input
                                            inputMode="decimal"
                                            value={toNumber(r.amount) ? toNumber(r.amount).toLocaleString() : r.amount}
                                            onChange={(e) => update(i, { amount: e.target.value.replace(/[^\d.]/g, "") })}
                                            aria-label={`Amount for ${r.label || "payment"}`}
                                            className={cn(field, "text-right tabular-nums")}
                                        />
                                        <input type="date" value={r.dueDate} onChange={(e) => update(i, { dueDate: e.target.value })} aria-label={`Due date for ${r.label || "payment"}`} className={field} />
                                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <input type="checkbox" checked={r.paid} onChange={(e) => update(i, { paid: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                                            Paid
                                        </label>
                                        <button type="button" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} className="justify-self-end rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${r.label || "payment"}`}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <button type="button" onClick={() => setRows((list) => [...list, { label: "Payment", amount: String(Math.max(0, gap)), dueDate: "", paid: false }])} className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
                                    <Plus className="h-4 w-4" /> Add a payment
                                </button>
                                {rows.length > 0 && gap !== 0 && (
                                    <span className="flex items-center gap-2 text-rose-700">
                                        {symbol} {Math.abs(gap).toLocaleString()} {gap > 0 ? "not scheduled" : "over the price"}
                                        <button
                                            type="button"
                                            onClick={() => update(rows.length - 1, { amount: String(Math.max(0, toNumber(rows[rows.length - 1].amount) + gap)) })}
                                            className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold hover:bg-rose-100"
                                        >
                                            Fix last payment
                                        </button>
                                    </span>
                                )}
                            </div>
                        </fieldset>

                        {!hasTasks && (
                            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
                                <input type="checkbox" checked={addTasks} onChange={(e) => setAddTasks(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                                <span>
                                    <span className="block font-medium">Add follow-up tasks</span>
                                    <span className="block text-muted-foreground">Sign the contract, confirm final details two weeks before, send them the day-of timeline.</span>
                                </span>
                            </label>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-border p-4">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={loading || saving || !totalNum} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50">
                        <CalendarCheck className="h-4 w-4" /> {saving ? "Booking…" : "Book vendor"}
                    </button>
                </div>
            </form>
        </div>
    );
}
