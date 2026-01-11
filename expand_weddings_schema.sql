-- Comprehensive update for the weddings table
-- This handles missing columns and adds new ones for the B2B->B2C flow.

DO $$ BEGIN
    -- 1. Ensure 'name' exists (Main identifier, e.g., "Sarah & Mike's Wedding")
    ALTER TABLE public.weddings ADD COLUMN name text;

    -- 2. Add Partner Names (Specific fields for the couple)
    ALTER TABLE public.weddings ADD COLUMN partner1_name text;
    ALTER TABLE public.weddings ADD COLUMN partner2_name text;

    -- 3. Ensure Financial fields exist
    ALTER TABLE public.weddings ADD COLUMN budget numeric DEFAULT 0;
    ALTER TABLE public.weddings ADD COLUMN currency text DEFAULT 'USD';

    -- 4. Ensure created_at exists (it usually does, but safe to check)
    -- ALTER TABLE public.weddings ADD COLUMN created_at timestamp with time zone DEFAULT now();

EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
