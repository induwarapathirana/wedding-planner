/**
 * The vendor and inventory screens still use the snake_case shapes from the
 * Supabase era, while Prisma returns camelCase. Convert rows as they arrive so
 * fields like company_name and unit_cost aren't undefined. Remove once those
 * screens move to the shared sheet component.
 */
import type { Vendor, VendorStatus } from "@/types/vendors";
import type { DirectoryVendor } from "@/types/directory";
import type { InventoryItem, ItemStatus } from "@/types/inventory";

type Row = Record<string, any>;

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : "");
const num = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));

export function toVendorRow(v: Row): Vendor {
    return {
        id: v.id,
        wedding_id: v.weddingId,
        category: v.category || "Other",
        company_name: v.companyName || "",
        contact_name: v.contactName || undefined,
        email: v.email || undefined,
        phone: v.phone || undefined,
        website: v.website || undefined,
        status: (v.status as VendorStatus) || "researching",
        price_estimate: num(v.priceEstimate),
        pricing_type: v.pricingType || null,
        pricing_unit: v.pricingUnit || undefined,
        notes: v.notes || undefined,
        created_at: iso(v.createdAt),
    };
}

export function toDirectoryVendorRow(v: Row): DirectoryVendor {
    return {
        id: v.id,
        user_id: v.userId,
        category: v.category || "Other",
        company_name: v.companyName || "",
        contact_name: v.contactName || undefined,
        email: v.email || undefined,
        phone: v.phone || undefined,
        website: v.website || undefined,
        price_estimate: num(v.priceEstimate),
        pricing_type: v.pricingType || null,
        pricing_unit: v.pricingUnit || undefined,
        notes: v.notes || undefined,
        created_at: iso(v.createdAt),
    };
}

export function toInventoryRow(i: Row): InventoryItem {
    return {
        id: i.id,
        wedding_id: i.weddingId,
        name: i.name,
        category: i.category || undefined,
        quantity: i.quantity ?? 1,
        unit_cost: num(i.unitPrice) ?? 0,
        status: (i.status as ItemStatus) || "needed",
        link: i.link || undefined,
        notes: i.notes || undefined,
        created_at: iso(i.createdAt),
    };
}
