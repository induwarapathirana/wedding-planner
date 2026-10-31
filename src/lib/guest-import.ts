/**
 * Shared by the CSV import and pasting rows into the guest sheet: map loose
 * spreadsheet text ("yes", "Bride's side", "3") onto guest fields.
 */

export type GuestField =
    | "name" | "side" | "groupCategory" | "party" | "whatsappNumber" | "email" | "address"
    | "rsvpStatus" | "mealPreference" | "tableAssignment" | "priority" | "companionNames" | "notes";

export const GUEST_FIELDS: { key: GuestField; label: string; aliases: string[] }[] = [
    { key: "name", label: "Name", aliases: ["name", "guest", "guest name", "household", "full name", "family"] },
    { key: "side", label: "Side", aliases: ["side", "bride/groom", "bride or groom"] },
    { key: "groupCategory", label: "Group", aliases: ["group", "category", "relation", "relationship", "circle"] },
    { key: "party", label: "Party size", aliases: ["party", "party size", "guests", "count", "headcount", "pax", "no of guests", "number"] },
    { key: "whatsappNumber", label: "WhatsApp / phone", aliases: ["whatsapp", "phone", "mobile", "contact", "tel", "number (mobile)"] },
    { key: "email", label: "Email", aliases: ["email", "e-mail", "mail"] },
    { key: "address", label: "Address", aliases: ["address", "postal address", "home address"] },
    { key: "rsvpStatus", label: "RSVP", aliases: ["rsvp", "status", "attending", "coming", "response"] },
    { key: "mealPreference", label: "Meal", aliases: ["meal", "food", "diet", "dietary", "menu"] },
    { key: "tableAssignment", label: "Table", aliases: ["table", "table no", "seat", "seating"] },
    { key: "priority", label: "List (A/B/C)", aliases: ["list", "priority", "tier", "a/b/c"] },
    { key: "companionNames", label: "Companion names", aliases: ["companions", "companion names", "plus ones", "with"] },
    { key: "notes", label: "Notes", aliases: ["notes", "note", "comments", "remarks"] },
];

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();

/** Best-guess field for a CSV header, or null to skip the column. */
export function guessField(header: string): GuestField | null {
    const h = squash(header);
    if (!h) return null;
    const exact = GUEST_FIELDS.find((f) => f.aliases.includes(h));
    if (exact) return exact.key;
    const partial = GUEST_FIELDS.find((f) => f.aliases.some((a) => h.includes(a)));
    return partial?.key ?? null;
}

export function normalizeSide(v: string): "bride" | "groom" | "both" | null {
    const s = v.toLowerCase();
    if (!s.trim()) return null;
    if (s.includes("both") || s.includes("mutual")) return "both";
    if (s.includes("bride")) return "bride";
    if (s.includes("groom")) return "groom";
    return null;
}

export function normalizeRsvp(v: string): "pending" | "accepted" | "declined" {
    const s = v.trim().toLowerCase();
    if (/^(y|yes|accepted|accept|attending|coming|confirmed|going)\b/.test(s)) return "accepted";
    if (/^(n|no|declined|decline|not)\b/.test(s)) return "declined";
    return "pending";
}

/** Turn one row of text values into a createGuest payload, or null if it has no name. */
export function normalizeGuest(raw: Partial<Record<GuestField, string>>) {
    const name = raw.name?.trim();
    if (!name) return null;
    const party = parseInt(raw.party ?? "", 10);
    const companions = (raw.companionNames ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const priority = raw.priority?.trim().toUpperCase();
    const side = normalizeSide(raw.side ?? "") ?? normalizeSide(raw.groupCategory ?? "");
    return {
        name,
        side,
        groupCategory: raw.groupCategory?.trim() || null,
        companionGuestCount: Number.isFinite(party) && party > 1 ? party - 1 : companions.length,
        companionNames: companions.length ? JSON.stringify(companions) : null,
        whatsappNumber: raw.whatsappNumber?.trim() || null,
        email: raw.email?.trim() || null,
        address: raw.address?.trim() || null,
        rsvpStatus: normalizeRsvp(raw.rsvpStatus ?? ""),
        mealPreference: raw.mealPreference?.trim() || null,
        tableAssignment: raw.tableAssignment?.trim() || null,
        priority: priority === "A" || priority === "B" || priority === "C" ? priority : "B",
        notes: raw.notes?.trim() || null,
    };
}
