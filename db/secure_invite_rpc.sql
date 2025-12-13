-- 13. SECURE INVITATION ACCEPTANCE (RPC)
-- This function handles the complex logic of accepting an invitation:
-- 1. Checks if the invitation exists and is pending.
-- 2. Verifies that the currently logged-in user's email matches the invitation email.
-- 3. Adds the user to the collaborators table.
-- 4. Marks the invitation as 'accepted'.
-- 5. Returns the wedding_id for redirection.

create or replace function accept_invitation(lookup_token text)
returns json as $$
declare
  invite_record record;
  current_user_email text;
  new_wedding_id uuid;
begin
  -- 1. Get the invitation
  select * into invite_record
  from invitations
  where token = lookup_token
  and status = 'pending';

  if invite_record is null then
    return json_build_object('error', 'Invalid or expired invitation.');
  end if;

  -- 2. Get current user's email
  current_user_email := auth.email();

  if current_user_email is null then
    return json_build_object('error', 'You must be logged in to accept an invitation.');
  end if;

  -- 3. STRICT EMAIL CHECK
  -- We normalize to lowercase for comparison to avoid case-sensitivity issues
  if lower(trim(current_user_email)) <> lower(trim(invite_record.email)) then
    return json_build_object('error', 'This invitation was sent to ' || invite_record.email || ', but you are logged in as ' || current_user_email || '. Please log in with the correct account.');
  end if;

  -- 4. Check if already a collaborator (idempotency)
  if exists (
    select 1 from collaborators 
    where wedding_id = invite_record.wedding_id 
    and user_id = auth.uid()
  ) then
     -- Already added, just mark accepted if not already
     update invitations set status = 'accepted' where id = invite_record.id;
     return json_build_object('success', true, 'wedding_id', invite_record.wedding_id);
  end if;

  -- 5. CHECK LIMITS (New: Enforce 5 Collaborators for Free Tier)
  declare
    current_count integer;
    wedding_tier text;
    limit_count integer;
  begin
    -- Get current count and tier
    select count(*) into current_count from collaborators where wedding_id = invite_record.wedding_id;
    select tier into wedding_tier from weddings where id = invite_record.wedding_id;
    
    -- Define Limit (5 for Free, Infinity/Null for Premium)
    if wedding_tier = 'free' then
        limit_count := 5;
    else
        limit_count := 9999; -- Premium
    end if;

    if current_count >= limit_count then
        raise exception 'Collaborator limit reached for this plan. Please upgrade to add more team members.';
    end if;
  end;

  -- 6. Add to collaborators
  insert into collaborators (wedding_id, user_id, role)
  values (invite_record.wedding_id, auth.uid(), invite_record.role)
  returning wedding_id into new_wedding_id;

  -- 7. Update invitation status
  update invitations 
  set status = 'accepted' 
  where id = invite_record.id;

  return json_build_object('success', true, 'wedding_id', new_wedding_id);
end;
$$ language plpgsql security definer;
-- Security Definer allows this function to bypass RLS on collaborators/invitations tables
-- to perform the necessary updates, while we manually enforce the checks above.

grant execute on function accept_invitation(text) to authenticated;
