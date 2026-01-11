-- Add business details to profiles table
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN company_name text;
    ALTER TABLE public.profiles ADD COLUMN logo_url text; -- URL to storage
    ALTER TABLE public.profiles ADD COLUMN website text;
    ALTER TABLE public.profiles ADD COLUMN signature_url text; -- URL to storage for invoicing
    ALTER TABLE public.profiles ADD COLUMN branding_color text DEFAULT '#000000';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
