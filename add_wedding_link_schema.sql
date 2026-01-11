-- Add wedding_id to clients table to link them to the B2C wedding record
DO $$ BEGIN
    ALTER TABLE public.clients ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update RLS to allow reading/linking
-- (Assuming planners are collaborators on the wedding, existing wedding policies should handle access)
