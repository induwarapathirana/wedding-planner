"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Crown, Loader2 } from "lucide-react";
import { getMyOrders, getMyPlan } from "@/app/actions/data";
import { getOrderStatus } from "@/app/actions/payhere";
import { CheckoutButton } from "@/components/CheckoutButton";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICE, lkr } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Plan = NonNullable<Awaited<ReturnType<typeof getMyPlan>>>;
type Order = Awaited<ReturnType<typeof getMyOrders>>[number];

const DAY = 86_400_000;
const daysLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY)) : 0);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export default function BillingPage() {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState<"waiting" | "paid" | "failed" | null>(null);

    useEffect(() => {
        const load = async () => {
            const [p, o] = await Promise.all([getMyPlan(), getMyOrders()]);
            setPlan(p);
            setOrders(o);
            setLoading(false);
        };
        load();

        // Back from PayHere: wait for its confirmation to arrive
        const paid = new URLSearchParams(window.location.search).get("paid");
        if (!paid) return;
        setConfirming("waiting");
        let tries = 0;
        const timer = setInterval(async () => {
            tries++;
            const order = await getOrderStatus(paid);
            if (order?.status === "paid" || order?.status === "failed" || tries > 20) {
                clearInterval(timer);
                setConfirming(order?.status === "paid" ? "paid" : order?.status === "failed" ? "failed" : null);
                window.history.replaceState({}, "", "/dashboard/billing");
                load();
            }
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    if (loading) return <div className="flex h-[40vh] items-center justify-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
    if (!plan?.isPlanner) {
        return (
            <div className="py-20 text-center">
                <p className="text-muted-foreground">Billing here is for planner accounts. Couples can upgrade a wedding from its Settings page.</p>
                <Link href="/dashboard/settings" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 font-medium text-white">Go to Settings</Link>
            </div>
        );
    }

    const subscribed = plan.state === "active" || plan.state === "grace";
    const status: Record<Plan["state"], { title: string; detail: string; tone: string }> = {
        trial: { title: "Planner Pro trial", detail: `${daysLeft(plan.trialEndsAt)} days left, until ${fmt(plan.trialEndsAt)}. Subscribe any time to keep Pro afterwards.`, tone: "border-violet-200 bg-violet-50" },
        active: { title: `Planner Pro, ${plan.interval === "year" ? "yearly" : "monthly"}`, detail: `Paid through ${fmt(plan.proUntil)}. Renews automatically through PayHere.`, tone: "border-emerald-200 bg-emerald-50" },
        grace: { title: "Payment didn't go through", detail: `PayHere couldn't take your last payment. Pro stays on until ${fmt(plan.graceUntil)}; update your card with PayHere or subscribe again below.`, tone: "border-rose-200 bg-rose-50" },
        cancelled_until_end: { title: "Planner Pro, cancelled", detail: `Your subscription won't renew. Pro stays on until ${fmt(plan.proUntil)}.`, tone: "border-amber-200 bg-amber-50" },
        free: { title: "Free plan", detail: `${plan.activeWeddings} of ${plan.freeLimit} client weddings in progress. Nothing is ever deleted when Pro ends.`, tone: "border-gray-200 bg-gray-50" },
        not_planner: { title: "", detail: "", tone: "" },
    };
    const s = status[plan.state];

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-8">
            <div>
                <h1 className="font-serif text-3xl font-bold">Billing</h1>
                <p className="text-sm text-muted-foreground">Your Planner Pro plan and payments.</p>
            </div>

            {confirming === "waiting" && <p className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for PayHere to confirm your payment…</p>}
            {confirming === "paid" && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Payment confirmed. Welcome to Planner Pro!</p>}
            {confirming === "failed" && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">The payment didn&apos;t go through. You haven&apos;t been charged.</p>}

            <section className={cn("rounded-2xl border p-5", s.tone)}>
                <p className="flex items-center gap-2 font-semibold">{plan.isPro && <Crown className="h-4 w-4 text-amber-600" />}{s.title}</p>
                <p className="mt-1 text-sm text-gray-700">{s.detail}</p>
            </section>

            {!subscribed && (
                <section className="grid gap-4 md:grid-cols-2">
                    {([
                        { interval: "month" as const, price: PRO_PRICE.month, per: "a month", note: "Cancel any time" },
                        { interval: "year" as const, price: PRO_PRICE.year, per: "a year", note: "Two months free" },
                    ]).map((p) => (
                        <div key={p.interval} className={cn("flex flex-col rounded-2xl border bg-white p-5", p.interval === "year" ? "border-primary shadow-md" : "border-gray-200")}>
                            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{p.interval === "year" ? "Yearly" : "Monthly"}</p>
                            <p className="mt-1 text-3xl font-bold">{lkr(p.price)} <span className="text-base font-normal text-gray-500">{p.per}</span></p>
                            <p className="text-sm text-emerald-700">{p.note}</p>
                            <CheckoutButton
                                kind="planner_pro"
                                interval={p.interval}
                                label={plan.state === "trial" ? "Subscribe after my trial" : "Subscribe"}
                                className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                            />
                        </div>
                    ))}
                    {plan.state === "trial" && (
                        <p className="text-xs text-gray-500 md:col-span-2">Subscribing during your trial starts the paid plan straight away; the trial days aren&apos;t added on top.</p>
                    )}
                </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="font-semibold">Free</p>
                    <ul className="mt-3 space-y-2 text-sm">{FREE_FEATURES.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />{f}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="flex items-center gap-2 font-semibold"><Crown className="h-4 w-4 text-amber-600" /> Planner Pro adds</p>
                    <ul className="mt-3 space-y-2 text-sm">{PRO_FEATURES.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{f}</li>)}</ul>
                </div>
            </section>

            {subscribed && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
                    <p className="font-semibold">Cancel or change your card</p>
                    <p className="mt-1 text-gray-600">
                        Subscriptions are handled by PayHere. Use the link in your PayHere payment email, or contact PayHere support, to cancel or update your card. If you cancel, Pro stays on until the end of the period you&apos;ve paid for.
                    </p>
                </section>
            )}

            {orders.length > 0 && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="font-semibold">Payments</p>
                    <table className="mt-3 w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="py-2">Date</th><th>What</th><th className="text-right">Amount</th><th className="text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} className="border-b border-gray-100">
                                    <td className="py-2">{fmt((o.paidAt ?? o.createdAt) as unknown as string)}</td>
                                    <td>{o.kind === "planner_pro" ? `Planner Pro (${o.interval === "year" ? "yearly" : "monthly"})` : "Wedding Premium"}</td>
                                    <td className="text-right tabular-nums">{o.currency} {Number(o.amount).toLocaleString("en")}</td>
                                    <td className={cn("text-right capitalize", o.status === "paid" ? "text-emerald-700" : "text-gray-500")}>{o.status.replace("_", " ")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </div>
    );
}
