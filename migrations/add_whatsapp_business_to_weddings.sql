-- Add WhatsApp Business number to weddings table
ALTER TABLE weddings 
ADD COLUMN IF NOT EXISTS whatsapp_business_number TEXT;
