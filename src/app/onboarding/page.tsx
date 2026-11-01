"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, PartyPopper } from "lucide-react";
import { createWedding } from "@/app/actions/data";
import { CURRENCIES } from "@/lib/constants";
import { BUDGET_TEMPLATE, TRADITIONS, checklistFor, type Tradition } from "@/lib/templates";
import { cn } from "@/lib/utils";

const STEPS = ["The two of you", "The wedding", "Traditions", "Your plan"];

const field =
    "mt-1 block w-full rounded-xl border border-border bg-white px-4 py-3 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        coupleName1: "",
        coupleName2: "",
        weddingDate: "",
        ceremonyTime: "",
        location: "",
        targetGuestCount: "",
        estimatedBudget: "",
        currency: "LKR",
        traditions: ["poruwa", "homecoming"] as Tradition[],
        setup: { checklist: true, budget: true, dayOf: true },
    });
    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

    const canContinue = step === 0 ? form.coupleName1.trim() && form.coupleName2.trim() : true;
    const taskCount = checklistFor(form.traditions).length;
    const symbol = CURRENCIES.find((c) => c.code === form.currency)?.symbol ?? form.currency;
    const budget = Number(form.estimatedBudget) || 0;

    const submit = async () => {
        setSaving(true);
        try {
            const wedding = await createWedding({
                ...form,
                weddingDate: form.weddingDate || null,
                ceremonyTime: form.ceremonyTime || null,
                targetGuestCount: form.targetGuestCount || null,
                estimatedBudget: form.estimatedBudget || 0,
                tzOffsetMinutes: new Date().getTimezoneOffset(),
            });
            try {
                localStorage.setItem("current_wedding_id", wedding.id);
            } catch {}
            router.push(`/dashboard?weddingId=${wedding.id}&welcome=true`);
        } catch (e) {
            toast.error((e as Error).message || "Couldn't create your wedding. Please try again.");
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <PartyPopper className="h-7 w-7" />
                    </div>
                    <h1 className="font-serif text-3xl font-bold">Let's set up your wedding</h1>
                    <p className="mt-1 text-muted-foreground">Four quick steps. Skip anything you don't know yet; it can all change later.</p>
                </div>

                <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
                    {STEPS.map((label, i) => (
                        <li key={label} className="flex flex-1 flex-col gap-1.5">
                            <span className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-gray-200")} />
                            <span className={cn("text-xs", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
                        </li>
                    ))}
                </ol>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (step < STEPS.length - 1) setStep(step + 1);
                        else submit();
                    }}
                    className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8"
                >
                    {step === 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                                Your name
                                <input id="name1" required autoFocus value={form.coupleName1} onChange={(e) => set("coupleName1", e.target.value)} className={field} placeholder="Kavindi" />
                            </label>
                            <label className="block text-sm font-medium">
                                Your partner's name
                                <input id="name2" required value={form.coupleName2} onChange={(e) => set("coupleName2", e.target.value)} className={field} placeholder="Ashan" />
                            </label>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium">
                                    Wedding date
                                    <input id="date" type="date" value={form.weddingDate} onChange={(e) => set("weddingDate", e.target.value)} className={field} />
                                </label>
                                <label className="block text-sm font-medium">
                                    Ceremony or nekath time
                                    <input id="time" type="time" value={form.ceremonyTime} onChange={(e) => set("ceremonyTime", e.target.value)} className={field} />
                                </label>
                            </div>
                            <label className="block text-sm font-medium">
                                City or venue
                                <input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} className={field} placeholder="Colombo" />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <label className="block text-sm font-medium">
                                    Expected guests
                                    <input id="guests" type="number" min={0} inputMode="numeric" value={form.targetGuestCount} onChange={(e) => set("targetGuestCount", e.target.value)} className={field} placeholder="300" />
                                </label>
                                <label className="block text-sm font-medium sm:col-span-2">
                                    Total budget
                                    <div className="flex gap-2">
                                        <select id="currency" value={form.currency} onChange={(e) => set("currency", e.target.value)} className={cn(field, "w-28")} aria-label="Currency">
                                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                                        </select>
                                        <input id="budget" type="number" min={0} inputMode="decimal" value={form.estimatedBudget} onChange={(e) => set("estimatedBudget", e.target.value)} className={field} placeholder="3500000" />
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <fieldset>
                            <legend className="text-sm font-medium">Which of these are part of your wedding?</legend>
                            <p className="text-sm text-muted-foreground">We'll add the tasks each one needs.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {TRADITIONS.map((t) => {
                                    const on = form.traditions.includes(t.value);
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => set("traditions", on ? form.traditions.filter((x) => x !== t.value) : [...form.traditions, t.value])}
                                            className={cn(
                                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                                on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-white text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {on && <Check className="h-4 w-4" />}
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    )}

                    {step === 3 && (
                        <fieldset className="space-y-3">
                            <legend className="text-sm font-medium">We'll set these up for you. Everything stays editable.</legend>
                            {[
                                {
                                    key: "checklist" as const,
                                    title: `Checklist with ${taskCount} tasks`,
                                    detail: form.weddingDate ? "Due dates counted back from your wedding date, and they move if the date changes." : "Add your date later and the due dates fill in.",
                                },
                                {
                                    key: "budget" as const,
                                    title: `Budget split into ${BUDGET_TEMPLATE.length} categories`,
                                    detail: budget
                                        ? `For example, ${symbol} ${Math.round(budget * 0.45).toLocaleString()} for venue & food and ${symbol} ${Math.round(budget * 0.12).toLocaleString()} for photo & video.`
                                        : "Each category gets a share once you enter a total.",
                                },
                                {
                                    key: "dayOf" as const,
                                    title: "Wedding-day timeline",
                                    detail: form.weddingDate ? `About 10 slots around a ${form.ceremonyTime || "10:00"} ceremony.` : "Needs a wedding date.",
                                    disabled: !form.weddingDate,
                                },
                            ].map((opt) => (
                                <label
                                    key={opt.key}
                                    className={cn(
                                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                                        form.setup[opt.key] && !opt.disabled ? "border-primary bg-primary/5" : "border-border",
                                        opt.disabled && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.setup[opt.key] && !opt.disabled}
                                        disabled={opt.disabled}
                                        onChange={(e) => set("setup", { ...form.setup, [opt.key]: e.target.checked })}
                                        className="mt-1 h-4 w-4 accent-[var(--primary)]"
                                    />
                                    <span>
                                        <span className="block font-semibold">{opt.title}</span>
                                        <span className="block text-sm text-muted-foreground">{opt.detail}</span>
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                        {step > 0 ? (
                            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        ) : <span />}
                        <button
                            type="submit"
                            disabled={!canContinue || saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
                        >
                            {step < STEPS.length - 1 ? (<>Continue <ArrowRight className="h-4 w-4" /></>) : saving ? "Setting up…" : "Create my plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
