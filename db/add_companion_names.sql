-- Add companion_names array column to guests table
alter table guests 
add column if not exists companion_names text[];
