-- Add 'tier' column to weddings table with default 'free'
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'weddings' and column_name = 'tier') then
        alter table weddings add column tier text default 'free';
    end if;
end $$;
