-- ENHANCE GUEST LIST FEATURES
-- 1. Add 'target_guest_count' to weddings table
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'weddings' and column_name = 'target_guest_count') then
        alter table weddings add column target_guest_count integer default 0;
    end if; 
end $$;

-- 2. Add 'priority' to guests table
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'guests' and column_name = 'priority') then
        alter table guests add column priority text default 'B';
        -- Add check constraint for valid values
        alter table guests add constraint guests_priority_check check (priority in ('A', 'B', 'C'));
    end if; 
end $$;
