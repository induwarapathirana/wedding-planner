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

type Horizon = 'today' | 'tomorrow' | 'three_days';

const DAY_MS = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily reminder: for each wedding, one notification per collaborator's
 * device listing what's due (payments and tasks), sent only to people on
 * that wedding. With no `scheduleType` it covers today, tomorrow and three
 * days out, plus anything that became overdue yesterday.
 */
export async function sendDueDateNotifications(scheduleType?: Horizon) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const offsets: Record<Horizon, number> = { today: 0, tomorrow: 1, three_days: 3 };
    const horizons = scheduleType ? [scheduleType] : (Object.keys(offsets) as Horizon[]);
    const dates = horizons.map((h) => new Date(today.getTime() + offsets[h] * DAY_MS));
    if (!scheduleType) dates.push(new Date(today.getTime() - DAY_MS)); // just became overdue
    const label = (d: Date) => {
        const diff = Math.round((d.getTime() - today.getTime()) / DAY_MS);
        return diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
    };

    const [payments, unscheduled, tasks] = await Promise.all([
        prisma.payment.findMany({
            where: { paidAt: null, dueDate: { in: dates } },
            select: { weddingId: true, label: true, amount: true, dueDate: true, budgetItem: { select: { name: true } } },
        }),
        prisma.budgetItem.findMany({
            where: { paidAt: null, dueDate: { in: dates }, payments: { none: {} } },
            select: { weddingId: true, name: true, estimatedCost: true, actualCost: true, paidAmount: true, dueDate: true },
        }),
        prisma.checklistItem.findMany({
            where: { isCompleted: false, dueDate: { in: dates } },
            select: { weddingId: true, title: true, dueDate: true },
        }),
    ]);

    type Line = { text: string; due: Date; isPayment: boolean };
    const byWedding = new Map<string, Line[]>();
    const add = (weddingId: string, line: Line) => byWedding.set(weddingId, [...(byWedding.get(weddingId) ?? []), line]);
    const weddingIds = [...new Set([...payments, ...unscheduled, ...tasks].map((x) => x.weddingId))];
    const weddings = await prisma.wedding.findMany({
        where: { id: { in: weddingIds } },
        select: { id: true, coupleName1: true, coupleName2: true, currency: true },
    });
    const info = new Map(weddings.map((w) => [w.id, w]));
    const money = (weddingId: string, n: number) => `${info.get(weddingId)?.currency ?? ''} ${Math.round(n).toLocaleString('en')}`.trim();

    for (const p of payments) add(p.weddingId, { text: `Pay ${p.budgetItem.name} (${p.label}) ${money(p.weddingId, Number(p.amount))}`, due: p.dueDate!, isPayment: true });
    for (const b of unscheduled) {
        const price = Number(b.actualCost) > 0 ? Number(b.actualCost) : Number(b.estimatedCost);
        const left = Math.max(0, price - Number(b.paidAmount));
        add(b.weddingId, { text: `Pay ${b.name}${left ? ` ${money(b.weddingId, left)}` : ''}`, due: b.dueDate!, isPayment: true });
    }
    for (const t of tasks) add(t.weddingId, { text: t.title, due: t.dueDate!, isPayment: false });

    const results: { success: boolean }[] = [];
    let notificationsBuilt = 0;
    for (const [weddingId, lines] of byWedding) {
        lines.sort((a, b) => a.due.getTime() - b.due.getTime());
        const w = info.get(weddingId);
        const couple = w ? [w.coupleName1, w.coupleName2].filter(Boolean).join(' & ') : 'your wedding';
        const first = lines[0];
        const groups = new Map<string, Line[]>();
        for (const l of lines) groups.set(label(l.due), [...(groups.get(label(l.due)) ?? []), l]);
        const body = [...groups]
            .map(([when, ls]) => `${when[0].toUpperCase()}${when.slice(1)}: ${ls.slice(0, 3).map((l) => l.text).join(', ')}${ls.length > 3 ? ` +${ls.length - 3} more` : ''}`)
            .join('\n');
        const payload: NotificationPayload = {
            title: `${lines.length} ${lines.length === 1 ? 'thing' : 'things'} due for ${couple}`,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: `due-${weddingId}-${dayKey(today)}`,
            data: { url: `/dashboard?weddingId=${weddingId}` },
            requireInteraction: label(first.due) === 'overdue' || label(first.due) === 'today',
        };
        notificationsBuilt++;

        // Only the people on this wedding
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { user: { collaborators: { some: { weddingId } } } },
        });
        for (const sub of subscriptions) {
            results.push(await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, payload));
        }
    }

    return {
        scheduleType: scheduleType || 'all',
        dates: dates.map(dayKey),
        weddings: notificationsBuilt,
        foundItems: payments.length + unscheduled.length + tasks.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
    };
}
