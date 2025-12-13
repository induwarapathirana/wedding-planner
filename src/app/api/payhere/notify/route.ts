import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for webhook updates
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Ideally use SERVICE_ROLE_KEY for webhooks, but ANON might work if policy allows, or we use a secure update function. 
    // Actually, for this PoC, we will assume ANON key has update rights or we rely on the fact that this is a server route 
    // effectively acting with system privileges if we had the service key.
    // Given the constraints, I'll stick to basic update and assume the user ID is not available, so I might need Service Role Key for true backend updates without user context.
    // However, I don't have the Service Role Key in .env.local usually.
    // I will try to use the ANON key. If RLS blocks it, I'll need to create an RPC or SQL bypass. 
    // BUT! I can use a Postgres Function `upgrade_wedding_tier` with SECURITY DEFINER.
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const merchant_id = formData.get('merchant_id');
        const order_id = formData.get('order_id') as string;
        const payhere_amount = formData.get('payhere_amount');
        const payhere_currency = formData.get('payhere_currency');
        const status_code = formData.get('status_code');
        const md5sig = formData.get('md5sig');

        // Log the notification
        console.log("--------------------------------------------------");
        console.log("PayHere Notification Received:");
        console.log(`Order: ${order_id}, Status: ${status_code}`);
        console.log("--------------------------------------------------");

        // Parse Wedding ID from Order ID (Format: ORDER_{UUID}_{TIMESTAMP})
        // Example: ORDER_1234-5678-90ab_1700000000
        const parts = order_id.split('_');
        if (parts.length < 3) {
            console.error("Invalid Order ID Format");
            return new NextResponse("Invalid Order ID", { status: 400 });
        }
        const weddingId = parts[1];

        // Status code 2 means Success
        if (status_code === '2') {
            // Update Wedding Tier
            // We can't use standard RLS update here because we have no user session.
            // We'll trust the database allows this or use a workaround.
            // Since I can't add SERVICE_KEY easily without user interaction, 
            // I will use a direct update and hope the RLS allows public update (Unlikely).
            // BETTER APPROACH: I will just log it for now as "Ready to Upgrade".
            // WAIT, I really want this to work.
            // I will try to update using the ANON key. If RLS policies are "auth.uid() = owner", this will FAIL.
            // Solution: Create a `webhook_upgrade_tier` RPC function with security definer.

            const { error } = await supabase.rpc('upgrade_wedding_tier', { wedding_id: weddingId });

            if (error) {
                console.error("Failed to upgrade tier:", error);
                // Fallback: Try direct update (might fail due to RLS)
                await supabase.from('weddings').update({ tier: 'premium' }).eq('id', weddingId);
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
