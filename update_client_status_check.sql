-- The clients table has a CHECK constraint that validates the status column.
-- We need to update it to allow 'lost' as a valid status.

BEGIN;

-- 1. Drop the existing constraint
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- 2. Add the new constraint including 'lost'
ALTER TABLE public.clients 
    ADD CONSTRAINT clients_status_check 
    CHECK (status IN ('lead', 'active', 'completed', 'lost'));

COMMIT;
