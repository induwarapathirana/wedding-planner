export interface DirectoryVendor {
    id: string;
    user_id: string;
    category: string;
    company_name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    website?: string;
    price_estimate?: number;
    pricing_type?: 'flat_rate' | 'per_person' | 'hourly' | 'per_item' | 'package' | 'tbd' | null;
    pricing_unit?: string;
    notes?: string;
    created_at: string;
}

export type NewDirectoryVendor = Omit<DirectoryVendor, 'id' | 'user_id' | 'created_at'>;
