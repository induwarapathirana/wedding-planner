"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    CalendarClock,
    CheckSquare,
    BookUser,
    DollarSign,
    Share2,
    MessageSquare,
    ArrowLeft
} from "lucide-react";
import WeddingSelector from "./WeddingSelector";
import { supabase } from "@/lib/supabase";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Budget", href: "/dashboard/budget", icon: DollarSign },
    { name: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
    { name: "Guest List", href: "/dashboard/guests", icon: Users },
    { name: "Vendors", href: "/dashboard/vendors", icon: HeartHandshake },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Itinerary", href: "/dashboard/itinerary", icon: CalendarClock },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const weddingId = searchParams.get('weddingId');

    const [hasWeddings, setHasWeddings] = useState(false);
    const [role, setRole] = useState<'couple' | 'planner' | 'vendor' | null>(null);

    useEffect(() => {
        checkUserRole();
    }, []);

    async function checkUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile) {
            setRole(profile.role);
            if (profile.role === 'couple') {
                checkWeddings();
            } else {
                // Planners always have "weddings" (access to dashboard), but conceptually different
                setHasWeddings(true);
            }
        }
    }

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

    const currentNavItems = (() => {
        if (role === 'planner') {
            if (weddingId) {
                // Planner in Workspace Mode - Show Couple Features + Back Button
                return [
                    { name: "Back to Clients", href: "/dashboard/clients", icon: ArrowLeft },
                    ...navItems.map(item => ({
                        ...item,
                        href: `${item.href}?weddingId=${weddingId}`
                    }))
                ];
            } else {
                // Planner Global Mode
                return [
                    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
                    { name: "Clients", href: "/dashboard/clients", icon: Users },
                    { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
                    // Planners might want a master directory
                    { name: "Vendor Library", href: "/dashboard/vendors", icon: HeartHandshake },
                    { name: "Settings", href: "/dashboard/settings", icon: Settings }, // NEW
                ];
            }
        }
        return navItems;
    })();

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
                            <p className="text-xs text-muted-foreground">
                                {role === 'planner' ? 'Wedding Pro' : 'Planning made perfect'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Wedding Selector - Only for Couples (Planners select from Clients page usually, or a different switcher) */}
                {role === 'couple' && (
                    <div className="mb-6">
                        <WeddingSelector />
                    </div>
                )}


                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {hasWeddings && currentNavItems.map((item) => {
                        // Check match ignoring query params
                        const currentPath = item.href.split('?')[0];
                        const isActive = pathname === currentPath;
                        return (
                            <Link
                                key={item.name} // usage of item.href as key causes duplicates if mapping logic changes, name is stable
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
