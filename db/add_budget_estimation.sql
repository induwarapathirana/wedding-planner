-- ADD ESTIMATED BUDGET
-- Add 'estimated_budget' to weddings table
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'weddings' and column_name = 'estimated_budget') then
        alter table weddings add column estimated_budget numeric default 0;
    end if; 
end $$;
