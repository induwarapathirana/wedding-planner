-- Update RPC to accept payment_id
-- Drop existing function first to change signature
drop function if exists upgrade_wedding_tier(uuid);

create or replace function upgrade_wedding_tier(
  wedding_id uuid,
  payment_id text default null  -- New parameter
)
returns json as $$
declare
  is_owner boolean;
begin
  -- Security check: Verify the caller is an owner of this wedding
  -- OR if the call is coming from a trusted service role (e.g. webhook)
  -- For now, we keep the owner check, but typically webhooks bypass this via service role
  -- Since this RPC is SECURITY DEFINER, we need to be careful.
  
  -- Ideally, webhooks should use a different method or we relax this check for admin calls.
  -- For this implementation, we assume the webhook uses the service role which can bypass RLS,
  -- but this function explicitly checks for 'owner' role in collaborators.
  -- This might be an issue for the webhook if it doesn't simulate a user.
  -- However, the webhook in route.ts calls this as: await supabase.rpc(...) using ADMIN client.
  -- The ADMIN client bypasses RLS, but does it bypass this explicit SQL check? NO.
  -- The `auth.uid()` will be null for admin client calls.
  
  -- MODIFICATION: Bypass owner check if payment_id is provided (assuming system call)
  -- OR check if auth.uid() is present.
  
  if auth.uid() is not null then
      select exists(
        select 1 from collaborators
        where collaborators.wedding_id = upgrade_wedding_tier.wedding_id
        and collaborators.user_id = auth.uid()
        and collaborators.role = 'owner'
      ) into is_owner;
    
      if not is_owner then
        return json_build_object('error', 'Unauthorized: Only wedding owners can upgrade the tier.');
      end if;
  end if;

  -- Perform the upgrade
  update weddings
  set 
    tier = 'premium',
    payment_id = upgrade_wedding_tier.payment_id,
    updated_at = now() -- Assuming updated_at exists or just updating tier
  where id = upgrade_wedding_tier.wedding_id;

  return json_build_object('success', true, 'message', 'Wedding upgraded to premium!');
end;
$$ language plpgsql security definer;

-- Grant access
revoke all on function upgrade_wedding_tier(uuid, text) from public;
grant execute on function upgrade_wedding_tier(uuid, text) to authenticated;
grant execute on function upgrade_wedding_tier(uuid, text) to service_role;
