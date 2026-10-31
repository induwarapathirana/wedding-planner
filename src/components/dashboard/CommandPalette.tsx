"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarClock,
    CheckSquare,
    DollarSign,
    HeartHandshake,
    LayoutDashboard,
    Loader2,
    Package,
    Plus,
    Search,
    Settings,
    Users,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchWedding, type SearchHit } from "@/app/actions/data";

/** Dispatch this from anywhere (e.g. a sidebar button) to open the palette. */
export const OPEN_COMMAND_PALETTE = "open-command-palette";

export function openCommandPalette() {
    window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE));
}

type Item = {
    id: string;
    group: string;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    href: string;
};

const PAGES: Omit<Item, "id" | "group">[] = [
    { title: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Budget", icon: DollarSign, href: "/dashboard/budget" },
    { title: "Checklist", icon: CheckSquare, href: "/dashboard/checklist" },
    { title: "Guest List", icon: Users, href: "/dashboard/guests" },
    { title: "Vendors", icon: HeartHandshake, href: "/dashboard/vendors" },
    { title: "Inventory", icon: Package, href: "/dashboard/inventory" },
    { title: "Itinerary", icon: CalendarClock, href: "/dashboard/itinerary" },
    { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const ACTIONS: Omit<Item, "id" | "group">[] = [
    { title: "Add a checklist task", icon: Plus, href: "/dashboard/checklist?new=true" },
];

const HIT_ICONS: Record<SearchHit["type"], LucideIcon> = {
    guest: Users,
    vendor: HeartHandshake,
    task: CheckSquare,
    budget: DollarSign,
    event: CalendarClock,
};

const HIT_GROUPS: Record<SearchHit["type"], string> = {
    guest: "Guests",
    vendor: "Vendors",
    task: "Tasks",
    budget: "Budget",
    event: "Itinerary",
};

function currentWeddingId() {
    const fromUrl = new URLSearchParams(window.location.search).get("weddingId");
    if (fromUrl) return fromUrl;
    try {
        return localStorage.getItem("current_wedding_id");
    } catch {
        return null;
    }
}

export function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<SearchHit[]>([]);
    const [active, setActive] = useState(0);
    const [searching, startSearch] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const requestId = useRef(0);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((o) => !o);
            }
        }
        const onOpen = () => setOpen(true);
        window.addEventListener("keydown", onKey);
        window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery("");
            setHits([]);
            setActive(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Debounced server search; stale responses are dropped by request id
    useEffect(() => {
        const q = query.trim();
        const weddingId = open ? currentWeddingId() : null;
        if (q.length < 2 || !weddingId) {
            setHits([]);
            return;
        }
        const id = ++requestId.current;
        const timer = setTimeout(() => {
            startSearch(async () => {
                const results = await searchWedding(weddingId, q).catch(() => []);
                if (id === requestId.current) setHits(results);
            });
        }, 180);
        return () => clearTimeout(timer);
    }, [query, open]);

    const items = useMemo<Item[]>(() => {
        const q = query.trim().toLowerCase();
        const match = (t: string) => !q || t.toLowerCase().includes(q);
        return [
            ...ACTIONS.filter((a) => match(a.title)).map((a, i) => ({ ...a, id: `action-${i}`, group: "Actions" })),
            ...PAGES.filter((p) => match(p.title)).map((p) => ({ ...p, id: `page-${p.href}`, group: "Go to" })),
            ...hits.map((h) => ({
                id: `${h.type}-${h.id}`,
                group: HIT_GROUPS[h.type],
                title: h.title,
                subtitle: h.subtitle,
                icon: HIT_ICONS[h.type],
                href: h.href,
            })),
        ];
    }, [query, hits]);

    useEffect(() => {
        setActive((a) => Math.min(a, Math.max(items.length - 1, 0)));
    }, [items.length]);

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const go = useCallback(
        (item: Item) => {
            setOpen(false);
            // Planners work inside a client's wedding via ?weddingId, so keep it
            const weddingParam = new URLSearchParams(window.location.search).get("weddingId");
            let href = item.href;
            if (weddingParam) href += `${href.includes("?") ? "&" : "?"}weddingId=${weddingParam}`;
            router.push(href);
        },
        [router]
    );

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (items.length ? (a + 1) % items.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
        } else if (e.key === "Enter" && items[active]) {
            e.preventDefault();
            go(items[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    if (!open) return null;

    let lastGroup = "";

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
                <div className="flex items-center gap-3 border-b border-border px-4">
                    <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActive(0);
                        }}
                        onKeyDown={onKeyDown}
                        placeholder="Search guests, vendors, tasks… or jump to a page"
                        className="h-14 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="command-palette-list"
                        aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
                    />
                    {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <kbd className="hidden sm:inline-flex rounded-md border border-border bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
                </div>

                <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
                    {items.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                            {searching ? "Searching…" : `No results for “${query}”`}
                        </p>
                    ) : (
                        items.map((item, index) => {
                            const header = item.group !== lastGroup ? item.group : null;
                            lastGroup = item.group;
                            const Icon = item.icon;
                            return (
                                <div key={item.id}>
                                    {header && (
                                        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:pt-1">
                                            {header}
                                        </p>
                                    )}
                                    <button
                                        id={`cmd-${item.id}`}
                                        data-index={index}
                                        role="option"
                                        aria-selected={index === active}
                                        onMouseMove={() => setActive(index)}
                                        onClick={() => go(item)}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                                            index === active ? "bg-primary/15 text-foreground" : "text-foreground/80"
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4 flex-shrink-0", index === active ? "text-primary" : "text-muted-foreground")} />
                                        <span className="flex-1 truncate font-medium">{item.title}</span>
                                        {item.subtitle && <span className="truncate text-xs capitalize text-muted-foreground">{item.subtitle}</span>}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="hidden sm:flex items-center gap-4 border-t border-border bg-gray-50/60 px-4 py-2 text-[11px] text-muted-foreground">
                    <span><kbd className="font-sans">↑↓</kbd> navigate</span>
                    <span><kbd className="font-sans">↵</kbd> open</span>
                    <span className="ml-auto"><kbd className="font-sans">⌘K</kbd> toggle</span>
                </div>
            </div>
        </div>
    );
}
