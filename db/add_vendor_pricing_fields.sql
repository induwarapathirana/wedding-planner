-- Add flexible pricing fields to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS pricing_type TEXT,
ADD COLUMN IF NOT EXISTS pricing_unit TEXT;

-- Add flexible pricing fields to vendor_directory table
ALTER TABLE vendor_directory
ADD COLUMN IF NOT EXISTS pricing_type TEXT,
ADD COLUMN IF NOT EXISTS pricing_unit TEXT;

COMMENT ON COLUMN vendors.pricing_type IS 'Type of pricing model: flat_rate, per_person, hourly, per_item, package, tbd';
COMMENT ON COLUMN vendors.pricing_unit IS 'Optional custom unit description (e.g., per guest, per hour, per bouquet)';
COMMENT ON COLUMN vendor_directory.pricing_type IS 'Type of pricing model: flat_rate, per_person, hourly, per_item, package, tbd';
COMMENT ON COLUMN vendor_directory.pricing_unit IS 'Optional custom unit description (e.g., per guest, per hour, per bouquet)';
