"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, X } from "lucide-react";
import { createCheckout } from "@/app/actions/payhere";

type Props = (
    | { kind: "planner_pro"; interval: "month" | "year" }
    | { kind: "wedding_premium"; weddingId: string }
) & { label: string; className?: string };

/**
 * Asks for the two details PayHere needs that we don't keep (phone, city),
 * then hands over to PayHere's checkout. The price is set on the server.
 */
export function CheckoutButton({ label, className, ...order }: Props) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("billing_details") || "") as { phone: string; city: string };
        } catch {
            return { phone: "", city: "" };
        }
    });

    const pay = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            localStorage.setItem("billing_details", JSON.stringify(details));
        } catch {}
        try {
            const { url, fields } = await createCheckout({ ...order, ...details } as Parameters<typeof createCheckout>[0]);
            const form = document.createElement("form");
            form.method = "POST";
            form.action = url;
            for (const [name, value] of Object.entries(fields)) {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                input.value = value;
                form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            toast.error((err as Error).message);
            setSaving(false);
        }
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={className}>
                {label}
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && setOpen(false)}>
                    <form onSubmit={pay} role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 id="checkout-title" className="text-lg font-bold">Pay with PayHere</h2>
                                <p className="text-sm text-gray-500">PayHere needs these for the receipt. Card details are entered on PayHere, not here.</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
                        </div>
                        <label className="mt-4 block text-sm font-medium">
                            Phone
                            <input required type="tel" inputMode="tel" value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))} placeholder="077 123 4567" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
                        </label>
                        <label className="mt-3 block text-sm font-medium">
                            City
                            <input required value={details.city} onChange={(e) => setDetails((d) => ({ ...d, city: e.target.value }))} placeholder="Colombo" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
                        </label>
                        <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                            <CreditCard className="h-4 w-4" /> {saving ? "Opening PayHere…" : "Continue to payment"}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
