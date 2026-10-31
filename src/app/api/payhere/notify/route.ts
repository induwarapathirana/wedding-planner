import { NextRequest, NextResponse } from 'next/server';
import { verifyPayHereSignature } from '@/lib/payhere';

export const dynamic = 'force-dynamic';

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

        const merchantSecret = process.env.PAYHERE_SECRET;

        if (!merchantSecret) {
            console.error("PAYHERE_SECRET not configured");
            return new NextResponse("Server Config Error", { status: 500 });
        }

        // SECURITY: Verify the signature before processing
        if (!md5sig || !verifyPayHereSignature(
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            merchantSecret
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
            try {
                const { prisma } = await import('@/lib/prisma');
                // Update wedding tier and payment ID via Prisma
                await prisma.wedding.update({
                    where: { id: weddingId },
                    data: {
                        tier: 'premium'
                    }
                });
            } catch (error) {
                console.error("DB Update Failed:", error);
                return new NextResponse("DB Update Failed", { status: 500 });
            }

            console.log(`Wedding ${weddingId} upgraded to Premium!`);
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("PayHere Notify Error:", err);
        return new NextResponse("Error", { status: 500 });
    }
}
