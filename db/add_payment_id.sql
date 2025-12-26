-- Add payment_id column to weddings table
alter table weddings 
add column if not exists payment_id text;

-- Add index for faster lookups (optional but good practice)
create index if not exists idx_weddings_payment_id on weddings(payment_id);
