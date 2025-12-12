-- 7. VENDORS
create type vendor_status as enum ('researching', 'contacted', 'hired', 'declined');

create table vendors (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  category text not null, -- 'Venue', 'Photographer', etc.
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  status vendor_status default 'researching',
  price_estimate numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ITINERARY EVENTS
create table events (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  location text,
  description text,
  category text, -- 'Ceremony', 'Reception', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table vendors enable row level security;
alter table events enable row level security;

-- Vendors Policies
create policy "Collaborators can view vendors"
  on vendors for select
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = vendors.wedding_id
      and collaborators.user_id = auth.uid()
    )
  );

create policy "Collaborators can insert vendors"
  on vendors for insert
  with check (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = vendors.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can update vendors"
  on vendors for update
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = vendors.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can delete vendors"
  on vendors for delete
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = vendors.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

-- Events Policies (Itinerary)
create policy "Collaborators can view events"
  on events for select
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = events.wedding_id
      and collaborators.user_id = auth.uid()
    )
  );

create policy "Collaborators can insert events"
  on events for insert
  with check (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = events.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can update events"
  on events for update
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = events.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can delete events"
  on events for delete
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = events.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );
