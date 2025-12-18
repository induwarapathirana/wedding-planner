-- RPC function to upgrade wedding tier (SECURITY DEFINER to bypass RLS)
-- IMPORTANT: Only the wedding owner can upgrade the tier

-- Drop existing function first (required because return type is changing from void to json)
drop function if exists upgrade_wedding_tier(uuid);

create or replace function upgrade_wedding_tier(wedding_id uuid)
returns json as $$
declare
  is_owner boolean;
begin
  -- Security check: Verify the caller is an owner of this wedding
  select exists(
    select 1 from collaborators
    where collaborators.wedding_id = upgrade_wedding_tier.wedding_id
    and collaborators.user_id = auth.uid()
    and collaborators.role = 'owner'
  ) into is_owner;

  if not is_owner then
    return json_build_object('error', 'Unauthorized: Only wedding owners can upgrade the tier.');
  end if;

  -- Perform the upgrade
  update weddings
  set tier = 'premium'
  where id = upgrade_wedding_tier.wedding_id;

  return json_build_object('success', true, 'message', 'Wedding upgraded to premium!');
end;
$$ language plpgsql security definer;

-- Ensure only authenticated users can call this function
revoke all on function upgrade_wedding_tier(uuid) from public;
grant execute on function upgrade_wedding_tier(uuid) to authenticated;
