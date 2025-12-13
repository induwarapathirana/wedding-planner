import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const merchant_id = formData.get('merchant_id');
        const order_id = formData.get('order_id');
        const payhere_amount = formData.get('payhere_amount');
        const payhere_currency = formData.get('payhere_currency');
        const status_code = formData.get('status_code');
        const md5sig = formData.get('md5sig');

        // Log the notification (In production, verify signature and update DB)
        console.log("--------------------------------------------------");
        console.log("PayHere Notification Received:");
        console.log(`Order: ${order_id}, Status: ${status_code}`);
        console.log(`Amount: ${payhere_amount} ${payhere_currency}`);
        console.log("--------------------------------------------------");

        // Todo: Verify MD5 Signature
        // const secret = process.env.PAYHERE_SECRET;
        // const localMd5sig = ... generate hash ...
        // if (localMd5sig !== md5sig) return NextResponse.json({ error: 'Signature Mismatch' }, { status: 400 });

        // Acknowledge receipt
        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("PayHere Notify Error:", err);
        return new NextResponse("Error", { status: 500 });
    }
}
