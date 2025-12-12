-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. WEDDINGS (The Core Unit)
create table weddings (
  id uuid default uuid_generate_v4() primary key,
  created_by uuid references profiles(id) not null,
  couple_name_1 text not null,
  couple_name_2 text not null,
  wedding_date date,
  location text,
  currency text default 'USD',
  style_theme text, -- 'Elegant', 'Minimalist', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. COLLABORATORS (Many-to-Many: Users <-> Weddings)
create type wedding_role as enum ('owner', 'editor', 'viewer');

create table collaborators (
  wedding_id uuid references weddings(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role wedding_role default 'editor',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (wedding_id, user_id)
);

-- 4. BUDGET ITEMS
-- Supports both "Simple" (just use estimated_cost) and "Advanced" (paid, due dates)
create table budget_items (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  category text not null, -- 'Venue', 'Attire', 'Catering'
  name text not null,
  estimated_cost numeric default 0,
  actual_cost numeric default 0,
  paid_amount numeric default 0,
  due_date date,
  paid_at date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. GUESTS
create type rsvp_status as enum ('pending', 'accepted', 'declined');

create table guests (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  name text not null,
  email text,
  group_category text, -- 'Bride Family', 'Groom Friends'
  rsvp_status rsvp_status default 'pending',
  meal_preference text,
  plus_one boolean default false,
  table_assignment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Conceptual - not applied strictly yet)
-- Users can see weddings where they are in the collaborators table.

-- 6. CHECKLIST & TIMELINE
create table checklist_items (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  title text not null,
  category text, -- '12 Months Out', '6 Months Out', 'Ceremony', 'Reception'
  due_date date,
  is_completed boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
