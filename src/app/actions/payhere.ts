'use server';

import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePayHereHash } from "@/lib/payhere";
import { CURRENCY, PRICES } from "@/lib/billing";

/**
 * Starts a PayHere checkout. The amount comes from PRICES on the server and is
 * recorded on an Order; the payment notification is only honoured when the
 * paid amount matches that order (see /api/payhere/notify).
 */

type CheckoutInput =
    | { kind: "planner_pro"; interval: "month" | "year"; phone: string; city: string }
    | { kind: "wedding_premium"; weddingId: string; phone: string; city: string };

const PLANNER_ROLES = ["planner", "vendor", "pro"];

export async function createCheckout(input: CheckoutInput) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Please sign in again");

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const secret = process.env.PAYHERE_SECRET;
    if (!merchantId || !secret) throw new Error("Payments aren't set up yet");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
    if (!user) throw new Error("Account not found");

    const phone = String(input.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
    const city = String(input.city ?? "").trim().slice(0, 60);
    if (phone.length < 9) throw new Error("Enter a phone number for the receipt");
    if (!city) throw new Error("Enter your city");

    let amount: number;
    let items: string;
    let recurrence: string | null = null;
    let weddingId: string | null = null;
    let interval: string | null = null;

    if (input.kind === "planner_pro") {
        if (!PLANNER_ROLES.includes(user.role)) throw new Error("Planner Pro is for planner accounts");
        const period = input.interval === "year" ? "year" : "month";
        interval = period;
        amount = PRICES.planner_pro[period];
        items = `Planner Pro (${interval === "year" ? "yearly" : "monthly"})`;
        recurrence = interval === "year" ? "1 Year" : "1 Month";
    } else {
        const collab = await prisma.collaborator.findUnique({
            where: { weddingId_userId: { weddingId: input.weddingId, userId } },
            select: { role: true, wedding: { select: { tier: true, coupleName1: true, coupleName2: true } } },
        });
        if (!collab || collab.role === "viewer") throw new Error("You can't upgrade this wedding");
        if (collab.wedding.tier === "premium") throw new Error("This wedding is already Premium");
        weddingId = input.weddingId;
        amount = PRICES.wedding_premium;
        items = `Premium: ${[collab.wedding.coupleName1, collab.wedding.coupleName2].filter(Boolean).join(" & ")}`.slice(0, 100);
    }

    const order = await prisma.order.create({
        data: { userId, kind: input.kind, weddingId, interval, amount, currency: CURRENCY },
    });

    const h = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const [firstName, ...rest] = (user.name || user.email || "Customer").split(" ");
    const back = input.kind === "planner_pro" ? "/dashboard/billing" : `/dashboard/settings?weddingId=${weddingId}`;

    const fields: Record<string, string> = {
        merchant_id: merchantId,
        return_url: `${origin}${back}${back.includes("?") ? "&" : "?"}paid=${order.id}`,
        cancel_url: `${origin}${back}`,
        notify_url: `${origin}/api/payhere/notify`,
        order_id: order.id,
        items,
        currency: CURRENCY,
        amount: amount.toFixed(2),
        first_name: firstName.slice(0, 50),
        last_name: (rest.join(" ") || "-").slice(0, 50),
        email: user.email ?? "",
        phone,
        address: city,
        city,
        country: "Sri Lanka",
        hash: generatePayHereHash(merchantId, order.id, amount, CURRENCY, secret),
    };
    if (recurrence) {
        fields.recurrence = recurrence;
        fields.duration = "Forever";
    }

    return { url: `${process.env.PAYHERE_URL || "https://sandbox.payhere.lk"}/pay/checkout`, fields };
}

/** Whether a checkout has been confirmed by PayHere yet (for the return page). */
export async function getOrderStatus(orderId: string) {
    const session = await auth();
    if (!session?.user?.id || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: session.user.id }, select: { status: true, kind: true } });
    return order;
}
