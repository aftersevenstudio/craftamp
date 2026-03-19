-- Add richer profile fields to clients for better report targeting
ALTER TABLE clients ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_goal text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_audience text;
