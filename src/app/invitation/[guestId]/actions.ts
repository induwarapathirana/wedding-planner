"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Public, unauthenticated actions: the guest's UUID in the link is the only
// credential, so only the fields the RSVP page needs are read or written.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RSVP_STATUSES = new Set(["accepted", "declined", "pending"]);

/** Dates are stored as @db.Date; format them as plain YYYY-MM-DD for the page. */
function toDateString(date: Date | null) {
    return date ? date.toISOString().slice(0, 10) : null;
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
            plusOne: true,
            companionGuestCount: true,
            whatsappNumber: true,
            wedding: {
                select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true, location: true },
            },
        },
    });
    if (!guest) return null;

    return {
        guest: {
            id: guest.id,
            name: guest.name,
            rsvp_status: guest.rsvpStatus,
            meal_preference: guest.mealPreference ?? undefined,
            plus_one: guest.plusOne,
            companion_guest_count: guest.companionGuestCount,
            whatsapp_number: guest.whatsappNumber ?? undefined,
        },
        wedding: {
            id: guest.wedding.id,
            couple_name_1: guest.wedding.coupleName1,
            couple_name_2: guest.wedding.coupleName2,
            wedding_date: toDateString(guest.wedding.weddingDate) ?? undefined,
            location: guest.wedding.location ?? undefined,
        },
    };
}

export async function updateGuestRsvp(guestId: string, status: string, mealPreference: string, whatsappNumber?: string) {
    if (!UUID.test(guestId) || !RSVP_STATUSES.has(status)) {
        return { success: false, error: "Invalid RSVP." };
    }

    let guest;
    try {
        guest = await prisma.guest.update({
            where: { id: guestId },
            data: {
                rsvpStatus: status,
                mealPreference: String(mealPreference || "").slice(0, 100) || null,
                whatsappNumber: String(whatsappNumber || "").replace(/[^\d+\s-]/g, "").slice(0, 30) || null,
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
    } catch {
        return { success: false, error: "We couldn't find this invitation." };
    }

    // Confirmation over WhatsApp: a Premium feature (each message costs money),
    // sent only when the couple has set it up. A failed message never fails the RSVP.
    const { wedding } = guest;
    const hasPremium = wedding.tier === "premium" || (!!wedding.premiumTrialEndsAt && wedding.premiumTrialEndsAt > new Date());
    if (hasPremium && guest.whatsappNumber && wedding.whatsappBusinessNumber && status !== "pending") {
        try {
            await sendWhatsAppMessage({
                to: guest.whatsappNumber,
                guestName: guest.name,
                coupleNames: `${guest.wedding.coupleName1 || "Partner 1"} & ${guest.wedding.coupleName2 || "Partner 2"}`,
                weddingDate: guest.wedding.weddingDate ? format(guest.wedding.weddingDate, "MMMM do, yyyy") : "your special day",
                status: status as "accepted" | "declined",
            });
        } catch (whatsappError) {
            console.error("WhatsApp send failed:", whatsappError);
        }
    }

    revalidatePath(`/invitation/${guestId}`);
    revalidatePath("/dashboard/guests");
    return { success: true };
}
