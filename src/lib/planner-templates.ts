/**
 * What a planner's saved template holds. Dates are stored relative to the
 * wedding (days before it, or minutes after the first slot) so a template
 * can be applied to any wedding.
 */

export type TemplateKind = "checklist" | "budget" | "dayOf";

export type ChecklistTemplate = {
    tasks: { title: string; category: string | null; daysBefore: number | null; notes: string | null; assignee: string | null }[];
};

export type BudgetTemplate = {
    /** Share of the total budget, so the split scales to each couple's total */
    categories: { name: string; pct: number }[];
    items: { category: string; name: string; units: number; unitPrice: number | null; estimatedCost: number; notes: string | null }[];
};

export type DayOfTemplate = {
    /** Local time of the first slot, "HH:MM" */
    start: string;
    slots: { title: string; category: string | null; location: string | null; notes: string | null; offsetMinutes: number; durationMinutes: number }[];
};

export type TemplateItems = ChecklistTemplate | BudgetTemplate | DayOfTemplate;

export const KIND_LABELS: Record<TemplateKind, string> = {
    checklist: "Checklist",
    budget: "Budget",
    dayOf: "Run of show",
};

/** One line describing what's inside, for lists and pickers. */
export function describeTemplate(kind: string, items: unknown): string {
    const t = (items ?? {}) as Partial<ChecklistTemplate & BudgetTemplate & DayOfTemplate>;
    if (kind === "checklist") return `${t.tasks?.length ?? 0} tasks`;
    if (kind === "budget") return `${t.categories?.length ?? 0} categories · ${t.items?.length ?? 0} items`;
    if (kind === "dayOf") return `${t.slots?.length ?? 0} slots from ${t.start ?? "—"}`;
    return "";
}
