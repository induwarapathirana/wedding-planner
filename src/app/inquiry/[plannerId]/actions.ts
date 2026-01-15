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

export async function getPlannerDetails(plannerId: string) {
    const supabase = getAdminClient();

    // Fetch planner profile to show name/business name
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, business_name, avatar_url') // Assuming these fields exist
        .eq('id', plannerId)
        .single();

    if (error) return null;
    return data;
}

export async function submitInquiry(plannerId: string, formData: any) {
    const supabase = getAdminClient();

    // Validate required fields
    if (!formData.name || !formData.email) {
        return { success: false, error: "Name and Email are required." };
    }

    const { error } = await supabase
        .from('clients')
        .insert({
            planner_id: plannerId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            wedding_date: formData.date || null,
            budget: formData.budget ? parseFloat(formData.budget) : 0,
            status: 'lead',
        });

    if (error) {
        console.error("Inquiry submission error:", error);
        return { success: false, error: "Failed to submit inquiry. Please try again." };
    }

    return { success: true };
}
