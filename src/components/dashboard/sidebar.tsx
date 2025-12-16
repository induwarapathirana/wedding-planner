"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    Store,
    LayoutList,
    Package,
    Settings,
    LogOut,
    HeartHandshake,
    CalendarClock, // New icon import
    CheckSquare, // New icon import
    BookUser // New icon import
} from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import WeddingSelector from "./WeddingSelector";
import { supabase } from "@/lib/supabase";

const navItems = [
    { name: "Itinerary", href: "/dashboard/itinerary", icon: CalendarClock },
    { name: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Guest List", href: "/dashboard/guests", icon: Users },
    { name: "Vendors", href: "/dashboard/vendors", icon: HeartHandshake },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const [hasWeddings, setHasWeddings] = useState(false);

    useEffect(() => {
        checkWeddings();
    }, []);

    async function checkWeddings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('collaborators')
            .select('wedding_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        if (data) {
            setHasWeddings(true);
        }
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <aside className="h-full w-full border-r border-border bg-white/50 backdrop-blur-xl">
            <div className="flex h-full flex-col px-6 py-8">
                {/* Brand */}
                <div className="mb-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <span className="font-serif text-xl font-bold">V</span>
                        </div>
                        <div>
                            <h1 className="font-serif text-xl font-bold text-foreground">
                                Vow & Venue
                            </h1>
                            <p className="text-xs text-muted-foreground">Planning made perfect</p>
                        </div>
                    </div>
                </div>

                {/* Wedding Selector */}
                <div className="mb-6">
                    <WeddingSelector />
                </div>

                {/* Mode Toggle */}
                <div className="mb-8">
                    <ModeToggle />
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {hasWeddings && navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                                    isActive
                                        ? "bg-primary/10 text-primary-foreground font-semibold"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / User */}
                <div className="border-t border-border pt-6 mt-auto">
                    {hasWeddings && (
                        <Link
                            href="/dashboard/settings"
                            onClick={onClose}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Settings className="h-5 w-5" />
                            Settings
                        </Link>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
