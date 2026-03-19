-- Add city to clients for local insights
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city text;
