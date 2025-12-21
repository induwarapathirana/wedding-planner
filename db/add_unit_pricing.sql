-- Migration: Add unit price and units to budget_items
alter table budget_items 
add column if not exists unit_price numeric default 0,
add column if not exists units integer default 1;

-- Add comment for documentation
comment on column budget_items.unit_price is 'Price per single unit of the item';
comment on column budget_items.units is 'Number of units for this budget item';
