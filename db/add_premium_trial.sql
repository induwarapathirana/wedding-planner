-- Add premium trial tracking to weddings table
-- All new weddings get 2 weeks of premium access

do $$
begin
    -- Add premium_trial_ends_at column if it doesn't exist
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'weddings' 
        and column_name = 'premium_trial_ends_at'
    ) then
        alter table weddings 
        add column premium_trial_ends_at timestamp with time zone;
        
        -- Backfill existing weddings with trial ending 2 weeks from creation
        -- (They get the trial retroactively as a bonus)
        update weddings 
        set premium_trial_ends_at = created_at + interval '14 days'
        where premium_trial_ends_at is null;
    end if;
end $$;
