-- 9. INVENTORY
create type item_status as enum ('needed', 'purchased', 'rented', 'borrowed', 'packed');

create table inventory_items (
  id uuid default uuid_generate_v4() primary key,
  wedding_id uuid references weddings(id) on delete cascade not null,
  name text not null,
  category text, -- 'Decor', 'Stationery', etc.
  quantity integer default 1,
  unit_cost numeric default 0,
  status item_status default 'needed',
  link text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table inventory_items enable row level security;

create policy "Collaborators can view inventory"
  on inventory_items for select
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = inventory_items.wedding_id
      and collaborators.user_id = auth.uid()
    )
  );

create policy "Collaborators can insert inventory"
  on inventory_items for insert
  with check (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = inventory_items.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can update inventory"
  on inventory_items for update
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = inventory_items.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );

create policy "Collaborators can delete inventory"
  on inventory_items for delete
  using (
    exists (
      select 1 from collaborators
      where collaborators.wedding_id = inventory_items.wedding_id
      and collaborators.user_id = auth.uid()
      and collaborators.role in ('owner', 'editor')
    )
  );
