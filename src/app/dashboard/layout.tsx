"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ModeProvider } from "@/context/mode-context";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <ModeProvider>
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-white sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <span className="font-serif font-bold">V</span>
                        </div>
                        <span className="font-serif font-bold text-lg">Vow & Venue</span>
                    </div>
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Sidebar Container */}
                {/* Desktop: Fixed, always visible. Mobile: Fixed, slide-in. */}
                <div className={`
                    fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-border transform transition-transform duration-300 ease-in-out
                    md:translate-x-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <Sidebar onClose={() => setIsMobileOpen(false)} />

                    {/* Close button for mobile inside sidebar (optional, for better UX) */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="absolute top-4 right-4 p-2 md:hidden text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Overlay for mobile */}
                {isMobileOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                {/* Main Content */}
                {/* Add top padding on mobile to account for the header */}
                <main className="md:pl-72 w-full transition-all duration-300">
                    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
                        {children}
                    </div>
                </main>
            </div>
        </ModeProvider>
    );
}
