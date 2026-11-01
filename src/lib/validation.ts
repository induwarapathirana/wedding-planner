import { z } from "zod";

/**
 * Input schemas for the server actions. Each one lists exactly the columns a
 * client may write, so ownership fields (id, weddingId, tier, …) can't be set,
 * and normalises what forms send: "" → null, NaN → null, date strings → Date.
 * Unknown keys are stripped.
 */

const blankToNull = (v: unknown) => (v === "" ? null : v);

const text = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable()).optional();
const required = (max: number) => z.string().trim().min(1, "is required").max(max);

const number = z
    .preprocess((v) => {
        if (v === undefined) return undefined;
        if (v === null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }, z.number().nullable())
    .optional();

/** For NOT NULL money columns: a cleared field means 0. */
const amount = number.transform((v) => (v === null ? 0 : v));

const integer = (min = 0) =>
    z
        .preprocess((v) => {
            if (v === undefined) return undefined;
            if (v === null || v === "") return null;
            const n = Number(v);
            return Number.isFinite(n) ? Math.round(n) : null;
        }, z.number().int().min(min).nullable())
        .optional();

const date = z
    .preprocess((v) => {
        if (v === undefined) return undefined;
        if (v === null || v === "") return null;
        return v instanceof Date ? v : new Date(v as string);
    }, z.date({ invalid_type_error: "must be a valid date" }).nullable())
    .optional();

const bool = z.boolean().optional();

export const guestCreate = z.object({
    name: required(200),
    email: text(200),
    groupCategory: text(100),
    rsvpStatus: z.enum(["pending", "accepted", "declined"]).optional(),
    priority: z.enum(["A", "B", "C"]).optional(),
    mealPreference: text(100),
    plusOne: bool,
    tableAssignment: text(50),
    companionGuestCount: integer(0).transform((v) => v ?? 0),
    companionNames: text(5000),
    selectedCompanions: text(5000),
    whatsappNumber: text(30),
    side: z.preprocess(blankToNull, z.enum(["bride", "groom", "both"]).nullable()).optional(),
    address: text(500),
    inviteStatus: z.enum(["not_sent", "sent"]).optional(),
    notes: text(5000),
    attendingCount: integer(0),
    language: z.preprocess(blankToNull, z.enum(["en", "si", "ta"]).nullable()).optional(),
    remindedAt: date,
});
export const guestUpdate = guestCreate.partial();

/** Bulk edits from the guest sheet's selection bar. */
export const guestBulkUpdate = guestCreate
    .pick({ rsvpStatus: true, tableAssignment: true, side: true, inviteStatus: true, priority: true, groupCategory: true, mealPreference: true, language: true, remindedAt: true })
    .partial();

export const budgetItemCreate = z.object({
    category: required(100),
    name: required(200),
    estimatedCost: amount,
    unitPrice: number,
    units: integer(1).transform((v) => v ?? 1),
    actualCost: amount,
    paidAmount: amount,
    dueDate: date,
    paidAt: date,
    notes: text(5000),
});
export const budgetItemUpdate = budgetItemCreate.partial();

export const checklistItemCreate = z.object({
    title: required(300),
    category: text(100),
    dueDate: date,
    dueOffsetDays: integer(0),
    isCompleted: bool,
    notes: text(5000),
    assignee: text(100),
});
export const checklistItemUpdate = checklistItemCreate.partial();

export const paymentCreate = z.object({
    label: required(100),
    amount,
    dueDate: date,
    paidAt: date,
});
export const paymentUpdate = paymentCreate.partial();

/** Booking a vendor: the agreed price, how it's paid and where it sits in the budget. */
export const vendorBooking = z.object({
    total: z.coerce.number().min(0),
    category: required(100),
    payments: z.array(paymentCreate).max(12),
    addTasks: z.boolean().default(true),
});

const vendorFields = {
    category: text(100),
    companyName: text(200),
    contactName: text(200),
    email: text(200),
    phone: text(40),
    website: text(500),
    priceEstimate: number,
    pricingType: text(30),
    pricingUnit: text(50),
    notes: text(5000),
};

export const vendorCreate = z.object({
    ...vendorFields,
    cost: number,
    deposit: number,
    status: z.enum(["researching", "contacted", "hired", "declined"]).optional(),
});
export const vendorUpdate = vendorCreate.partial();

export const directoryVendorCreate = z.object({
    ...vendorFields,
    rating: integer(0),
});
export const directoryVendorUpdate = directoryVendorCreate.partial();

export const inventoryItemCreate = z.object({
    name: required(200),
    category: text(100),
    quantity: integer(0).transform((v) => v ?? 1),
    unitPrice: number,
    totalPrice: number,
    status: z.enum(["needed", "purchased", "rented", "borrowed", "packed", "ordered", "received"]).optional(),
    link: text(1000),
    notes: text(5000),
});
export const inventoryItemUpdate = inventoryItemCreate.partial();

export const eventCreate = z.object({
    title: required(200),
    description: text(5000),
    startTime: date,
    endTime: date,
    location: text(300),
    category: text(50),
    notes: text(5000),
});
export const eventUpdate = eventCreate.partial();

export const budgetCategoryCreate = z.object({
    name: required(100),
    allocated: amount,
    sortOrder: integer(0).transform((v) => v ?? undefined),
});
export const budgetCategoryUpdate = budgetCategoryCreate.partial();

export const weddingSetup = z.object({
    coupleName1: required(100),
    coupleName2: required(100),
    weddingDate: date,
    ceremonyTime: z.preprocess(blankToNull, z.string().regex(/^\d{2}:\d{2}$/).nullable()).optional(),
    tzOffsetMinutes: z.number().int().min(-840).max(840).optional(),
    location: text(300),
    targetGuestCount: integer(0),
    estimatedBudget: number,
    currency: z.string().trim().min(3).max(5).default("LKR"),
    traditions: z.array(z.enum(["poruwa", "kandyan", "homecoming", "church", "hindu", "nikah"])).default([]),
    setup: z
        .object({ checklist: z.boolean().default(true), budget: z.boolean().default(true), dayOf: z.boolean().default(true) })
        .default({}),
});

export const clientUpdate = z
    .object({
        name: text(200),
        firstName: text(100),
        lastName: text(100),
        email: text(200),
        phone: text(40),
        weddingDate: date,
        budget: number,
        status: z.enum(["lead", "active", "completed", "lost"]).optional(),
        notes: text(5000),
    })
    .partial();

export const weddingUpdate = z
    .object({
        coupleName1: required(100),
        coupleName2: z.string().trim().max(100),
        weddingDate: date,
        location: text(300),
        currency: z.string().trim().min(3).max(5),
        styleTheme: text(100),
        targetGuestCount: integer(0),
        estimatedBudget: number,
        whatsappBusinessNumber: text(30),
    })
    .partial();

/** Parse or throw one readable message, e.g. "name is required". */
export function validate<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
    const result = schema.safeParse(data ?? {});
    if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join(".") || "input";
        throw new Error(`Invalid ${field}: ${issue.message}`);
    }
    return result.data;
}

export const seatingTableCreate = z.object({
    name: required(50),
    capacity: integer(1).transform((v) => v ?? 10),
});
export const seatingTableUpdate = seatingTableCreate.partial();
