-- The clients table was likely created with 'first_name' and 'last_name' from an older schema.
-- The new application code uses a single 'name' field (better for "Sarah & Mike" style names).

-- 1. Add the 'name' column if it's missing
DO $$ BEGIN
    ALTER TABLE public.clients ADD COLUMN name text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Migrate existing data (if any)
UPDATE public.clients 
SET name = TRIM(BOTH ' ' FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE name IS NULL OR name = '';

-- 3. Make 'first_name' and 'last_name' optional (nullable) so inserts don't fail
ALTER TABLE public.clients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN last_name DROP NOT NULL;
