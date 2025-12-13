-- RPC function to upgrade wedding tier (SECURITY DEFINER to bypass RLS)
create or replace function upgrade_wedding_tier(wedding_id uuid)
returns void as $$
begin
  update weddings
  set tier = 'premium'
  where id = wedding_id;
end;
$$ language plpgsql security definer;
