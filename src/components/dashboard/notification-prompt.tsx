"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
    registerServiceWorker,
    subscribeToPush,
    requestNotificationPermission,
} from "@/lib/registerServiceWorker";
import { supabase } from "@/lib/supabase";

interface NotificationPromptProps {
    userId: string;
    weddingId: string;
}

export function NotificationPrompt({ userId, weddingId }: NotificationPromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if user has already granted permission or dismissed
        const dismissed = localStorage.getItem("notification-prompt-dismissed");
        const permission = typeof Notification !== "undefined" ? Notification.permission : "denied";

        if (!dismissed && permission === "default") {
            // Show prompt after a delay
            setTimeout(() => setIsVisible(true), 3000);
        }
    }, []);

    const handleEnable = async () => {
        setIsLoading(true);

        try {
            // Register service worker
            const registration = await registerServiceWorker();
            if (!registration) {
                alert("Service worker registration failed");
                return;
            }

            // Request permission
            const permission = await requestNotificationPermission();
            if (permission !== "granted") {
                alert("Notification permission denied");
                return;
            }

            // Subscribe to push
            const subscription = await subscribeToPush(registration);
            if (!subscription) {
                alert("Push subscription failed");
                return;
            }

            // Save subscription to database
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userId,
                    weddingId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save subscription");
            }

            // Success!
            setIsVisible(false);
            localStorage.setItem("notification-enabled", "true");
        } catch (error) {
            console.error("Error enabling notifications:", error);
            alert("Failed to enable notifications. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("notification-prompt-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                            Never Miss a Due Date
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Get timely reminders for payments, tasks, and important deadlines.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="flex-1 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {isLoading ? "Enabling..." : "Enable Notifications"}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
