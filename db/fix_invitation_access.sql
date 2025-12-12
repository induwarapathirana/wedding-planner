-- 12. FIX INVITATION ACCESS (RPC)
-- This function allows retrieving invitation details securely by token, 
-- including specific public wedding details, bypassing standard RLS on the weddings table.

create or replace function get_invitation_by_token(lookup_token text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'id', i.id,
    'wedding_id', i.wedding_id,
    'email', i.email,
    'role', i.role,
    'token', i.token,
    'status', i.status,
    'created_at', i.created_at,
    'weddings', json_build_object(
      'couple_name_1', w.couple_name_1,
      'couple_name_2', w.couple_name_2,
      'wedding_date', w.wedding_date
    )
  ) into result
  from invitations i
  join weddings w on i.wedding_id = w.id
  where i.token = lookup_token
  limit 1;
  
  return result;
end;
$$ language plpgsql security definer;

-- Grant access to public (anon) and authenticated users
grant execute on function get_invitation_by_token(text) to public;
grant execute on function get_invitation_by_token(text) to authenticated;
grant execute on function get_invitation_by_token(text) to service_role;
