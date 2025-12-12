export type ItemStatus = 'needed' | 'purchased' | 'rented' | 'borrowed' | 'packed';

export interface InventoryItem {
    id: string;
    wedding_id: string;
    name: string;
    category?: string;
    quantity: number;
    unit_cost: number;
    status: ItemStatus;
    link?: string;
    notes?: string;
    created_at: string;
}

export interface NewInventoryItem {
    name: string;
    category: string;
    quantity: number;
    unit_cost: number;
    status: ItemStatus;
}
