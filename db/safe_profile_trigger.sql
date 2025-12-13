-- SAFE PROFILE TRIGGER
-- Updates the handle_new_user function to be robust against missing metadata.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Coalesce to ensure we don't crash on nulls if columns are strict
    coalesce(new.raw_user_meta_data->>'full_name', new.email), 
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- IMPORTANT: Log error but DO NOT block auth.user creation
    -- If this fails, the user can still login, just won't have a profile yet (fixed lazily later)
    raise warning 'Profile creation failed for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;
