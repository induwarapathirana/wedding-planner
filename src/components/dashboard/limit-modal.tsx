"use client";

import { X, Sparkles } from "lucide-react";
import Link from "next/link";

interface LimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: string;
    limit: number;
    tier: string;
}

export function LimitModal({ isOpen, onClose, feature, limit, tier }: LimitModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header with decorative background */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">Unlock Unlimited {feature}</h2>
                    <p className="text-purple-100 text-sm mt-1">
                        You've reached the limit of {limit} {feature.toLowerCase()} on the {tier} plan.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-900">
                            <span className="text-xl">🚀</span>
                            <p>Upgrade to <strong>Premium</strong> to remove all limits, enable team collaboration, and access advanced features.</p>
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <Link
                                href="/dashboard/settings"
                                className="flex items-center justify-center w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
                            >
                                Upgrade Now for 99 LKR
                            </Link>
                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-white text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
