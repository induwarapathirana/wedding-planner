-- SECURE ALL TABLES (Fix for "Unrestricted" warning)
-- This script enables RLS on all tables that were missing it and adds standard policies.
-- Updated to be Re-Run Safe (Idempotent)

-- 1. PROFILES
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" 
on profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" 
on profiles for update using (auth.uid() = id);

-- Allow new users to insert their profile (handled by trigger, but good to have)
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" 
on profiles for insert with check (auth.uid() = id);

-- Public read for collaboration (needed to see team member names)
drop policy if exists "Users can view team profiles" on profiles;
create policy "Users can view team profiles"
on profiles for select
using (
  exists (
    select 1 from collaborators c
    where c.user_id = profiles.id
    and c.wedding_id in (select wedding_id from collaborators where user_id = auth.uid())
  )
);

-- 2. WEDDINGS
alter table weddings enable row level security;

-- Policy: Users can view/update weddings they are a collaborator on
drop policy if exists "Collaborators can view weddings" on weddings;
create policy "Collaborators can view weddings"
on weddings for select
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "Collaborators can update weddings" on weddings;
create policy "Collaborators can update weddings"
on weddings for update
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = id
    and c.user_id = auth.uid()
    and c.role in ('owner', 'editor')
  )
);

drop policy if exists "Users can create weddings" on weddings;
create policy "Users can create weddings"
on weddings for insert
with check (true); -- Anyone can create, relationship established immediately after

-- 3. GUESTS
alter table guests enable row level security;

drop policy if exists "Collaborators can view guests" on guests;
create policy "Collaborators can view guests"
on guests for select
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = guests.wedding_id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "Collaborators can manage guests" on guests;
create policy "Collaborators can manage guests"
on guests for all
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = guests.wedding_id
    and c.user_id = auth.uid()
  )
);

-- 4. BUDGET ITEMS
alter table budget_items enable row level security;

drop policy if exists "Collaborators can view budget" on budget_items;
create policy "Collaborators can view budget"
on budget_items for select
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = budget_items.wedding_id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "Collaborators can manage budget" on budget_items;
create policy "Collaborators can manage budget"
on budget_items for all
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = budget_items.wedding_id
    and c.user_id = auth.uid()
  )
);

-- 5. CHECKLIST ITEMS
alter table checklist_items enable row level security;

drop policy if exists "Collaborators can view checklist" on checklist_items;
create policy "Collaborators can view checklist"
on checklist_items for select
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = checklist_items.wedding_id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "Collaborators can manage checklist" on checklist_items;
create policy "Collaborators can manage checklist"
on checklist_items for all
using (
  exists (
    select 1 from collaborators c
    where c.wedding_id = checklist_items.wedding_id
    and c.user_id = auth.uid()
  )
);
