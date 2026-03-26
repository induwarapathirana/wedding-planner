import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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
    await prisma.pushSubscription.deleteMany({
        where: { endpoint },
    });
    console.log('Removed invalid subscription:', endpoint);
}

/**
 * Send notifications for upcoming due dates
 */
export async function sendDueDateNotifications(scheduleType?: 'today' | 'tomorrow' | 'three_days') {
    // Get dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

    // Determine which dates to query
    let targetDates: string[] = [];
    if (scheduleType === 'today') {
        targetDates = [todayStr];
    } else if (scheduleType === 'tomorrow') {
        targetDates = [tomorrowStr];
    } else if (scheduleType === 'three_days') {
        targetDates = [threeDaysStr];
    } else {
        targetDates = [todayStr, tomorrowStr, threeDaysStr];
    }

    // Query budget items with Prisma
    const budgetItems = await prisma.budgetItem.findMany({
        where: {
            paidAt: null,
            dueDate: { in: targetDates.map(d => new Date(d)) },
        },
        include: { wedding: { select: { id: true } } },
    });

    // Query checklist items with Prisma
    const checklistItems = await prisma.checklistItem.findMany({
        where: {
            isCompleted: false,
            dueDate: { in: targetDates.map(d => new Date(d)) },
        },
        include: { wedding: { select: { id: true } } },
    });

    const notifications: Array<{
        weddingId: string;
        payload: NotificationPayload;
    }> = [];

    // Helper to format body based on due date
    const getTimingText = (dueDate: Date | null) => {
        if (!dueDate) return 'due soon';
        const dueDateStr = dueDate.toISOString().split('T')[0];
        if (dueDateStr === todayStr) return 'due today';
        if (dueDateStr === tomorrowStr) return 'due tomorrow';
        if (dueDateStr === threeDaysStr) return 'due in 3 days';
        return 'due soon';
    };

    const getTitleText = (dueDate: Date | null) => {
        if (!dueDate) return 'Upcoming Deadline';
        const dueDateStr = dueDate.toISOString().split('T')[0];
        if (dueDateStr === todayStr) return 'Due Today! 🚨';
        if (dueDateStr === tomorrowStr) return 'Due Tomorrow ⏰';
        if (dueDateStr === threeDaysStr) return 'Head\'s Up (3 Days) 📅';
        return 'Upcoming Deadline';
    };

    // Create notifications for budget items
    budgetItems.forEach((item) => {
        notifications.push({
            weddingId: item.weddingId,
            payload: {
                title: `💰 Payment ${getTitleText(item.dueDate)}`,
                body: `${item.name} ($${item.estimatedCost}) is ${getTimingText(item.dueDate)}.`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: `budget-${item.id}`,
                data: { url: '/dashboard/budget' },
            },
        });
    });

    // Create notifications for checklist items
    checklistItems.forEach((item) => {
        notifications.push({
            weddingId: item.weddingId,
            payload: {
                title: `✅ Task ${getTitleText(item.dueDate)}`,
                body: `${item.title} is ${getTimingText(item.dueDate)}.`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: `checklist-${item.id}`,
                data: { url: '/dashboard/checklist' },
            },
        });
    });

    // Get all subscriptions for affected weddings
    const weddingIds = [...new Set(notifications.map((n) => n.weddingId))];
    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            user: {
                collaborators: {
                    some: { weddingId: { in: weddingIds } },
                },
            },
        },
    });

    // Send notifications
    const results = [];
    for (const notification of notifications) {
        for (const sub of subscriptions) {
            const result = await sendPushNotification(
                sub.endpoint,
                sub.p256dh,
                sub.auth,
                notification.payload
            );
            results.push(result);
        }
    }

    return {
        scheduleType: scheduleType || 'all',
        queriedDates: { today: todayStr, tomorrow: tomorrowStr, threeDaysOut: threeDaysStr },
        foundItems: budgetItems.length + checklistItems.length,
        budgetItemsCount: budgetItems.length,
        checklistItemsCount: checklistItems.length,
        subscriptionsCount: subscriptions.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        total: results.length,
    };
}
