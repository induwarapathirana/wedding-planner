-- Function to get the effective tier for a wedding
-- Returns 'premium' if:
--   1. Trial is still active (premium_trial_ends_at > now)
--   2. OR tier is already set to 'premium' (paid)
-- Otherwise returns 'free'

create or replace function get_effective_tier(wedding_id_param uuid)
returns text as $$
declare
    current_tier text;
    trial_end timestamp with time zone;
begin
    -- Get wedding tier and trial end date
    select tier, premium_trial_ends_at
    into current_tier, trial_end
    from weddings
    where id = wedding_id_param;
    
    -- If already premium (paid), stay premium
    if current_tier = 'premium' then
        return 'premium';
    end if;
    
    -- If trial is still active, return premium
    if trial_end is not null and trial_end > now() then
        return 'premium';
    end if;
    
    -- Otherwise, return free
    return 'free';
end;
$$ language plpgsql security definer;
