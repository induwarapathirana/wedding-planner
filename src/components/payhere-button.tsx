'use client';

import { useState } from 'react';
import { signPaymentRequest } from "@/app/actions/payhere";

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
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            // 1. Get Secret Hash from Server
            const { merchant_id, hash, url } = await signPaymentRequest(orderId, amount, currency);

            // 2. Create Form and Submit
            const form = document.createElement('form');
            form.setAttribute("method", "POST");
            form.setAttribute("action", url + "/pay/checkout");
            form.setAttribute("target", "_blank"); // Open in new tab for sandbox safety

            const params = {
                merchant_id,
                return_url: window.location.origin + "/dashboard", // Todo: specific success page
                cancel_url: window.location.origin + "/dashboard/settings",
                notify_url: window.location.origin + "/api/payhere/notify",

                order_id: orderId,
                items: items,
                currency: currency,
                amount: amount.toFixed(2),

                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                country,

                hash: hash, // MD5 Signature
            };

            Object.entries(params).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

        } catch (err) {
            console.error("Payment Error:", err);
            alert("Payment initiation failed. Please check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className={className}
        >
            {loading ? "Processing..." : children}
        </button>
    );
}
