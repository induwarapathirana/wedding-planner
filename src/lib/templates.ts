/**
 * Starter plans generated at setup (and offered on empty pages), so a new
 * wedding opens with something to edit down instead of a blank page.
 * Written for Sri Lankan weddings first; traditions add their own tasks.
 */

export type Tradition = "poruwa" | "kandyan" | "homecoming" | "church" | "hindu" | "nikah";

export const TRADITIONS: { value: Tradition; label: string }[] = [
    { value: "poruwa", label: "Poruwa ceremony" },
    { value: "kandyan", label: "Kandyan drummers & dancers" },
    { value: "homecoming", label: "Homecoming" },
    { value: "church", label: "Church ceremony" },
    { value: "hindu", label: "Hindu ceremony" },
    { value: "nikah", label: "Nikah" },
];

/** Budget split as percentages of the total; starter items get filled in later. */
export const BUDGET_TEMPLATE: { name: string; pct: number; items: { name: string; perGuest?: boolean }[] }[] = [
    { name: "Venue & food", pct: 45, items: [{ name: "Venue hire" }, { name: "Catering", perGuest: true }, { name: "Welcome drinks", perGuest: true }] },
    { name: "Photo & video", pct: 12, items: [{ name: "Photographer" }, { name: "Videographer" }] },
    { name: "Attire & beauty", pct: 10, items: [{ name: "Bride's outfit" }, { name: "Groom's outfit" }, { name: "Hair & make-up" }] },
    { name: "Décor & flowers", pct: 9, items: [{ name: "Décor" }, { name: "Flowers" }] },
    { name: "Ceremony", pct: 5, items: [{ name: "Poruwa & ceremony items" }] },
    { name: "Music & entertainment", pct: 4, items: [{ name: "DJ or band" }] },
    { name: "Stationery", pct: 3, items: [{ name: "Invitations" }] },
    { name: "Transport", pct: 3, items: [{ name: "Wedding car" }] },
    { name: "Cake & favours", pct: 3, items: [{ name: "Wedding cake" }, { name: "Favours" }] },
    { name: "Contingency", pct: 6, items: [] },
];

type TaskTemplate = { title: string; daysBefore: number; tradition?: Tradition };

/** Checklist tasks, due a number of days before the wedding. */
export const CHECKLIST_TEMPLATE: TaskTemplate[] = [
    { title: "Agree on a total budget together", daysBefore: 365 },
    { title: "Draft the first guest list", daysBefore: 360 },
    { title: "Consult an astrologer for the nekath", daysBefore: 355, tradition: "poruwa" },
    { title: "Shortlist and visit venues", daysBefore: 350 },
    { title: "Book the venue", daysBefore: 330 },
    { title: "Book the church and meet the priest", daysBefore: 330, tradition: "church" },
    { title: "Book the photographer", daysBefore: 300 },
    { title: "Book the videographer", daysBefore: 290 },
    { title: "Choose the wedding party", daysBefore: 280 },
    { title: "Book the ashtaka and Poruwa decorator", daysBefore: 240, tradition: "poruwa" },
    { title: "Book Kandyan drummers and dancers", daysBefore: 230, tradition: "kandyan" },
    { title: "Book the priest and temple or hall", daysBefore: 240, tradition: "hindu" },
    { title: "Arrange the Nikah officiant (Kazi)", daysBefore: 240, tradition: "nikah" },
    { title: "Book the DJ or band", daysBefore: 220 },
    { title: "Choose décor and flowers", daysBefore: 200 },
    { title: "Order the bride's outfit", daysBefore: 180 },
    { title: "Order the groom's outfit", daysBefore: 160 },
    { title: "Book hair and make-up", daysBefore: 160 },
    { title: "Plan the pre-shoot", daysBefore: 150 },
    { title: "Book the homecoming venue", daysBefore: 150, tradition: "homecoming" },
    { title: "Finalise the guest list", daysBefore: 120 },
    { title: "Order invitations", daysBefore: 110 },
    { title: "Book wedding transport", daysBefore: 100 },
    { title: "Complete pre-marriage course", daysBefore: 100, tradition: "church" },
    { title: "Send invitations", daysBefore: 75 },
    { title: "Order the cake and favours", daysBefore: 60 },
    { title: "Register the marriage with the Registrar", daysBefore: 45 },
    { title: "Chase RSVPs", daysBefore: 30 },
    { title: "Confirm the menu and final headcount", daysBefore: 21 },
    { title: "Plan seating", daysBefore: 14 },
    { title: "Confirm times with every vendor", daysBefore: 10 },
    { title: "Final outfit fittings", daysBefore: 7 },
    { title: "Pay outstanding vendor balances", daysBefore: 5 },
    { title: "Pack for the day and the homecoming", daysBefore: 2 },
];

/** Same timeframe labels the checklist page groups by. */
export function timeframeFor(daysBefore: number): string {
    if (daysBefore >= 365) return "12+ Months Out";
    if (daysBefore >= 270) return "9-12 Months Out";
    if (daysBefore >= 180) return "6-9 Months Out";
    if (daysBefore >= 120) return "4-6 Months Out";
    if (daysBefore >= 60) return "2-4 Months Out";
    if (daysBefore >= 7) return "1 Month Out";
    if (daysBefore >= 1) return "Final Week";
    return "Wedding Day";
}

/**
 * Due date for a task: the wedding date minus its offset, but never in the
 * past, so a late start doesn't open with dozens of overdue tasks.
 */
export function dueDateFor(weddingDate: Date, daysBefore: number, today = new Date()): Date {
    const due = new Date(weddingDate);
    due.setUTCDate(due.getUTCDate() - daysBefore);
    const floor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    return due < floor ? floor : due;
}

export function checklistFor(traditions: Tradition[]): TaskTemplate[] {
    return CHECKLIST_TEMPLATE.filter((t) => !t.tradition || traditions.includes(t.tradition));
}

/** Day-of run of show, as minutes relative to the ceremony start. */
export const DAY_OF_TEMPLATE: { title: string; offsetMinutes: number; durationMinutes: number; category: string }[] = [
    { title: "Hair & make-up begins", offsetMinutes: -250, durationMinutes: 150, category: "prep" },
    { title: "Photographer arrives", offsetMinutes: -190, durationMinutes: 30, category: "photo" },
    { title: "Leave for the venue", offsetMinutes: -80, durationMinutes: 30, category: "transport" },
    { title: "Guests seated", offsetMinutes: -45, durationMinutes: 40, category: "ceremony" },
    { title: "Ceremony", offsetMinutes: 0, durationMinutes: 45, category: "ceremony" },
    { title: "Signing of the register", offsetMinutes: 50, durationMinutes: 20, category: "ceremony" },
    { title: "Lighting the oil lamp & speeches", offsetMinutes: 80, durationMinutes: 30, category: "reception" },
    { title: "Lunch served", offsetMinutes: 170, durationMinutes: 90, category: "meal" },
    { title: "Cake & first dance", offsetMinutes: 290, durationMinutes: 30, category: "reception" },
    { title: "Going away", offsetMinutes: 350, durationMinutes: 30, category: "other" },
];
