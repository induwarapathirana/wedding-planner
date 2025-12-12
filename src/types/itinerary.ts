export interface Event {
    id: string;
    wedding_id: string;
    title: string;
    start_time: string; // ISO String
    end_time?: string; // ISO String
    location?: string;
    description?: string;
    category?: string;
    created_at: string;
}

export interface NewEvent {
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    description?: string;
    category?: string;
}
