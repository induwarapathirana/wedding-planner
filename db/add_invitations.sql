-- 10. INVITATIONS
create table invitations (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  email text not null,
  token text not null unique,
  role wedding_role default 'editor',
  status text default 'pending', -- 'pending', 'accepted'
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '7 days') not null
);

-- RLS POLICIES
alter table invitations enable row level security;

-- Collaborators can see invitations for their wedding
create policy "Collaborators can view invitations"
  on invitations for select
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = invitations.wedding_id
      and collaborators.user_id = auth.uid()
    )
  );

-- Anyone can read an invitation if they have the token (for the landing page)
create policy "Anyone can view invite by token"
  on invitations for select
  using ( true ); -- We rely on the token uniqueness/secrecy as the security mechanism for 'reading' the public info

create policy "Collaborators can create invitations"
  on invitations for insert
  with check (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = invitations.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can delete invitations"
  on invitations for delete
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = invitations.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );
