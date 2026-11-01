"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import {
    getBudgetCategories,
    getBudgetItems,
    getEvents,
    getGuests,
    getPayments,
    getSeatingTables,
    getVendors,
    getWeddingBrand,
    getWeddingById,
} from "@/app/actions/data";
import { CURRENCIES } from "@/lib/constants";

/**
 * Print-ready versions of the main lists (and "Save as PDF" from the print
 * dialog): /print/guests, /print/seating, /print/budget, /print/dayof, each
 * with ?weddingId=. Data comes from the same access-checked actions as the app.
 */

type Kind = "guests" | "seating" | "budget" | "dayof";
const TITLES: Record<Kind, string> = { guests: "Guest list", seating: "Seating plan", budget: "Budget", dayof: "Wedding day schedule" };

type Data = {
    wedding: NonNullable<Awaited<ReturnType<typeof getWeddingById>>>;
    brand: Awaited<ReturnType<typeof getWeddingBrand>>;
    guests: Awaited<ReturnType<typeof getGuests>>;
    tables: Awaited<ReturnType<typeof getSeatingTables>>;
    items: Awaited<ReturnType<typeof getBudgetItems>>;
    categories: Awaited<ReturnType<typeof getBudgetCategories>>;
    payments: Awaited<ReturnType<typeof getPayments>>;
    events: Awaited<ReturnType<typeof getEvents>>;
    vendors: Awaited<ReturnType<typeof getVendors>>;
};

const party = (g: Data["guests"][number]) => 1 + (g.companionGuestCount || 0);
const seats = (g: Data["guests"][number]) => (g.rsvpStatus === "accepted" && g.attendingCount !== null ? g.attendingCount : party(g));
const RSVP: Record<string, string> = { pending: "No reply", accepted: "Coming", declined: "Declined" };
const num = (v: unknown) => Number(v) || 0;
const cost = (i: Data["items"][number]) => (num(i.actualCost) > 0 ? num(i.actualCost) : num(i.estimatedCost));

export default function PrintPage({ params }: { params: Promise<{ kind: string }> }) {
    const { kind: rawKind } = use(params);
    const kind = (rawKind in TITLES ? rawKind : "guests") as Kind;
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const weddingId = new URLSearchParams(window.location.search).get("weddingId");
        if (!weddingId) {
            setError("Open this from a wedding's page.");
            return;
        }
        (async () => {
            const wedding = await getWeddingById(weddingId);
            if (!wedding) {
                setError("You don't have access to this wedding, or you're signed out.");
                return;
            }
            const none = Promise.resolve([] as never[]);
            const [brand, guests, tables, items, categories, payments, events, vendors] = await Promise.all([
                getWeddingBrand(weddingId),
                kind === "guests" || kind === "seating" ? getGuests(weddingId) : none,
                kind === "seating" ? getSeatingTables(weddingId) : none,
                kind === "budget" ? getBudgetItems(weddingId) : none,
                kind === "budget" ? getBudgetCategories(weddingId) : none,
                kind === "budget" ? getPayments(weddingId) : none,
                kind === "dayof" ? getEvents(weddingId) : none,
                kind === "dayof" ? getVendors(weddingId) : none,
            ]);
            setData({ wedding, brand, guests, tables, items, categories, payments, events, vendors });
        })();
    }, [kind]);

    // Open the print dialog once everything has rendered
    useEffect(() => {
        if (!data) return;
        document.title = `${TITLES[kind]} · ${[data.wedding.coupleName1, data.wedding.coupleName2].filter(Boolean).join(" & ")}`;
        const id = setTimeout(() => window.print(), 400);
        return () => clearTimeout(id);
    }, [data, kind]);

    if (error) return <p className="p-10 text-center text-gray-600">{error}</p>;
    if (!data) return <p className="p-10 text-center text-gray-400">Preparing…</p>;

    const { wedding, brand } = data;
    const couple = [wedding.coupleName1, wedding.coupleName2].filter(Boolean).join(" & ");
    const symbol = CURRENCIES.find((c) => c.code === wedding.currency)?.symbol ?? wedding.currency;
    const money = (n: number) => `${symbol} ${Math.round(n).toLocaleString()}`;
    const date = wedding.weddingDate
        ? new Date(wedding.weddingDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
        : null;

    return (
        <div className="mx-auto max-w-4xl bg-white p-8 text-[13px] text-gray-900 print:max-w-none print:p-0">
            <style>{`@page { margin: 14mm; } @media print { body { background: white !important; } }`}</style>
            <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
                <p className="text-sm text-gray-500">Use “Save as PDF” in the print dialog to keep a copy.</p>
                <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                    <Printer className="h-4 w-4" /> Print
                </button>
            </div>

            <header className="mb-6 flex items-end justify-between gap-4 border-b-2 border-gray-900 pb-3" style={brand?.color ? { borderColor: brand.color } : undefined}>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{TITLES[kind]}</p>
                    <h1 className="font-serif text-3xl font-bold">{couple}</h1>
                    <p className="text-gray-600">{[date, wedding.location].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                    {brand && <p className="font-semibold text-gray-700">{brand.name}</p>}
                    <p>Printed {new Date().toLocaleDateString()}</p>
                </div>
            </header>

            {kind === "guests" && <GuestList guests={data.guests} />}
            {kind === "seating" && <Seating guests={data.guests} tables={data.tables} />}
            {kind === "budget" && <Budget items={data.items} categories={data.categories} payments={data.payments} money={money} total={num(wedding.estimatedBudget)} />}
            {kind === "dayof" && <DayOf events={data.events} vendors={data.vendors} />}
        </div>
    );
}

function Table({ head, rows, foot }: { head: ReactNode[]; rows: ReactNode[][]; foot?: ReactNode[] }) {
    return (
        <table className="w-full border-collapse">
            <thead>
                <tr className="border-b border-gray-300 text-left text-[11px] uppercase tracking-wide text-gray-500">
                    {head.map((h, i) => <th key={i} className="py-1.5 pr-3 font-semibold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} className="break-inside-avoid border-b border-gray-100 align-top">
                        {r.map((c, j) => <td key={j} className="py-1.5 pr-3">{c}</td>)}
                    </tr>
                ))}
            </tbody>
            {foot && (
                <tfoot>
                    <tr className="border-t-2 border-gray-300 font-semibold">
                        {foot.map((c, i) => <td key={i} className="py-1.5 pr-3">{c}</td>)}
                    </tr>
                </tfoot>
            )}
        </table>
    );
}

