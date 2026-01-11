-- The weddings table is missing the 'budget' column, causing errors when converting specific clients.
-- We also ensure 'currency' exists.

DO $$ BEGIN
    ALTER TABLE public.weddings ADD COLUMN budget numeric DEFAULT 0;
    ALTER TABLE public.weddings ADD COLUMN currency text DEFAULT 'USD';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
