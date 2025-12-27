-- Create feedback table
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  wedding_id uuid references weddings(id),
  rating int check (rating >= 1 and rating <= 5),
  message text,
  type text check (type in ('feedback', 'support')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table feedback enable row level security;

-- Policy: Users can insert their own feedback
create policy "Users can insert own feedback"
on feedback for insert
with check (auth.uid() = user_id);

-- Policy: Users can view their own feedback
create policy "Users can view own feedback"
on feedback for select
using (auth.uid() = user_id);
