"use client";

import { useEffect, useState } from "react";
import { getEffectiveTier, type TrialInfo } from "@/lib/trial";
import { useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";

interface TrialBannerProps {
    weddingId: string;
}

export function TrialBanner({ weddingId }: TrialBannerProps) {
    const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function checkTrial() {
            const info = await getEffectiveTier(weddingId);
            setTrialInfo(info);

            // Auto-show if 3 days or less remaining
            if (info.daysRemaining !== null && info.daysRemaining <= 3) {
                setIsDismissed(false);
            }
        }

        if (weddingId) {
            checkTrial();
        }
    }, [weddingId]);

    // Don't show if:
    // - No trial info
    // - User is paid premium
    // - Trial has expired
    // - User has dismissed (unless 3 days left)
    if (!trialInfo || trialInfo.isPaidPremium || !trialInfo.isInTrial || isDismissed) {
        return null;
    }

    const daysLeft = trialInfo.daysRemaining || 0;
    const isUrgent = daysLeft <= 3;

    return (
        <div className={`relative w-full px-4 py-3 md:py-4 ${isUrgent ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-primary to-primary/80'} text-white shadow-lg`}>
            <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Sparkles className="h-5 w-5 flex-shrink-0 hidden md:block" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base font-semibold">
                            {daysLeft === 0
                                ? "⚡ Last day of your premium trial!"
                                : daysLeft === 1
                                    ? "⏰ 1 day left in your premium trial"
                                    : `✨ ${daysLeft} days left in your premium trial`
                            }
                        </p>
                        <p className="text-xs md:text-sm opacity-90 hidden md:block">
                            Enjoying unlimited features? Upgrade now to keep the magic going!
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => router.push('/dashboard/settings#upgrade')}
                        className={`px-4 md:px-6 py-2 text-sm font-semibold rounded-xl transition-all hover:scale-105 ${isUrgent
                                ? 'bg-white text-orange-600 hover:bg-white/90'
                                : 'bg-white text-primary hover:bg-white/90'
                            }`}
                    >
                        Upgrade Now
                    </button>
                    {!isUrgent && (
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
