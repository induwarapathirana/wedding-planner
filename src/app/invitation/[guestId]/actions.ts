"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { format, parseISO } from "date-fns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    if (!supabaseServiceKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getInvitationData(guestId: string) {
    const supabase = getAdminClient();

    const { data: guestData, error } = await supabase
        .from('guests')
        .select(`
            id, name, rsvp_status, meal_preference, plus_one, companion_guest_count, whatsapp_number,
            weddings (
                id, couple_name_1, couple_name_2, wedding_date, location, whatsapp_business_number
            )
        `)
        .eq('id', guestId)
        .single();

    if (error || !guestData) {
        return null; // Or throw
    }

    const wedding = Array.isArray(guestData.weddings) ? guestData.weddings[0] : guestData.weddings;

    return {
        guest: {
            id: guestData.id,
            name: guestData.name,
            rsvp_status: guestData.rsvp_status,
            meal_preference: guestData.meal_preference,
            plus_one: guestData.plus_one,
            companion_guest_count: guestData.companion_guest_count,
            whatsapp_number: guestData.whatsapp_number
        },
        wedding: {
            id: wedding.id,
            couple_name_1: wedding.couple_name_1,
            couple_name_2: wedding.couple_name_2,
            wedding_date: wedding.wedding_date,
            location: wedding.location
        }
    };
}

export async function updateGuestRsvp(guestId: string, status: string, mealPreference: string, whatsappNumber?: string) {
    const supabase = getAdminClient();

    // 1. Update guest RSVP status
    const { error } = await supabase
        .from('guests')
        .update({
            rsvp_status: status,
            meal_preference: mealPreference,
            whatsapp_number: whatsappNumber || null
        })
        .eq('id', guestId);

    if (error) {
        return { success: false, error: error.message };
    }

    // 2. Fetch guest and wedding data for WhatsApp message
    try {
        const { data: guestData } = await supabase
            .from('guests')
            .select(`
                id, name, whatsapp_number,
                wedding_id,
                weddings (
                    couple_name_1, couple_name_2, wedding_date, whatsapp_business_number
                )
            `)
            .eq('id', guestId)
            .single();

        if (guestData && guestData.whatsapp_number) {
            const wedding = Array.isArray(guestData.weddings) ? guestData.weddings[0] : guestData.weddings;

            // Only send if wedding has WhatsApp Business number configured
            if (wedding && wedding.whatsapp_business_number) {
                const coupleNames = `${wedding.couple_name_1 || 'Partner 1'} & ${wedding.couple_name_2 || 'Partner 2'}`;
                const weddingDate = wedding.wedding_date
                    ? format(parseISO(wedding.wedding_date), "MMMM do, yyyy")
                    : "your special day";

                // Send WhatsApp message (non-blocking)
                await sendWhatsAppMessage({
                    to: guestData.whatsapp_number,
                    guestName: guestData.name,
                    coupleNames,
                    weddingDate,
                    status: status as 'accepted' | 'declined'
                });
            }
        }
    } catch (whatsappError) {
        // Log but don't fail the RSVP if WhatsApp fails
        console.error("WhatsApp send failed:", whatsappError);
    }

    revalidatePath(`/invitation/${guestId}`);
    return { success: true };
}
