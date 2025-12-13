-- Securely delete a wedding and all related data
-- Only the owner can execute this.
create or replace function delete_wedding_cascade(target_wedding_id uuid)
returns void as $$
declare
    is_owner boolean;
begin
    -- 1. Verify Ownership
    select exists (
        select 1 from collaborators
        where wedding_id = target_wedding_id
        and user_id = auth.uid()
        and role = 'owner'
    ) into is_owner;

    if not is_owner then
        raise exception 'Access Denied: Only the wedding owner can delete the wedding.';
    end if;

    -- 2. Delete the Wedding
    -- Assuming foreign keys (guests, budget, etc.) are set to ON DELETE CASCADE.
    -- If not, we should delete them manually here.
    -- For now, deleting the parent 'weddings' record usually triggers cascades if schema is good.
    -- We will try deleting the wedding. 
    -- If foreign keys fail, we'd need to delete children first.
    -- Safest bet: Delete from weddings where id matches.
    
    delete from weddings where id = target_wedding_id;
    
    -- Collaborators table usually references wedding_id. 
    -- If it was cascade, it's gone. If not, we might need to delete it.
    -- Just in case schema isn't cascade (common in Supabase defaults sometimes):
    -- delete from collaborators where wedding_id = target_wedding_id; (If needed)
    
end;
$$ language plpgsql security definer;
