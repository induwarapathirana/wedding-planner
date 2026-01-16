-- Add whatsapp_number column to guests table
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
