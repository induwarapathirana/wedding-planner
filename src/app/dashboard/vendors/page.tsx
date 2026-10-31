"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Download, Library, Mail, MessageCircle, Phone, Store, Trash2 } from "lucide-react";
import {
    createDirectoryVendor,
    createVendor,
    deleteDirectoryVendor,
    deleteVendor,
    getDirectoryVendors,
    getUserProfile,
    getVendors,
    getWeddingById,
    updateDirectoryVendor,
    updateVendor,
} from "@/app/actions/data";
import { SheetGrid, type SheetColumn, type SheetGroup } from "@/components/sheet/SheetGrid";
import { DirectoryImportModal } from "@/components/dashboard/vendors/DirectoryImportModal";
import { useWeddingId } from "@/hooks/use-wedding-id";
import { useWeddingPermission } from "@/hooks/use-wedding-permission";
import { CURRENCIES } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Vendor = Awaited<ReturnType<typeof getVendors>>[number];
type DirectoryVendor = Awaited<ReturnType<typeof getDirectoryVendors>>[number];

const CATEGORIES = [
    "Venue", "Catering", "Photography", "Videography", "Attire", "Hair & make-up", "Décor & flowers",
    "Ashtaka & Poruwa", "Kandyan drummers", "Music & DJ", "Cake", "Transport", "Stationery", "Other",
];
const STATUSES = [
    { value: "researching", label: "Researching" },
    { value: "contacted", label: "Contacted" },
    { value: "hired", label: "Hired" },
    { value: "declined", label: "Declined" },
];
const PRICING = [
    { value: "flat_rate", label: "Flat rate" },
    { value: "package", label: "Package" },
    { value: "per_person", label: "Per person" },
    { value: "hourly", label: "Per hour" },
    { value: "per_item", label: "Per item" },
    { value: "tbd", label: "To be confirmed" },
];
const STATUS_STYLE: Record<string, string> = {
    researching: "bg-gray-100 text-gray-700",
    contacted: "bg-sky-100 text-sky-800",
    hired: "bg-emerald-100 text-emerald-800",
    declined: "bg-rose-100 text-rose-700 line-through",
};

const digits = (phone?: string | null) => (phone ?? "").replace(/[^\d+]/g, "").replace(/^0/, "+94");

