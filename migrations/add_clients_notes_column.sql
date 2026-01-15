-- Add notes column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Optional: Add an index if you plan to search notes frequently
-- CREATE INDEX IF NOT EXISTS idx_clients_notes ON clients USING gin(to_tsvector('english', notes));
