"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    DollarSign,
    Users,
    CheckSquare,
    HeartHandshake,
    Package,
    CalendarClock
} from "lucide-react";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Budget", href: "/dashboard/budget", icon: DollarSign },
    { name: "Guests", href: "/dashboard/guests", icon: Users },
    { name: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
    { name: "Vendors", href: "/dashboard/vendors", icon: HeartHandshake },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Itinerary", href: "/dashboard/itinerary", icon: CalendarClock },
];

interface BottomNavProps {
    onMoreClick?: () => void; // Keep for backward compatibility but unused
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
            {/* iOS-style floating bottom nav with glassmorphism */}
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl shadow-black/10">
                {/* Safe area spacing for iOS */}
                <div className="pb-safe">
                    {/* Horizontally scrollable container */}
                    <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-1 h-16 px-3 min-w-max">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 min-w-[72px] group",
                                            "active:scale-95",
                                            isActive
                                                ? "text-primary bg-primary/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                "w-6 h-6 transition-transform duration-200",
                                                isActive && "scale-110"
                                            )}
                                        />
                                        <span className={cn(
                                            "text-[10px] font-semibold tracking-tight leading-none whitespace-nowrap",
                                            isActive && "font-bold"
                                        )}>
                                            {item.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add custom scrollbar hiding styles */}
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </nav>
    );
}
