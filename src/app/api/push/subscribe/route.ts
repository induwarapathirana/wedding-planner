import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL: Missing Supabase environment variables in subscription API');
}

export async function POST(request: NextRequest) {
    try {
        const { subscription, userId, weddingId } = await request.json();

        if (!subscription || !userId || !weddingId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing Supabase keys. Please check Vercel environment variables.' },
                { status: 500 }
            );
        }

        // Create Supabase client with service role key
        const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string);

        // Extract subscription details
        const { endpoint, keys } = subscription;
        const { p256dh, auth } = keys;

        // Upsert subscription (update if exists, insert if new)
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: userId,
                    wedding_id: weddingId,
                    endpoint,
                    p256dh_key: p256dh,
                    auth_key: auth,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'endpoint',
                }
            )
            .select()
            .single();

        if (error) {
            console.error('Error saving push subscription:', error);
            return NextResponse.json(
                {
                    error: 'Failed to save subscription',
                    details: error.message,
                    code: error.code
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in push subscribe endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Delete subscription
export async function DELETE(request: NextRequest) {
    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return NextResponse.json(
                { error: 'Endpoint required' },
                { status: 400 }
            );
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing Supabase keys.' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string);

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) {
            console.error('Error deleting push subscription:', error);
            return NextResponse.json(
                { error: 'Failed to delete subscription' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in push unsubscribe endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
