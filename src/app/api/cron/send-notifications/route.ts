import { NextRequest, NextResponse } from 'next/server';
import { sendDueDateNotifications } from '@/lib/notifications';

// This endpoint should be called daily by a cron job
// Example: Vercel Cron, GitHub Actions, or external service like Cron-job.org

export async function GET(request: NextRequest) {
    // Verify the request is authorized (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') as 'today' | 'tomorrow' | 'three_days' | null;

        console.log(`[Cron] Running notification check for type: ${type || 'all'}...`);
        const results = await sendDueDateNotifications(type || undefined);

        console.log('[Cron] Notification results:', results);

        return NextResponse.json({
            success: true,
            message: 'Notifications sent successfully',
            results,
        });
    } catch (error) {
        console.error('[Cron] Error sending notifications:', error);
        return NextResponse.json(
            {
                error: 'Failed to send notifications',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
