import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayHereSignature } from '@/lib/payhere';

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
            // Initialize Supabase Admin client
            // Use SERVICE_ROLE_KEY if available for direct DB update (bypassing RLS)
            // Fallback to ANON_KEY which relies on RPC permissions
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

            const supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // Try Direct Update first (if Service Key exists)
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const { error } = await supabase
                    .from('weddings')
                    .update({
                        payment_id: order_id,
                        tier: 'premium' // Ensure tier is set to premium
                    })
                    .eq('id', weddingId);

                if (error) {
                    console.error("DB Update Failed:", error);
                    return new NextResponse("DB Update Failed", { status: 500 });
                }
            } else {
                // Fallback to RPC if only Anon Key
                const { error } = await supabase.rpc('upgrade_wedding_tier', {
                    wedding_id: weddingId,
                    payment_id: order_id
                });

                if (error) {
                    console.error("RPC Upgrade Failed:", error);
                    return new NextResponse("RPC Failed", { status: 500 });
                }
            }

            console.log(`Wedding ${weddingId} upgraded to Premium!`);
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err) {
        console.error("PayHere Notify Error:", err);
        return new NextResponse("Error", { status: 500 });
    }
}
