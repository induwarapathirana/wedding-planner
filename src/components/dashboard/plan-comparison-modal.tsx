"use client";

import { Check, X, Crown, Sparkles } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/limits";
import Link from "next/link";

// Reverting to custom overlay as previous interaction showed issues with imports.

export function PlanComparisonModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">

                {/* Header / Sidebar (Mobile Top, Desktop Left) */}
                <div className="bg-slate-50 p-8 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 ring-4 ring-white shadow-sm">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Welcome to Vow & Venue!</h2>
                    <p className="text-slate-600 mb-6">You've started your free plan. See what you can do below.</p>
                    <button onClick={onClose} className="text-sm font-medium text-slate-400 hover:text-slate-600 text-left transition-colors">
                        Maybe later
                    </button>
                </div>

                {/* Comparison Content */}
                <div className="p-6 md:p-8 md:w-2/3 bg-white">
                    <div className="grid grid-cols-2 gap-4 md:gap-8 h-full">

                        {/* Free Plan */}
                        <div className="rounded-2xl border border-slate-200 p-6 flex flex-col bg-slate-50/50">
                            <div className="mb-4">
                                <span className="inline-block px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide rounded-full mb-2">Current Plan</span>
                                <h3 className="text-xl font-bold text-slate-900">Free</h3>
                                <p className="text-3xl font-bold text-slate-900 mt-2">LKR 0</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    <span><strong>{PLAN_LIMITS.free.guests}</strong> Guests</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                    <WalletIcon className="w-4 h-4 text-slate-400" />
                                    <span><strong>{PLAN_LIMITS.free.budget_items}</strong> Budget Items</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                    <StoreIcon className="w-4 h-4 text-slate-400" />
                                    <span><strong>{PLAN_LIMITS.free.vendors}</strong> Vendors</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    <span>No Collaborators</span>
                                </li>
                            </ul>

                            <button onClick={onClose} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">
                                Continue with Free
                            </button>
                        </div>

                        {/* Premium Plan */}
                        <div className="rounded-2xl border-2 border-primary/20 p-6 flex flex-col relative bg-white shadow-xl shadow-primary/5">
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Recommended
                            </div>

                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-slate-900">Premium</h3>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <p className="text-3xl font-bold text-primary">LKR 990</p>
                                    <span className="text-sm text-slate-400">/ one-time</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm font-medium text-slate-900">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span><strong>Unlimited</strong> Guests</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-medium text-slate-900">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span><strong>Unlimited</strong> Budget</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-medium text-slate-900">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span><strong>Unlimited</strong> Vendors</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-medium text-slate-900">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span><strong>Unlimited</strong> Collaborators</span>
                                </li>
                            </ul>

                            <Link
                                href="/dashboard/settings"
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] transition-all text-center flex items-center justify-center gap-2"
                            >
                                <Crown className="w-4 h-4" />
                                Upgrade Now
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple Icons
const UsersIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)
const WalletIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
)
const StoreIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></svg>
)
