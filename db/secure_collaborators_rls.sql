-- 12. SECURE COLLABORATORS (RLS)
-- Enables Row Level Security and defines policies for viewing and removing team members.

alter table collaborators enable row level security;

-- 1. View Policy: Users can see collaborators if they are a member of that wedding
create policy "Users can view team members"
on collaborators for select
using (
  exists (
    select 1 from collaborators me
    where me.wedding_id = collaborators.wedding_id
    and me.user_id = auth.uid()
  )
);

-- 2. Delete Policy: Only Owners can remove collaborators
create policy "Owners can remove team members"
on collaborators for delete
using (
  exists (
    select 1 from collaborators me
    where me.wedding_id = collaborators.wedding_id
    and me.user_id = auth.uid()
    and me.role = 'owner'
  )
);

-- Note: We generally don't allow open INSERT via client for collaborators (RPC handles acceptance).
-- But if invites created by owners need to auto-insert, we might keep it restricted or rely on the RPC.
-- Usage of 'accept_invitation' RPC bypasses RLS with security definer, so INSERT policy is not strictly needed for that flow.
-- However, creating the *wedding* initially inserts the owner.
create policy "Users can insert themselves as owner"
on collaborators for insert
with check (
  auth.uid() = user_id -- Can only add self
  -- We assume backend/trigger guarantees role integrity or initial creation logic
);
