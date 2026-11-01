"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { isLang } from "@/lib/rsvp-i18n";
import { getPlannerBrand } from "@/lib/brand";

// Public, unauthenticated actions: the guest's UUID in the link is the only
// credential, so only the fields the RSVP page needs are read or written.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEALS = new Set(["Non-veg", "Veg", "Vegan", "Halal", "Kids"]);
const NOTE_PREFIX = "RSVP message: ";

/** Dates are stored as @db.Date; format them as plain YYYY-MM-DD for the page. */
function toDateString(date: Date | null) {
    return date ? date.toISOString().slice(0, 10) : null;
}

function parseNames(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
}

/** selectedCompanions holds the last reply as a JSON array of booleans, one per member. */
function parseComing(raw: string | null): boolean[] | null {
    try {
        const parsed = JSON.parse(raw ?? "");
        return Array.isArray(parsed) && parsed.every((v) => typeof v === "boolean") ? parsed : null;
    } catch {
        return null;
    }
}

/** Everyone the invitation covers: the main guest, then companions (named or not). */
function members(guest: { name: string; companionGuestCount: number; companionNames: string | null }) {
    const named = parseNames(guest.companionNames);
    const count = Math.max(guest.companionGuestCount, named.length);
    return [guest.name, ...Array.from({ length: count }, (_, i) => named[i] ?? "")];
}

export async function getInvitationData(guestId: string) {
    if (!UUID.test(guestId)) return null;

    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: {
            id: true,
            name: true,
            rsvpStatus: true,
            mealPreference: true,
            companionGuestCount: true,
            companionNames: true,
            selectedCompanions: true,
            attendingCount: true,
            whatsappNumber: true,
            language: true,
            notes: true,
            wedding: {
                select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true, location: true },
            },
        },
    });
    if (!guest) return null;

    const people = members(guest);
    // Who's marked as coming: everyone until they reply, then exactly what they chose
    const saved = parseComing(guest.selectedCompanions);
    const coming = people.map((_, i) => (guest.rsvpStatus === "pending" ? true : guest.rsvpStatus === "declined" ? false : saved?.[i] ?? true));
    const note = guest.notes?.split("\n").find((l) => l.startsWith(NOTE_PREFIX))?.slice(NOTE_PREFIX.length) ?? "";

    const planner = await getPlannerBrand(guest.wedding.id);

    return {
        planner,
        guest: {
            id: guest.id,
            name: guest.name,
            rsvpStatus: guest.rsvpStatus as "pending" | "accepted" | "declined",
            mealPreference: guest.mealPreference ?? "",
            whatsappNumber: guest.whatsappNumber ?? "",
            language: isLang(guest.language) ? guest.language : null,
            members: people,
            coming,
            note,
        },
        wedding: {
            coupleName1: guest.wedding.coupleName1,
            coupleName2: guest.wedding.coupleName2,
            weddingDate: toDateString(guest.wedding.weddingDate),
            location: guest.wedding.location,
        },
    };
}

/** Saves a household's reply: who's coming, meal, phone and an optional message. */
export async function saveHouseholdRsvp(
    guestId: string,
    reply: { coming: boolean[]; mealPreference?: string; whatsappNumber?: string; note?: string; language?: string }
) {
    if (!UUID.test(guestId) || !Array.isArray(reply?.coming)) return { success: false };

    const current = await prisma.guest.findUnique({
        where: { id: guestId },
        select: { name: true, companionGuestCount: true, companionNames: true, notes: true },
    });
    if (!current) return { success: false };

    const people = members(current);
    const coming = people.map((_, i) => reply.coming[i] === true);
    const count = coming.filter(Boolean).length;
    const status: "accepted" | "declined" = count > 0 ? "accepted" : "declined";

    const note = String(reply.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
    const otherNotes = (current.notes ?? "").split("\n").filter((l) => l && !l.startsWith(NOTE_PREFIX));
    const notes = [...otherNotes, ...(note ? [NOTE_PREFIX + note] : [])].join("\n") || null;

    const guest = await prisma.guest.update({
        where: { id: guestId },
        data: {
            rsvpStatus: status,
            attendingCount: count,
            selectedCompanions: JSON.stringify(coming),
            mealPreference: reply.mealPreference && MEALS.has(reply.mealPreference) ? reply.mealPreference : null,
            whatsappNumber: String(reply.whatsappNumber || "").replace(/[^\d+\s-]/g, "").slice(0, 30) || null,
            language: isLang(reply.language) ? reply.language : undefined,
            notes,
        },
        select: {
            name: true,
            whatsappNumber: true,
            wedding: {
                select: {
                    coupleName1: true, coupleName2: true, weddingDate: true,
                    whatsappBusinessNumber: true, tier: true, premiumTrialEndsAt: true,
                },
            },
        },
    });

    // Confirmation over WhatsApp: a Premium feature (each message costs money),
    // sent only when the couple has set it up. A failed message never fails the RSVP.
    const { wedding } = guest;
    const hasPremium = wedding.tier === "premium" || (!!wedding.premiumTrialEndsAt && wedding.premiumTrialEndsAt > new Date());
    if (hasPremium && guest.whatsappNumber && wedding.whatsappBusinessNumber) {
        try {
            await sendWhatsAppMessage({
                to: guest.whatsappNumber,
                guestName: guest.name,
                coupleNames: `${wedding.coupleName1 || "Partner 1"} & ${wedding.coupleName2 || "Partner 2"}`,
                weddingDate: wedding.weddingDate ? format(wedding.weddingDate, "MMMM do, yyyy") : "your special day",
                status,
            });
        } catch (whatsappError) {
            console.error("WhatsApp send failed:", whatsappError);
        }
    }

    revalidatePath(`/invitation/${guestId}`);
    revalidatePath("/dashboard/guests");
    return { success: true, count, status };
}
