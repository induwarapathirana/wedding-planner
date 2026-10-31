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

    console.log(`Fetching planner details for: ${plannerId}`);

    // Fetch planner profile to show name/business name
    // Using * to safeguard against missing optional columns like business_name
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', plannerId)
        .single();

    if (error) {
        console.error("Error fetching planner details:", error);
        return null;
    }

    return data;
}

export async function submitInquiry(plannerId: string, formData: any) {
    const supabase = getAdminClient();

    console.log(`Submitting inquiry for planner: ${plannerId}`, formData);

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
            notes: formData.message || null, // Save the message as notes
        });

    if (error) {
        console.error("Inquiry submission error:", error);
        return { success: false, error: "Failed to submit inquiry. Please try again." };
    }

    return { success: true };
}
