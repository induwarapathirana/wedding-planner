"use client";

// Register service worker for PWA functionality
export async function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('Service Worker registered successfully:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available, could prompt user to refresh
                        console.log('New service worker available, refresh to update');
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

// Request notification permission
export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('Notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

// Subscribe to push notifications
export async function subscribeToPush(registration: ServiceWorkerRegistration) {
    try {
        const permission = await requestNotificationPermission();

        if (permission !== 'granted') {
            console.log('Notification permission not granted');
            return null;
        }

        // Get VAPID public key from environment
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
            console.error('VAPID public key not configured');
            return null;
        }

        // Convert VAPID key from base64 to Uint8Array
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
        });

        console.log('Push subscription created:', subscription);
        return subscription;
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return null;
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Check if PWA is installed (running in standalone mode)
export function isPWAInstalled() {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
}
