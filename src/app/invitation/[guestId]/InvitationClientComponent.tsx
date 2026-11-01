"use client";

import { useState } from "react";
import { Calendar, Check, MapPin, X } from "lucide-react";
import { saveHouseholdRsvp, type getInvitationData } from "./actions";
import { LANGS, STRINGS, fill, formatDate, type Lang } from "@/lib/rsvp-i18n";
import { cn } from "@/lib/utils";

type InvitationData = NonNullable<Awaited<ReturnType<typeof getInvitationData>>>;

const MEALS = ["Non-veg", "Veg", "Vegan", "Halal", "Kids"];

export default function InvitationClient({ data, initialLang }: { data: InvitationData; initialLang: Lang }) {
    const { guest, wedding } = data;
    const couple = [wedding.coupleName1, wedding.coupleName2].filter(Boolean).join(" & ");

    const [lang, setLang] = useState<Lang>(initialLang);
    const t = STRINGS[lang];
    const [status, setStatus] = useState(guest.rsvpStatus);
    const [editing, setEditing] = useState(guest.rsvpStatus === "pending");
    const [coming, setComing] = useState<boolean[]>(guest.coming);
    const [meal, setMeal] = useState(guest.mealPreference);
    const [phone, setPhone] = useState(guest.whatsappNumber);
    const [note, setNote] = useState(guest.note);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    const count = coming.filter(Boolean).length;
    const label = (name: string, i: number) => name || fill(t.guestN, { n: i + 1 });

    const send = async (override?: boolean[]) => {
        const reply = override ?? coming;
        setSaving(true);
        setError(false);
        const result = await saveHouseholdRsvp(guest.id, { coming: reply, mealPreference: meal, whatsappNumber: phone, note, language: lang });
        setSaving(false);
        if (!result.success) {
            setError(true);
            return;
        }
        if (override) setComing(override);
        setStatus(result.status!);
        setEditing(false);
    };

    return (
        <div lang={lang} className="flex min-h-screen flex-col items-center bg-[#FDFBF7] px-4 py-6 md:py-12">
            <div className="mb-4 flex gap-1 rounded-full border border-stone-200 bg-white p-1 text-sm" role="group" aria-label="Language">
                {LANGS.map((l) => (
                    <button
                        key={l.value}
                        onClick={() => setLang(l.value)}
                        aria-pressed={lang === l.value}
                        className={cn("rounded-full px-3 py-1 font-medium", lang === l.value ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800")}
                    >
                        {l.label}
                    </button>
                ))}
            </div>

            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-2xl">
                <div className="bg-[#1A1A1A] px-6 py-10 text-center md:py-14">
                    <p className={cn("mb-2 text-xs font-medium text-white/60", lang === "en" ? "uppercase tracking-[0.2em]" : "text-sm")}>{t.invitation}</p>
                    <h1 className="font-serif text-3xl font-medium text-white md:text-4xl">{couple}</h1>
                </div>

                <div className="space-y-8 p-6 text-center md:p-10">
                    <div className="space-y-1">
                        <p className="font-medium text-stone-500">{t.dear}</p>
                        <h2 className="font-serif text-3xl text-stone-800">{guest.name}</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6 border-y border-stone-100 py-6 sm:grid-cols-2">
                        {wedding.weddingDate && (
                            <div className="flex flex-col items-center gap-2">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-stone-600"><Calendar className="h-5 w-5" /></span>
                                <p className={cn("text-xs font-bold text-stone-400", lang === "en" && "uppercase tracking-wider")}>{t.when}</p>
                                <p className="font-medium text-stone-800">{formatDate(wedding.weddingDate, lang)}</p>
                            </div>
                        )}
                        {wedding.location && (
                            <div className={cn("flex flex-col items-center gap-2", !wedding.weddingDate && "sm:col-span-2")}>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-stone-600"><MapPin className="h-5 w-5" /></span>
                                <p className={cn("text-xs font-bold text-stone-400", lang === "en" && "uppercase tracking-wider")}>{t.where}</p>
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(wedding.location)}`} target="_blank" rel="noreferrer" className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4">
                                    {wedding.location}
                                </a>
                            </div>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-6 text-left">
                            <fieldset>
                                <legend className="w-full text-center text-lg font-medium text-stone-800">{t.question}</legend>
                                {coming.length > 1 && <p className="text-center text-xs text-stone-400">{t.tapToChange}</p>}
                                <div className="mt-4 space-y-2">
                                    {guest.members.map((name, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setComing((c) => c.map((v, j) => (j === i ? !v : v)))}
                                            aria-pressed={coming[i]}
                                            className={cn(
                                                "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                                                coming[i] ? "border-stone-900 bg-stone-50" : "border-stone-200 text-stone-400"
                                            )}
                                        >
                                            <span className={cn("font-medium", coming[i] ? "text-stone-800" : "line-through")}>{label(name, i)}</span>
                                            <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", coming[i] ? "text-emerald-700" : "text-stone-400")}>
                                                {coming[i] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                {coming[i] ? t.attending : t.notAttending}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            {count > 0 && (
                                <>
                                    <label className="block text-sm font-medium text-stone-600">
                                        {t.meal}
                                        <select value={meal} onChange={(e) => setMeal(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-900 focus:bg-white">
                                            <option value="">{t.noMeal}</option>
                                            {MEALS.map((m) => <option key={m} value={m}>{t.meals[m]}</option>)}
                                        </select>
                                    </label>
                                    <label className="block text-sm font-medium text-stone-600">
                                        {t.phone}
                                        <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-900 focus:bg-white" />
                                    </label>
                                </>
                            )}
                            <label className="block text-sm font-medium text-stone-600">
                                {t.message}
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-900 focus:bg-white" />
                            </label>

                            {error && <p className="text-center text-sm font-medium text-rose-700">{t.error}</p>}

                            <div className="space-y-2">
                                {coming.length > 1 && count > 0 && (
                                    <p className="text-center text-sm font-medium text-stone-600">{fill(t.countComing, { n: count, total: coming.length })}</p>
                                )}
                                <button
                                    onClick={() => send()}
                                    disabled={saving || count === 0}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-4 font-medium text-white transition hover:bg-stone-800 disabled:opacity-40"
                                >
                                    <Check className="h-4 w-4" />
                                    {saving ? t.sending : t.send}
                                </button>
                                <button
                                    onClick={() => send(coming.map(() => false))}
                                    disabled={saving}
                                    className="w-full rounded-xl px-6 py-3 text-sm font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                                >
                                    {t.noneComing}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 rounded-2xl bg-stone-50 p-8">
                            <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", status === "accepted" ? "bg-green-100 text-green-600" : "bg-stone-200 text-stone-500")}>
                                {status === "accepted" ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
                            </div>
                            <p className="font-serif text-xl text-stone-800">{status === "accepted" ? t.thanksYes : t.thanksNo}</p>
                            {status === "accepted" && coming.length > 1 && (
                                <p className="text-sm text-stone-500">{guest.members.flatMap((n, i) => (coming[i] ? [label(n, i)] : [])).join(", ")}</p>
                            )}
                            <button onClick={() => setEditing(true)} className="text-sm text-stone-400 underline hover:text-stone-600">{t.change}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
