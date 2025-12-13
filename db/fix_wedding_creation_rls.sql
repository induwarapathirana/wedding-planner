-- FIX WEDDING CREATION RLS
-- The "Users can create weddings" error happens because the INSERT tries to return the data (select),
-- but the user is not yet a collaborator (collaborator is added AFTER insert).

-- 1. Ensure 'created_by' column exists (safe to run even if exists)
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'weddings' and column_name = 'created_by') then
        alter table weddings add column created_by uuid references auth.users(id);
    end if; 
end $$;

-- 2. Update SELECT policy to allow creator to see their own wedding immediately
-- (Drop the old one first to be safe, or just OR it? Cleaner to replace)

drop policy if exists "Collaborators can view weddings" on weddings;

create policy "Collaborators and Creators can view weddings"
on weddings for select
using (
  -- Either they are in the collaborators table...
  exists (
    select 1 from collaborators c
    where c.wedding_id = id
    and c.user_id = auth.uid()
  )
  -- OR they are the creator (for the initial insert return)
  or created_by = auth.uid()
);