/** Contact shortcuts shared by both tabs. */
function ContactLinks({ phone, email, name }: { phone?: string | null; email?: string | null; name: string }) {
    const tel = digits(phone);
    return (
        <>
            {tel && (
                <a href={`https://wa.me/${tel.replace("+", "")}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700" title="WhatsApp" aria-label={`WhatsApp ${name}`}>
                    <MessageCircle className="h-4 w-4" />
                </a>
            )}
            {tel && (
                <a href={`tel:${tel}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" title="Call" aria-label={`Call ${name}`}>
                    <Phone className="h-4 w-4" />
                </a>
            )}
            {email && (
                <a href={`mailto:${email}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" title="Email" aria-label={`Email ${name}`}>
                    <Mail className="h-4 w-4" />
                </a>
            )}
        </>
    );
}

export default function VendorsPage() {
    const weddingId = useWeddingId();
    const { canEdit } = useWeddingPermission(weddingId ?? null);
    const [tab, setTab] = useState<"wedding" | "directory">("wedding");
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [directory, setDirectory] = useState<DirectoryVendor[]>([]);
    const [currency, setCurrency] = useState("LKR");
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);

    const loadWedding = useCallback(async (id: string) => {
        const [list, wedding] = await Promise.all([getVendors(id), getWeddingById(id)]);
        setVendors(list);
        setCurrency(wedding?.currency || "LKR");
    }, []);

    useEffect(() => {
        if (weddingId === undefined) return;
        (async () => {
            const [dir, profile] = await Promise.all([getDirectoryVendors(), getUserProfile()]);
            setDirectory(dir);
            // Planners outside a client's wedding come here for their vendor library
            const inClientWedding = new URLSearchParams(window.location.search).has("weddingId");
            if (!weddingId || (profile?.role === "planner" && !inClientWedding)) setTab("directory");
            if (weddingId) await loadWedding(weddingId);
            setLoading(false);
        })();
    }, [weddingId, loadWedding]);

    const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
    const money = useCallback((n: number) => `${symbol} ${Math.round(n).toLocaleString()}`, [symbol]);

    const categories = useMemo(() => {
        const names = [...CATEGORIES];
        for (const v of [...vendors, ...directory]) if (v.category && !names.includes(v.category)) names.splice(names.length - 1, 0, v.category);
        return names;
    }, [vendors, directory]);
    const categoryOptions = categories.map((c) => ({ value: c, label: c }));

    // ---------- This wedding ----------
    const saveVendor = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: Vendor | undefined;
        setVendors((list) => list.map((v) => (v.id === id ? ((previous = v), { ...v, ...changes } as Vendor) : v)));
        try {
            const saved = await updateVendor(id, changes);
            setVendors((list) => list.map((v) => (v.id === id ? saved : v)));
        } catch (e) {
            if (previous) setVendors((list) => list.map((v) => (v.id === id ? previous! : v)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const addVendor = async (category?: string) => {
        if (!weddingId) return;
        try {
            const created = await createVendor(weddingId, { companyName: "New vendor", category: category || "Other", status: "researching" });
            setVendors((list) => [...list, created]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const removeVendor = async (v: Vendor) => {
        setVendors((list) => list.filter((x) => x.id !== v.id));
        try {
            await deleteVendor(v.id);
            toast.success(`Removed ${v.companyName || "vendor"}`);
        } catch (e) {
            setVendors((list) => [...list, v]);
            toast.error((e as Error).message);
        }
    };

    const saveToDirectory = async (v: Vendor) => {
        if (directory.some((d) => d.companyName?.toLowerCase() === v.companyName?.toLowerCase())) {
            toast.message(`${v.companyName} is already in your directory`);
            return;
        }
        try {
            const created = await createDirectoryVendor({
                companyName: v.companyName, category: v.category, contactName: v.contactName, email: v.email,
                phone: v.phone, website: v.website, priceEstimate: v.priceEstimate, pricingType: v.pricingType,
                pricingUnit: v.pricingUnit, notes: v.notes,
            });
            setDirectory((list) => [...list, created]);
            toast.success(`Saved ${v.companyName} to your directory`);
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const groupByCategory = useCallback(
        <T extends { category: string | null }>(rows: T[]): SheetGroup<T>[] =>
            categories
                .map((c) => ({ key: c, label: c, rows: rows.filter((r) => (r.category || "Other") === c) }))
                .filter((g) => g.rows.length > 0),
        [categories]
    );

    const vendorColumns: SheetColumn<Vendor>[] = [
        { key: "companyName", label: "Vendor", type: "text", width: 200, sticky: true, placeholder: "Company name" },
        {
            key: "status", label: "Status", type: "select", options: STATUSES, width: 120, summary: true,
            render: (v) => <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[v.status] ?? STATUS_STYLE.researching)}>{STATUSES.find((s) => s.value === v.status)?.label ?? v.status}</span>,
        },
        { key: "priceEstimate", label: "Price", type: "money", width: 130, align: "right", summary: true },
        { key: "pricingType", label: "Pricing", type: "select", options: PRICING, width: 120 },
        { key: "category", label: "Category", type: "select", options: categoryOptions, width: 150 },
        { key: "contactName", label: "Contact", type: "text", width: 140 },
        { key: "phone", label: "Phone", type: "text", width: 140, summary: true },
        { key: "email", label: "Email", type: "text", width: 180 },
        { key: "website", label: "Website", type: "text", width: 180 },
        { key: "notes", label: "Notes", type: "text", width: 240 },
    ];

    // ---------- Directory ----------
    const saveDirectory = useCallback(async (id: string, changes: Record<string, unknown>) => {
        let previous: DirectoryVendor | undefined;
        setDirectory((list) => list.map((d) => (d.id === id ? ((previous = d), { ...d, ...changes } as DirectoryVendor) : d)));
        try {
            const saved = await updateDirectoryVendor(id, changes);
            setDirectory((list) => list.map((d) => (d.id === id ? saved : d)));
        } catch (e) {
            if (previous) setDirectory((list) => list.map((d) => (d.id === id ? previous! : d)));
            toast.error((e as Error).message || "Couldn't save that change");
        }
    }, []);

    const addDirectory = async (category?: string) => {
        try {
            const created = await createDirectoryVendor({ companyName: "New vendor", category: category || "Other" });
            setDirectory((list) => [...list, created]);
            return created.id;
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const removeDirectory = async (d: DirectoryVendor) => {
        setDirectory((list) => list.filter((x) => x.id !== d.id));
        try {
            await deleteDirectoryVendor(d.id);
            toast.success(`Removed ${d.companyName || "vendor"} from your directory`);
        } catch (e) {
            setDirectory((list) => [...list, d]);
            toast.error((e as Error).message);
        }
    };

    const directoryColumns: SheetColumn<DirectoryVendor>[] = [
        { key: "companyName", label: "Vendor", type: "text", width: 200, sticky: true, placeholder: "Company name" },
        { key: "category", label: "Category", type: "select", options: categoryOptions, width: 150, summary: true },
        { key: "priceEstimate", label: "Typical price", type: "money", width: 130, align: "right", summary: true },
        { key: "pricingType", label: "Pricing", type: "select", options: PRICING, width: 120 },
        {
            key: "rating", label: "Rating", type: "number", width: 80, align: "center",
            render: (d) => (d.rating ? <span aria-label={`${d.rating} out of 5`}>{"★".repeat(Math.min(5, d.rating))}<span className="text-gray-300">{"★".repeat(Math.max(0, 5 - d.rating))}</span></span> : <span className="text-muted-foreground/60">—</span>),
        },
        { key: "contactName", label: "Contact", type: "text", width: 140 },
        { key: "phone", label: "Phone", type: "text", width: 140, summary: true },
        { key: "email", label: "Email", type: "text", width: 180 },
        { key: "website", label: "Website", type: "text", width: 180 },
        { key: "notes", label: "Notes", type: "text", width: 240 },
    ];

    const hired = vendors.filter((v) => v.status === "hired");
    const hiredTotal = hired.reduce((n, v) => n + (Number(v.priceEstimate) || 0), 0);

    const exportCsv = () =>
        downloadCsv(
            `vendors-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Vendor", "Category", "Status", "Price", "Pricing", "Contact", "Phone", "Email", "Website", "Notes"],
            vendors.map((v) => [
                v.companyName, v.category, STATUSES.find((s) => s.value === v.status)?.label, v.priceEstimate,
                PRICING.find((p) => p.value === v.pricingType)?.label, v.contactName, v.phone, v.email, v.website, v.notes,
            ])
        );

    if (loading) {
        return <div className="space-y-4 animate-pulse"><div className="h-9 w-48 rounded-lg bg-gray-200" /><div className="h-[60vh] rounded-2xl border border-border bg-white" /></div>;
    }

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold">Vendors</h1>
                    <p className="text-sm text-muted-foreground">
                        {tab === "wedding"
                            ? `${hired.length} hired of ${vendors.filter((v) => v.status !== "declined").length}${hiredTotal ? ` · ${money(hiredTotal)} committed` : ""}`
                            : `${directory.length} vendors you can reuse on any wedding`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tab === "wedding" && weddingId && canEdit && directory.length > 0 && (
                        <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                            <Library className="h-4 w-4" /> Add from directory
                        </button>
                    )}
                    {tab === "wedding" && (
                        <button onClick={exportCsv} disabled={!vendors.length} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
                            <Download className="h-4 w-4" /> Export
                        </button>
                    )}
                </div>
            </div>

            <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Vendor lists">
                {weddingId && (
                    <button role="tab" aria-selected={tab === "wedding"} onClick={() => setTab("wedding")} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === "wedding" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                        This wedding <span className="ml-1 text-xs text-muted-foreground tabular-nums">{vendors.length}</span>
                    </button>
                )}
                <button role="tab" aria-selected={tab === "directory"} onClick={() => setTab("directory")} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === "directory" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    My directory <span className="ml-1 text-xs text-muted-foreground tabular-nums">{directory.length}</span>
                </button>
            </div>

            {tab === "wedding" && weddingId ? (
                vendors.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                        <Store className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h2 className="mt-3 font-serif text-2xl font-bold">Track your vendors</h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add the photographers, venues and others you're considering, compare prices, and mark who you hire.</p>
                        {canEdit && (
                            <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <button onClick={() => addVendor()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow">Add a vendor</button>
                                {directory.length > 0 && <button onClick={() => setImportOpen(true)} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium">Add from my directory</button>}
                            </div>
                        )}
                    </div>
                ) : (
                    <SheetGrid
                        rows={vendors}
                        columns={vendorColumns}
                        getRowId={(v) => v.id}
                        onCommit={(row, key, value) => saveVendor(row.id, { [key]: value })}
                        readOnly={!canEdit}
                        formatMoney={money}
                        groupBy={groupByCategory}
                        renderGroupHeader={(g) => (
                            <div className="flex items-center gap-3 text-sm">
                                <span className="font-semibold">{g.label}</span>
                                <span className="text-muted-foreground">
                                    {g.rows.length} {g.rows.length === 1 ? "option" : "options"}
                                    {g.rows.some((v) => v.status === "hired") ? " · hired" : ""}
                                </span>
                            </div>
                        )}
                        onAddRow={canEdit ? addVendor : undefined}
                        addRowLabel={(g) => `Add another ${g?.toLowerCase() ?? "vendor"} option`}
                        rowActions={(v) => (
                            <>
                                <ContactLinks phone={v.phone} email={v.email} name={v.companyName || "vendor"} />
                                {canEdit && (
                                    <button onClick={() => saveToDirectory(v)} className="rounded-md p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground" title="Save to my directory" aria-label={`Save ${v.companyName} to my directory`}>
                                        <BookmarkPlus className="h-4 w-4" />
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={() => removeVendor(v)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${v.companyName}`}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}
                    />
                )
            ) : directory.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
                    <Library className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h2 className="mt-3 font-serif text-2xl font-bold">Your vendor directory</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Keep the vendors you trust in one list and add them to any wedding in a click.</p>
                    <button onClick={() => addDirectory()} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow">Add a vendor</button>
                </div>
            ) : (
                <SheetGrid
                    rows={directory}
                    columns={directoryColumns}
                    getRowId={(d) => d.id}
                    onCommit={(row, key, value) => saveDirectory(row.id, { [key]: key === "rating" && value !== null ? Math.max(0, Math.min(5, Number(value))) : value })}
                    formatMoney={money}
                    groupBy={groupByCategory}
                    onAddRow={addDirectory}
                    addRowLabel={(g) => `Add to ${g ?? "directory"}`}
                    rowActions={(d) => (
                        <>
                            <ContactLinks phone={d.phone} email={d.email} name={d.companyName || "vendor"} />
                            <button onClick={() => removeDirectory(d)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${d.companyName}`}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                />
            )}

            {importOpen && weddingId && (
                <DirectoryImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} weddingId={weddingId} onImportSuccess={() => loadWedding(weddingId)} />
            )}
        </div>
    );
}