function GuestList({ guests }: { guests: Data["guests"] }) {
    const sides = [
        { key: "bride", label: "Bride's side" },
        { key: "groom", label: "Groom's side" },
        { key: "both", label: "Both" },
        { key: "", label: "Side not set" },
    ];
    const invited = guests.filter((g) => g.rsvpStatus !== "declined");
    return (
        <div className="space-y-6">
            <p className="text-gray-600">
                {guests.length} households · {guests.reduce((n, g) => n + party(g), 0)} invited ·{" "}
                {guests.filter((g) => g.rsvpStatus === "accepted").reduce((n, g) => n + seats(g), 0)} coming ·{" "}
                {guests.filter((g) => g.rsvpStatus === "pending").reduce((n, g) => n + party(g), 0)} not replied
            </p>
            {sides.map((side) => {
                const list = guests.filter((g) => (g.side ?? "") === side.key).sort((a, b) => a.name.localeCompare(b.name));
                if (!list.length) return null;
                return (
                    <section key={side.key}>
                        <h2 className="mb-1 text-base font-bold">{side.label} <span className="font-normal text-gray-500">· {list.reduce((n, g) => n + party(g), 0)}</span></h2>
                        <Table
                            head={["Household", "Party", "RSVP", "Meal", "Table", "Phone"]}
                            rows={list.map((g) => [
                                <span key="n" className={g.rsvpStatus === "declined" ? "text-gray-400 line-through" : ""}>{g.name}</span>,
                                g.rsvpStatus === "accepted" && seats(g) !== party(g) ? `${seats(g)} of ${party(g)}` : party(g),
                                RSVP[g.rsvpStatus] ?? g.rsvpStatus,
                                g.mealPreference ?? "",
                                g.tableAssignment ?? "",
                                g.whatsappNumber ?? "",
                            ])}
                        />
                    </section>
                );
            })}
            {invited.length === 0 && <p className="text-gray-500">No guests yet.</p>}
        </div>
    );
}

