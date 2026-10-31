/**
 * The planner screens use snake_case client objects (from the Supabase era);
 * the database returns camelCase. Convert at the edges until those screens are rebuilt.
 */
export type ClientRow = {
    id: string;
    name: string;
    email: string;
    phone: string;
    wedding_date: string;
    budget: number;
    status: 'lead' | 'active' | 'completed' | 'lost';
    wedding_id?: string;
    notes?: string;
};

type DbClient = {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    weddingDate?: Date | string | null;
    budget?: unknown; // Decimal on the server, number once serialized
    status?: string | null;
    weddingId?: string | null;
    notes?: string | null;
};

export function toClientRow(c: DbClient): ClientRow {
    const date = c.weddingDate ? new Date(c.weddingDate) : null;
    return {
        id: c.id,
        name: c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed client",
        email: c.email || "",
        phone: c.phone || "",
        wedding_date: date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "",
        budget: Number(c.budget) || 0,
        status: (c.status as ClientRow['status']) || 'lead',
        wedding_id: c.weddingId || undefined,
        notes: c.notes || undefined,
    };
}

/** Turn edited snake_case fields back into the camelCase the server actions expect. */
export function fromClientRow(fields: Partial<ClientRow>) {
    const out: Record<string, unknown> = {};
    if (fields.name !== undefined) out.name = fields.name;
    if (fields.email !== undefined) out.email = fields.email || null;
    if (fields.phone !== undefined) out.phone = fields.phone || null;
    if (fields.wedding_date !== undefined) out.weddingDate = fields.wedding_date || null;
    if (fields.budget !== undefined) out.budget = fields.budget === null ? null : Number(fields.budget) || 0;
    if (fields.status !== undefined) out.status = fields.status;
    if (fields.notes !== undefined) out.notes = fields.notes || null;
    if (fields.wedding_id !== undefined) out.weddingId = fields.wedding_id || null;
    return out;
}
