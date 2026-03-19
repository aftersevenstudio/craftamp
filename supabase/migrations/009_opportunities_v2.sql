-- Extend opportunities to support auto-generated opportunities from reports and pulse check-ins
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Index for filtering by source (used when replacing auto-generated opportunities)
CREATE INDEX IF NOT EXISTS opportunities_client_source_idx ON opportunities (client_id, source);