function Seating({ guests, tables }: { guests: Data["guests"]; tables: Data["tables"] }) {
    const seated = (name: string) => guests.filter((g) => g.tableAssignment === name && g.rsvpStatus !== "declined");
    const unseated = guests.filter((g) => !g.tableAssignment && g.rsvpStatus === "accepted");
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
                {tables.map((t) => {
                    const list = seated(t.name);
                    const used = list.reduce((n, g) => n + seats(g), 0);
                    return (
                        <section key={t.id} className="break-inside-avoid rounded-lg border border-gray-300 p-3">
                            <h2 className="flex justify-between font-bold">
                                {t.name}
                                <span className={used > t.capacity ? "text-rose-700" : "font-normal text-gray-500"}>{used}/{t.capacity}</span>
                            </h2>
                            <ul className="mt-1 space-y-0.5">
                                {list.map((g) => (
                                    <li key={g.id} className="flex justify-between gap-2">
                                        <span>{g.name}</span>
                                        <span className="text-gray-500">{seats(g)}</span>
                                    </li>
                                ))}
                                {list.length === 0 && <li className="text-gray-400">Empty</li>}
                            </ul>
                        </section>
                    );
                })}
            </div>
            {tables.length === 0 && <p className="text-gray-500">No tables yet.</p>}
            {unseated.length > 0 && (
                <p className="text-gray-600">
                    <b>Not seated yet ({unseated.length}):</b> {unseated.map((g) => g.name).join(", ")}
                </p>
            )}
        </div>
    );
}

function Budget({
    items,
    categories,
    payments,
    money,
    total,
}: {
    items: Data["items"];
    categories: Data["categories"];
    payments: Data["payments"];
    money: (n: number) => string;
    total: number;
}) {
    const names = categories.map((c) => c.name);
    for (const i of items) if (!names.includes(i.category)) names.push(i.category);
    const planned = items.reduce((n, i) => n + cost(i), 0);
    const paid = items.reduce((n, i) => n + num(i.paidAmount), 0);
    const open = payments.filter((p) => !p.paidAt);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
                {[
                    ["Total budget", money(total)],
                    ["Planned", money(planned)],
                    ["Paid", money(paid)],
                    ["Still to pay", money(Math.max(0, planned - paid))],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-gray-300 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
                        <p className="text-base font-bold">{value}</p>
                    </div>
                ))}
            </div>
            {names.map((name) => {
                const list = items.filter((i) => i.category === name);
                if (!list.length) return null;
                const allocated = num(categories.find((c) => c.name === name)?.allocated);
                return (
                    <section key={name} className="break-inside-avoid">
                        <h2 className="mb-1 text-base font-bold">
                            {name}
                            {allocated > 0 && <span className="font-normal text-gray-500"> · {money(allocated)} allocated</span>}
                        </h2>
                        <Table
                            head={["Item", "Estimate", "Actual", "Paid", "Balance", "Due"]}
                            rows={list.map((i) => [
                                i.name,
                                money(num(i.estimatedCost)),
                                num(i.actualCost) ? money(num(i.actualCost)) : "",
                                money(num(i.paidAmount)),
                                money(Math.max(0, cost(i) - num(i.paidAmount))),
                                i.dueDate ? new Date(i.dueDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "",
                            ])}
                            foot={["Subtotal", "", "", money(list.reduce((n, i) => n + num(i.paidAmount), 0)), money(list.reduce((n, i) => n + Math.max(0, cost(i) - num(i.paidAmount)), 0)), ""]}
                        />
                    </section>
                );
            })}
            {open.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="mb-1 text-base font-bold">Payments still to make</h2>
                    <Table
                        head={["Due", "For", "Payment", "Amount"]}
                        rows={open.map((p) => [
                            p.dueDate ? new Date(p.dueDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "No date",
                            p.budgetItem.name,
                            p.label,
                            money(num(p.amount)),
                        ])}
                        foot={["", "", "Total", money(open.reduce((n, p) => n + num(p.amount), 0))]}
                    />
                </section>
            )}
        </div>
    );
}

function DayOf({ events, vendors }: { events: Data["events"]; vendors: Data["vendors"] }) {
    const timed = events.filter((e) => e.startTime);
    const time = (d: Date | string) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const hired = vendors.filter((v) => v.status === "hired");
    return (
        <div className="space-y-6">
            <Table
                head={["Time", "What", "Where", "Notes"]}
                rows={timed.map((e) => [
                    <span key="t" className="whitespace-nowrap font-semibold">{time(e.startTime!)}{e.endTime ? `–${time(e.endTime)}` : ""}</span>,
                    e.title,
                    e.location ?? "",
                    e.notes || e.description || "",
                ])}
            />
            {timed.length === 0 && <p className="text-gray-500">No schedule yet.</p>}
            {hired.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="mb-1 text-base font-bold">Vendor contacts</h2>
                    <Table
                        head={["Vendor", "For", "Contact", "Phone"]}
                        rows={hired.map((v) => [v.companyName ?? "", v.category ?? "", v.contactName ?? "", v.phone ?? ""])}
                    />
                </section>
            )}
        </div>
    );
}
