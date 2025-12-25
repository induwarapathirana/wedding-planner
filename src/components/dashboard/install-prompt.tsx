"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isPWAInstalled } from "@/lib/registerServiceWorker";

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (isPWAInstalled()) {
            return;
        }

        // Check if user dismissed the prompt
        const dismissed = localStorage.getItem("install-prompt-dismissed");
        if (dismissed) {
            return;
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show install prompt
        deferredPrompt.prompt();

        // Wait for user's choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);

        // Clear the prompt
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("install-prompt-dismissed", "true");
    };

    if (!isVisible || !deferredPrompt) return null;

    return (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-2xl p-6 text-white">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <Download className="w-8 h-8" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1">Install Vow & Venue</h3>
                        <p className="text-sm opacity-90 mb-4">
                            Add to your home screen for quick access and offline support.
                        </p>

                        <button
                            onClick={handleInstall}
                            className="bg-white text-primary px-6 py-2 rounded-xl font-semibold hover:bg-white/90 transition-all"
                        >
                            Install App
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
