-- Add companion_guest_count column to guests table
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS companion_guest_count INTEGER DEFAULT 0;

-- Update existing plus_one booleans to integer count 1 (optional, for migration)
UPDATE public.guests 
SET companion_guest_count = 1 
WHERE plus_one = true;

-- Drop the old column eventually, but we can keep it for now or rely on the new one.
-- Let's just use the new one in frontend.
