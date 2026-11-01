"use client";

import { useEffect, useState } from "react";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerCredit } from "@/components/PlannerCredit";
import type { getDayOf } from "@/lib/day-of";

type Data = NonNullable<Awaited<ReturnType<typeof getDayOf>>>;

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
const tel = (phone: string) => phone.replace(/[^\d+]/g, "").replace(/^0/, "+94");

/** Read-only run of show for family, the bridal party and vendors; highlights what's on now. */
export default function DayOfClient({ data }: { data: Data }) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const end = (e: Data["events"][number]) => new Date(e.endTime ?? e.startTime).getTime() || new Date(e.startTime).getTime();
    const currentId = now ? data.events.find((e) => new Date(e.startTime).getTime() <= now && now < end(e))?.id : undefined;
    const nextId = now ? data.events.find((e) => new Date(e.startTime).getTime() > now)?.id : undefined;

    // Group slots by calendar day (homecoming is often a separate day)
    const days: { label: string; events: Data["events"] }[] = [];
    for (const e of data.events) {
        const label = day(e.startTime);
        const last = days[days.length - 1];
        if (last?.label === label) last.events.push(e);
        else days.push({ label, events: [e] });
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] pb-12">
            <header className="bg-[#1A1A1A] px-5 py-8 text-center text-white" style={data.planner?.color ? { backgroundColor: data.planner.color } : undefined}>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Wedding day schedule</p>
                <h1 className="mt-1 font-serif text-3xl">{data.couple}</h1>
                {data.location && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(data.location)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-white/80 underline decoration-white/30 underline-offset-4">
                        <MapPin className="h-4 w-4" /> {data.location}
                    </a>
                )}
                {data.planner && (
                    <div className="mt-3">
                        <PlannerCredit planner={data.planner} tone="light" />
                    </div>
                )}
            </header>

            {/* Times are shown in the viewer's timezone, so wait for the browser before rendering them */}
            {now === null ? (
                <div className="mx-auto max-w-xl space-y-2 px-4 pt-6 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-stone-100" />)}</div>
            ) : (
            <main className="mx-auto max-w-xl space-y-8 px-4 pt-6">
                {data.events.length === 0 && <p className="text-center text-stone-500">The schedule hasn&apos;t been added yet.</p>}

                {days.map((d) => (
                    <section key={d.label}>
                        {days.length > 1 && <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{d.label}</h2>}
                        <ol className="relative space-y-2 border-l-2 border-stone-200 pl-4">
                            {d.events.map((e) => {
                                const isNow = e.id === currentId;
                                const isNext = e.id === nextId && !currentId;
                                const past = now !== null && end(e) <= now && !isNow;
                                return (
                                    <li key={e.id} className={cn("relative rounded-xl border bg-white p-3", isNow ? "border-emerald-500 shadow-md" : isNext ? "border-amber-400" : "border-stone-200", past && "opacity-50")}>
                                        <span className={cn("absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-white", isNow ? "bg-emerald-500" : past ? "bg-stone-300" : "bg-stone-500")} />
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="font-semibold text-stone-900">{e.title}</p>
                                            <p className="shrink-0 text-sm tabular-nums text-stone-600">
                                                {time(e.startTime)}
                                                {e.endTime && e.endTime !== e.startTime && <>–{time(e.endTime)}</>}
                                            </p>
                                        </div>
                                        {(isNow || isNext) && <p className={cn("text-xs font-bold uppercase", isNow ? "text-emerald-700" : "text-amber-700")}>{isNow ? "Happening now" : "Up next"}</p>}
                                        {e.location && <p className="mt-0.5 text-sm text-stone-500">{e.location}</p>}
                                        {(e.notes || e.description) && <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{e.notes || e.description}</p>}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                ))}

                {data.vendors.length > 0 && (
                    <section>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Vendor contacts</h2>
                        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                            {data.vendors.map((v) => (
                                <li key={v.id} className="flex items-center gap-3 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{v.companyName || v.contactName}</p>
                                        <p className="truncate text-xs text-stone-500">{[v.category, v.companyName && v.contactName].filter(Boolean).join(" · ")}</p>
                                    </div>
                                    {v.phone && (
                                        <>
                                            <a href={`https://wa.me/${tel(v.phone).replace("+", "")}`} className="rounded-full p-2 text-emerald-700 hover:bg-emerald-50" aria-label={`WhatsApp ${v.companyName}`}><MessageCircle className="h-5 w-5" /></a>
                                            <a href={`tel:${tel(v.phone)}`} className="rounded-full p-2 text-stone-700 hover:bg-stone-100" aria-label={`Call ${v.companyName}`}><Phone className="h-5 w-5" /></a>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
            )}
        </div>
    );
}
