"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
                id, couple_name_1, couple_name_2, wedding_date, location
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

    revalidatePath(`/invitation/${guestId}`);
    return { success: true };
}
