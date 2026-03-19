-- Add secure token for email-based check-in (no login required)
ALTER TABLE weekly_pulses ADD COLUMN IF NOT EXISTS check_in_token uuid DEFAULT uuid_generate_v4();
ALTER TABLE weekly_pulses ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS weekly_pulses_check_in_token_idx ON weekly_pulses (check_in_token);
