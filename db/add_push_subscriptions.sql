-- Create push_subscriptions table to store web push subscriptions

create table if not exists push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  wedding_id uuid references weddings(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for efficient querying
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_wedding on push_subscriptions(wedding_id);

-- RLS policies
alter table push_subscriptions enable row level security;

-- Users can only manage their own subscriptions
create policy "Users can view their own push subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create their own push subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push subscriptions"
  on push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);
