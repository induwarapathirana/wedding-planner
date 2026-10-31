export interface Event {
    id: string;
    weddingId: string;
    title: string;
    startTime: string; // ISO String
    endTime?: string | null; // ISO String
    location?: string | null;
    description?: string | null;
    category?: string | null;
    createdAt: string;
}

export type EventType = "ceremony" | "reception" | "meal" | "photo" | "transport" | "prep" | "other";

export interface NewEvent {
    title: string;
    startTime: string;
    endTime?: string | null;
    location?: string | null;
    description?: string | null;
    category?: string | null;
}
