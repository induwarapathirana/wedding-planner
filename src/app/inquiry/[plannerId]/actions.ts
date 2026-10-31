"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Public, unauthenticated actions behind a planner's shareable inquiry link.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLANNER_ROLES = ["planner", "vendor", "pro"];

/** Only the public parts of a planner's profile, and only for planner accounts. */
export async function getPlannerDetails(plannerId: string) {
    if (!UUID.test(plannerId)) return null;

    const planner = await prisma.user.findFirst({
        where: { id: plannerId, role: { in: PLANNER_ROLES } },
        select: { name: true, companyName: true, logoUrl: true },
    });
    if (!planner) return null;

    return {
        company_name: planner.companyName,
        full_name: planner.name,
        logo_url: planner.logoUrl,
    };
}

type InquiryForm = {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    date?: unknown;
    budget?: unknown;
    message?: unknown;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function submitInquiry(plannerId: string, formData: InquiryForm) {
    const name = text(formData.name, 200);
    const email = text(formData.email, 200);
    if (!name || !email) return { success: false, error: "Name and Email are required." };
    if (!EMAIL.test(email)) return { success: false, error: "Please enter a valid email address." };

    if (!(await getPlannerDetails(plannerId))) {
        return { success: false, error: "This inquiry form is no longer available." };
    }

    const dateText = text(formData.date, 10);
    const weddingDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(dateText) : null;
    const budget = Number(text(formData.budget, 20));

    try {
        await prisma.client.create({
            data: {
                plannerId,
                name,
                email,
                phone: text(formData.phone, 40) || null,
                weddingDate,
                budget: Number.isFinite(budget) && budget > 0 ? budget : 0,
                status: "lead",
                notes: text(formData.message, 5000) || null,
            },
        });
    } catch (error) {
        console.error("Inquiry submission error:", error);
        return { success: false, error: "Failed to submit inquiry. Please try again." };
    }

    revalidatePath("/dashboard/clients");
    return { success: true };
}
