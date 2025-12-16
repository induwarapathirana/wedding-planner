-- Create a specific table for the User's Vendor Directory (Master List)
create table vendor_directory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null, -- Linked to the USER, not a wedding
  category text not null,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  price_estimate numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table vendor_directory enable row level security;

-- Policies
-- Users can see their own directory items
create policy "Users can view their own directory items"
  on vendor_directory for select
  using (auth.uid() = user_id);

-- Users can insert into their own directory
create policy "Users can insert into their own directory"
  on vendor_directory for insert
  with check (auth.uid() = user_id);

-- Users can update their own directory items
create policy "Users can update their own directory items"
  on vendor_directory for update
  using (auth.uid() = user_id);

-- Users can delete their own directory items
create policy "Users can delete their own directory items"
  on vendor_directory for delete
  using (auth.uid() = user_id);
