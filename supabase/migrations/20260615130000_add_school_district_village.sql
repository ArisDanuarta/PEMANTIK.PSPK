-- Add district and village to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS village TEXT;
