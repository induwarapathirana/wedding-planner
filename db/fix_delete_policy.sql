-- FIX: RLS Delete Policy for Collaborators
-- The previous delete policy might fail due to recursion or SELECT policy restrictions on the subquery.
-- We will use a secure function to check ownership.

-- 1. Create a secure function to check if current user is owner of a wedding
create or replace function public.is_wedding_owner(_wedding_id uuid)
returns boolean
language plpgsql security definer
set search_path = public -- Secure search path
as $$
begin
  return exists (
    select 1 
    from collaborators 
    where wedding_id = _wedding_id
    and user_id = auth.uid()
    and role = 'owner'
  );
end;
$$;

-- 2. Drop the old delete policy (if it exists)
drop policy if exists "Owners can remove team members" on collaborators;

-- 3. Create the robust delete policy
create policy "Owners can remove team members"
on collaborators for delete
using (
  public.is_wedding_owner(wedding_id)
);
