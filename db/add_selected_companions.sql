-- Add selected_companions column to track which companions are selected
-- This allows partial selection of companions from a guest party
-- Example: If guest has companions ["Wife", "Kid 1", "Kid 2"], 
--          selected_companions might be ["Wife", "Kid 1"] for 2 out of 3

ALTER TABLE guests
ADD COLUMN IF NOT EXISTS selected_companions text[];

COMMENT ON COLUMN guests.selected_companions IS 'Array of companion names that are selected. NULL means all companions are selected (backward compatibility).';
