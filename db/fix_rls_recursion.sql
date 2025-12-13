-- FIX: RLS Recursion on Collaborators Table

-- 1. Create a secure helper function to get my weddings
-- This bypasses RLS (security definer) to avoid infinite recursion loops when creating policies.
create or replace function get_my_profile_wedding_ids()
returns setof uuid as $$
begin
  return query
  select wedding_id 
  from collaborators 
  where user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- 2. Drop the buggy recursive policy
drop policy if exists "Users can view team members" on collaborators;

-- 3. Create the new Safe Policy
-- I can see any collaborator row IF that row belongs to one of MY weddings.
create policy "Users can view team members"
on collaborators for select
using (
  wedding_id in (select get_my_profile_wedding_ids())
);
