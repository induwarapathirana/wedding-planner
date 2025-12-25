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
/**
 * Send notifications for upcoming due dates
 */
export async function sendDueDateNotifications(scheduleType?: 'today' | 'tomorrow' | 'three_days') {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

    // Determine filter date based on scheduleType
    let dateFilter = '';

    if (scheduleType === 'today') {
        dateFilter = `due_date.eq.${todayStr}`;
    } else if (scheduleType === 'tomorrow') {
        dateFilter = `due_date.eq.${tomorrowStr}`;
    } else if (scheduleType === 'three_days') {
        dateFilter = `due_date.eq.${threeDaysStr}`;
    } else {
        // Fallback or "all" check (legacy behavior + today)
        dateFilter = `due_date.eq.${todayStr},due_date.eq.${tomorrowStr},due_date.eq.${threeDaysStr}`;
    }

    // Query budget items
    let budgetQuery = supabase
        .from('budget_items')
        .select('*, weddings!inner(id)')
        .is('paid_at', null);

    if (scheduleType) {
        budgetQuery = budgetQuery.filter('due_date', 'eq', scheduleType === 'today' ? todayStr : (scheduleType === 'tomorrow' ? tomorrowStr : threeDaysStr));
    } else {
        budgetQuery = budgetQuery.or(dateFilter);
    }

    const { data: budgetItems } = await budgetQuery;

    // Query checklist items
    let checklistQuery = supabase
        .from('checklist_items')
        .select('*, weddings!inner(id)')
        .is('is_completed', false);

    if (scheduleType) {
        checklistQuery = checklistQuery.filter('due_date', 'eq', scheduleType === 'today' ? todayStr : (scheduleType === 'tomorrow' ? tomorrowStr : threeDaysStr));
    } else {
        checklistQuery = checklistQuery.or(dateFilter);
    }

    const { data: checklistItems } = await checklistQuery;

    const notifications: Array<{
        weddingId: string;
        payload: NotificationPayload;
    }> = [];

    // Helper to format body based on due date
    const getTimingText = (dueDate: string) => {
        if (dueDate === todayStr) return 'due today';
        if (dueDate === tomorrowStr) return 'due tomorrow';
        if (dueDate === threeDaysStr) return 'due in 3 days';
        return 'due soon';
    };

    const getTitleText = (dueDate: string) => {
        if (dueDate === todayStr) return 'Due Today! 🚨';
        if (dueDate === tomorrowStr) return 'Due Tomorrow ⏰';
        if (dueDate === threeDaysStr) return 'Head\'s Up (3 Days) 📅';
        return 'Upcoming Deadline';
    };

    // Create notifications for budget items
    budgetItems?.forEach((item) => {
        notifications.push({
            weddingId: item.wedding_id,
            payload: {
                title: `💰 Payment ${getTitleText(item.due_date)}`,
                body: `${item.name} ($${item.estimated_cost}) is ${getTimingText(item.due_date)}.`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: `budget-${item.id}`,
                data: { url: '/dashboard/budget' },
            },
        });
    });

    // Create notifications for checklist items
    checklistItems?.forEach((item) => {
        notifications.push({
            weddingId: item.wedding_id,
            payload: {
                title: `✅ Task ${getTitleText(item.due_date)}`,
                body: `${item.title} is ${getTimingText(item.due_date)}.`,
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
        scheduleType: scheduleType || 'all',
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
