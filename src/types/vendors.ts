export type VendorStatus = 'researching' | 'contacted' | 'hired' | 'declined';

export interface Vendor {
    id: string;
    wedding_id: string;
    category: string;
    company_name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    website?: string;
    status: VendorStatus;
    price_estimate?: number;
    notes?: string;
    created_at: string;
}

export interface NewVendor {
    company_name: string;
    category: string;
    status: VendorStatus;
}
