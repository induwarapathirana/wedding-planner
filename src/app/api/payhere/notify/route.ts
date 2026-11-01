import { NextRequest, NextResponse } from 'next/server';
import { verifyPayHereSignature } from '@/lib/payhere';
import { prisma } from '@/lib/prisma';
import { nextPaidUntil } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/**
 * PayHere payment notification. Trusted only when the signature checks out
 * AND the order exists AND the paid amount and currency match what the server
 * charged for it. Handles one-time wedding Premium and Planner Pro
 * subscriptions (first payment, renewals, failures and cancellation).
 *
 * status_code: 2 success, 0 pending, -1 cancelled, -2 failed, -3 charged back
 * item_rec_status (subscriptions): 0 active, -1 cancelled, 1 completed
 */
export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const get = (k: string) => (form.get(k) as string | null) ?? '';
        const merchantId = get('merchant_id');
        const orderId = get('order_id');
        const amount = get('payhere_amount');
        const currency = get('payhere_currency');
        const statusCode = get('status_code');
        const signature = get('md5sig');
        const paymentId = get('payment_id') || null;
        const subscriptionId = get('subscription_id') || null;
        const recStatus = get('item_rec_status');
        const nextDate = get('item_rec_date_next') || null;

        const secret = process.env.PAYHERE_SECRET;
        if (!secret) {
            console.error('PAYHERE_SECRET not configured');
            return new NextResponse('Server config error', { status: 500 });
        }
        if (merchantId !== process.env.PAYHERE_MERCHANT_ID || !signature || !verifyPayHereSignature(merchantId, orderId, amount, currency, statusCode, signature, secret)) {
            console.error('PayHere notification with an invalid signature', { orderId });
            return new NextResponse('Invalid signature', { status: 403 });
        }

        const order = /^[0-9a-f-]{36}$/i.test(orderId) ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
        if (!order) {
            console.error('PayHere notification for an unknown order', { orderId });
            return new NextResponse('Unknown order', { status: 404 });
        }
        if (Number(amount).toFixed(2) !== Number(order.amount).toFixed(2) || currency !== order.currency) {
            console.error('PayHere amount mismatch', { orderId, amount, currency, expected: Number(order.amount).toFixed(2) });
            return new NextResponse('Amount mismatch', { status: 400 });
        }

        // The same payment can be notified more than once
        if (paymentId) {
            const seen = await prisma.order.findUnique({ where: { payherePaymentId: paymentId } });
            if (seen && seen.status === 'paid' && statusCode === '2' && recStatus !== '-1') return new NextResponse('OK');
        }

        if (order.kind === 'wedding_premium') {
            if (statusCode === '2' && order.weddingId) {
                await prisma.$transaction([
                    prisma.order.update({ where: { id: order.id }, data: { status: 'paid', paidAt: new Date(), payherePaymentId: paymentId } }),
                    prisma.wedding.update({ where: { id: order.weddingId }, data: { tier: 'premium' } }),
                ]);
            } else if (statusCode === '-2' || statusCode === '-1') {
                await prisma.order.update({ where: { id: order.id }, data: { status: statusCode === '-2' ? 'failed' : 'cancelled' } });
            } else if (statusCode === '-3' && order.weddingId) {
                await prisma.$transaction([
                    prisma.order.update({ where: { id: order.id }, data: { status: 'charged_back' } }),
                    prisma.wedding.update({ where: { id: order.weddingId }, data: { tier: 'free' } }),
                ]);
            }
            return new NextResponse('OK');
        }

        // Planner Pro subscription
        const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { proUntil: true } });
        if (!user) return new NextResponse('OK');
        const interval = order.interval ?? 'month';

        if (statusCode === '2') {
            const proUntil = nextPaidUntil(user.proUntil, interval, nextDate);
            await prisma.$transaction(async (tx) => {
                if (order.status === 'pending') {
                    await tx.order.update({ where: { id: order.id }, data: { status: 'paid', paidAt: new Date(), payherePaymentId: paymentId, subscriptionId } });
                } else if (paymentId) {
                    // A renewal: record it as its own order
                    await tx.order.create({
                        data: {
                            userId: order.userId, kind: order.kind, interval, amount: order.amount, currency: order.currency,
                            status: 'paid', paidAt: new Date(), payherePaymentId: paymentId, subscriptionId, parentOrderId: order.id,
                        },
                    });
                }
                await tx.user.update({
                    where: { id: order.userId },
                    data: {
                        plan: 'pro',
                        planInterval: interval,
                        planStatus: recStatus === '-1' ? 'cancelled' : 'active',
                        proUntil,
                        ...(subscriptionId ? { payhereSubscriptionId: subscriptionId } : {}),
                    },
                });
            });
        } else if (statusCode === '-2') {
            if (order.status === 'pending') await prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } });
            // A failed renewal starts the grace period; a failed first payment changes nothing
            else await prisma.user.update({ where: { id: order.userId }, data: { planStatus: 'past_due' } });
        } else if (statusCode === '-3') {
            await prisma.user.update({ where: { id: order.userId }, data: { planStatus: 'past_due', proUntil: new Date() } });
        } else if (statusCode === '-1' && order.status === 'pending') {
            await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
        }

        // Cancelled subscription: keep Pro until the end of the paid period
        if (recStatus === '-1' && statusCode !== '2') {
            await prisma.user.update({ where: { id: order.userId }, data: { planStatus: 'cancelled' } });
        }

        return new NextResponse('OK');
    } catch (err) {
        console.error('PayHere notify error:', err);
        return new NextResponse('Error', { status: 500 });
    }
}
