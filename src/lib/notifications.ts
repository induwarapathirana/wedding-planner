import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@vowandvenue.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
    endpoint: string,
    p256dhKey: string,
    authKey: string,
    payload: NotificationPayload
) {
    try {
        const subscription = {
            endpoint,
            keys: {
                p256dh: p256dhKey,
                auth: authKey,
            },
        };

        const result = await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );

        console.log('Push notification sent successfully:', result);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending push notification:', error);

        // If subscription is no longer valid, remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
            await removeInvalidSubscription(endpoint);
        }

        return { success: false, error };
    }
}

/**
 * Remove invalid subscription from database
 */
async function removeInvalidSubscription(endpoint: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    console.log('Removed invalid subscription:', endpoint);
}

/**
 * Send notifications for upcoming due dates
 */
export async function sendDueDateNotifications() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today and dates for notification triggers
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

    // Query budget items with upcoming due dates
    const { data: budgetItems } = await supabase
        .from('budget_items')
        .select('*, weddings!inner(id)')
        .or(`due_date.eq.${tomorrowStr},due_date.eq.${threeDaysStr}`)
        .is('paid_at', null);

    // Query checklist items with upcoming due dates
    const { data: checklistItems } = await supabase
        .from('checklist_items')
        .select('*, weddings!inner(id)')
        .or(`due_date.eq.${tomorrowStr},due_date.eq.${threeDaysStr}`)
        .is('is_completed', false);

    const notifications: Array<{
        weddingId: string;
        payload: NotificationPayload;
    }> = [];

    // Create notifications for budget items
    budgetItems?.forEach((item) => {
        const daysUntil = item.due_date === tomorrowStr ? 1 : 3;
        notifications.push({
            weddingId: item.wedding_id,
            payload: {
                title: `💰 Payment Due ${daysUntil === 1 ? 'Tomorrow' : 'in 3 Days'}`,
                body: `${item.name} - ${item.estimated_cost} ${daysUntil === 1 ? 'due tomorrow' : 'due in 3 days'}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: `budget-${item.id}`,
                data: { url: '/dashboard/budget' },
            },
        });
    });

    // Create notifications for checklist items
    checklistItems?.forEach((item) => {
        const daysUntil = item.due_date === tomorrowStr ? 1 : 3;
        notifications.push({
            weddingId: item.wedding_id,
            payload: {
                title: `✅ Task Due ${daysUntil === 1 ? 'Tomorrow' : 'in 3 Days'}`,
                body: `${item.title} ${daysUntil === 1 ? 'due tomorrow' : 'due in 3 days'}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: `checklist-${item.id}`,
                data: { url: '/dashboard/checklist' },
            },
        });
    });

    // Get all subscriptions for affected weddings
    const weddingIds = [...new Set(notifications.map((n) => n.weddingId))];
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('wedding_id', weddingIds);

    // Send notifications
    const results = [];
    for (const notification of notifications) {
        const relevantSubs = subscriptions?.filter(
            (sub) => sub.wedding_id === notification.weddingId
        );

        for (const sub of relevantSubs || []) {
            const result = await sendPushNotification(
                sub.endpoint,
                sub.p256dh_key,
                sub.auth_key,
                notification.payload
            );
            results.push(result);
        }
    }

    return {
        queriedDates: { today: todayStr, tomorrow: tomorrowStr, threeDaysOut: threeDaysStr },
        foundItems: (budgetItems?.length || 0) + (checklistItems?.length || 0),
        budgetItemsCount: budgetItems?.length || 0,
        checklistItemsCount: checklistItems?.length || 0,
        subscriptionsCount: subscriptions?.length || 0,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        total: results.length,
    };
}
