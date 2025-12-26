import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for webhook updates
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Verify PayHere webhook signature
 * Formula: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(merchant_secret).toUpperCase()).toUpperCase()
 */
function verifyPayHereSignature(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
    statusCode: string,
    receivedSignature: string
): boolean {
    const merchantSecret = process.env.PAYHERE_SECRET;

    if (!merchantSecret) {
        console.error("PAYHERE_SECRET not configured - cannot verify signature");
        return false;
    }

    // 1. Hash the merchant secret
    const hashedSecret = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    // 2. Create the verification string
    const stringToHash = merchantId + orderId + amount + currency + statusCode + hashedSecret;

    // 3. Generate expected signature
    const expectedSignature = crypto
        .createHash('md5')
        .update(stringToHash)
        .digest('hex')
        .toUpperCase();

    // 4. Compare signatures (timing-safe comparison)
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(receivedSignature.toUpperCase())
        );
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const merchant_id = formData.get('merchant_id') as string;
        const order_id = formData.get('order_id') as string;
        const payhere_amount = formData.get('payhere_amount') as string;
        const payhere_currency = formData.get('payhere_currency') as string;
        const status_code = formData.get('status_code') as string;
        const md5sig = formData.get('md5sig') as string;

        // Log the notification
        console.log("--------------------------------------------------");
        console.log("PayHere Notification Received:");
        console.log(`Order: ${order_id}, Status: ${status_code}`);
        console.log("--------------------------------------------------");

        // SECURITY: Verify the signature before processing
        if (!md5sig || !verifyPayHereSignature(
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig
        )) {
            console.error("⚠️ SECURITY ALERT: Invalid PayHere signature - possible spoofing attempt!");
            return new NextResponse("Invalid signature", { status: 403 });
        }

        console.log("✅ PayHere signature verified successfully");

        // Parse Wedding ID from Order ID (Format: ORDER_{UUID}_{TIMESTAMP})
        const parts = order_id.split('_');
        if (parts.length < 3) {
            console.error("Invalid Order ID Format");
            return new NextResponse("Invalid Order ID", { status: 400 });
        }
        const weddingId = parts[1];

        // Status code 2 means Success
        if (status_code === '2') {
            const { error } = await supabase.rpc('upgrade_wedding_tier', {
                wedding_id: weddingId,
                payment_id: order_id // Store the Order ID as proof of payment
            });

            if (error) {
                console.error("Failed to upgrade tier:", error);
                // Note: Direct update will likely fail due to RLS without user context
                // The RPC function handles this securely now
            } else {
                console.log(`Wedding ${weddingId} upgraded to Premium!`);
            }
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("PayHere Notify Error:", err);
        return new NextResponse("Error", { status: 500 });
    }
}
