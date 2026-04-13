import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { subscription, userId, weddingId } = await request.json();

        if (!subscription || !userId || !weddingId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { endpoint, keys } = subscription;
        const { p256dh, auth } = keys;

        // Upsert subscription (update if exists, insert if new)
        try {
            const { prisma } = await import('@/lib/prisma');
            const result = await prisma.pushSubscription.upsert({
                where: { endpoint },
                update: {
                    userId,
                    p256dh,
                    auth,
                },
                create: {
                    userId,
                    endpoint,
                    p256dh,
                    auth,
                }
            });
            return NextResponse.json({ success: true, data: result });
        } catch (error: any) {
            console.error('Error saving push subscription:', error);
            return NextResponse.json(
                {
                    error: 'Failed to save subscription',
                    details: error.message,
                },
                { status: 500 }
            );
        }

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

        try {
            const { prisma } = await import('@/lib/prisma');
            await prisma.pushSubscription.deleteMany({
                where: { endpoint }
            });
            return NextResponse.json({ success: true });
        } catch (error) {
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
