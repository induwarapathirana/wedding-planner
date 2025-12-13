'use server';

import { generatePayHereHash } from "@/lib/payhere";

export async function signPaymentRequest(orderId: string, amount: number, currency: string) {
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const secret = process.env.PAYHERE_SECRET;

    if (!merchantId || !secret) {
        throw new Error("PayHere configuration missing");
    }

    const hash = generatePayHereHash(merchantId, orderId, amount, currency, secret);

    return {
        merchant_id: merchantId,
        hash: hash,
        url: process.env.PAYHERE_URL || 'https://sandbox.payhere.lk',
    };
}
