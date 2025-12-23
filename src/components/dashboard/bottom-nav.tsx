"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    DollarSign,
    Users,
    CheckSquare,
    MoreHorizontal
} from "lucide-react";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Budget", href: "/dashboard/budget", icon: DollarSign },
    { name: "Guests", href: "/dashboard/guests", icon: Users },
    { name: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
];

interface BottomNavProps {
    onMoreClick: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
            {/* iOS-style floating bottom nav with glassmorphism */}
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl shadow-black/10">
                {/* Safe area spacing for iOS */}
                <div className="pb-safe">
                    <div className="flex items-center justify-around h-16 px-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 flex-1 min-w-0 group",
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
                                        "text-[10px] font-semibold tracking-tight leading-none",
                                        isActive && "font-bold"
                                    )}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* More Button */}
                        <button
                            onClick={onMoreClick}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 flex-1 min-w-0",
                                "text-muted-foreground hover:text-foreground hover:bg-white/50 active:scale-95"
                            )}
                        >
                            <MoreHorizontal className="w-6 h-6" />
                            <span className="text-[10px] font-semibold tracking-tight leading-none">
                                More
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
