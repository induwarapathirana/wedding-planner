-- ============================================
-- TESTING PHASE LIMITATIONS
-- Remove these triggers before production!
-- ============================================

-- Limit 1: Maximum 20 weddings globally
-- Limit 2: Maximum 1 wedding per user

create or replace function check_wedding_limits()
returns trigger as $$
declare
  global_count integer;
  user_count integer;
  max_global integer := 20;  -- Global limit
  max_per_user integer := 1; -- Per-user limit
begin
  -- Check 1: Per-user limit
  select count(*) into user_count 
  from weddings 
  where created_by = new.created_by;
  
  if user_count >= max_per_user then
    raise exception 'LIMIT_PER_USER: You can only create % wedding with current package. Please contact support via 077 302 7782 if you need more.', max_per_user
      using errcode = 'P0001';
  end if;

  -- Check 2: Global limit
  select count(*) into global_count from weddings;
  
  if global_count >= max_global then
    raise exception 'LIMIT_GLOBAL: We have reached promotional offering limit. Please try again later or contact support via 077 302 7782.', max_global
      using errcode = 'P0002';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create/replace trigger
drop trigger if exists enforce_wedding_limit on weddings;
drop trigger if exists enforce_wedding_limits on weddings;

create trigger enforce_wedding_limits
  before insert on weddings
  for each row
  execute function check_wedding_limits();

-- ============================================
-- TO REMOVE LIMITS FOR PRODUCTION:
-- Run this in Supabase SQL Editor:
--
-- drop trigger if exists enforce_wedding_limits on weddings;
-- drop function if exists check_wedding_limits();
-- ============================================

