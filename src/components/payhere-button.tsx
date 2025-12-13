'use client';

import { signPaymentRequest } from "@/app/actions/payhere"; // Keeping this if we revert, or can remove.
// For now, I will remove valid imports.
import React from 'react';

type PayHereItem = {
    name: string;
    quantity: number;
    amount: number;
};

interface PayHereButtonProps {
    orderId: string;
    items: string; // PayHere expects "Item 1, Item 2"
    amount: number;
    currency: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;

    // UI Props
    className?: string;
    children?: React.ReactNode;
}

export function PayHereButton({
    orderId, items, amount, currency,
    first_name, last_name, email, phone, address, city, country,
    className, children
}: PayHereButtonProps) {

    // Base Payment Link provided by user
    const BASE_URL = "https://payhere.lk/pay/oa998e004";

    // Construct URL with parameters to pass context
    // Note: We pass order_id so the webhook knows which wedding to upgrade.
    const paymentUrl = new URL(BASE_URL);
    paymentUrl.searchParams.append('order_id', orderId);
    paymentUrl.searchParams.append('items', items);
    paymentUrl.searchParams.append('amount', amount.toFixed(2));
    paymentUrl.searchParams.append('currency', currency);
    paymentUrl.searchParams.append('first_name', first_name);
    paymentUrl.searchParams.append('last_name', last_name);
    paymentUrl.searchParams.append('email', email);
    paymentUrl.searchParams.append('phone', phone);
    paymentUrl.searchParams.append('address', address);
    paymentUrl.searchParams.append('city', city);
    paymentUrl.searchParams.append('country', country);

    // Try to pass notify_url dynamically, though PayHere Links often require dashboard config for this.
    // We'll add it just in case it works.
    if (typeof window !== 'undefined') {
        paymentUrl.searchParams.append('notify_url', window.location.origin + "/api/payhere/notify");
        paymentUrl.searchParams.append('return_url', window.location.origin + "/dashboard");
        paymentUrl.searchParams.append('cancel_url', window.location.origin + "/dashboard/settings");
    }

    return (
        <a
            href={paymentUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            {children}
        </a>
    );
}
