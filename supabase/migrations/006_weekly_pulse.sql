-- Add phone number to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone text;

-- Weekly pulse entries (one per client per week)
CREATE TABLE IF NOT EXISTS weekly_pulses (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start       date NOT NULL, -- Monday of that week
  leads_count      int,
  lead_source      text,
  marketing_activity text,
  blockers         text,
  summary          text,
  recommendation   text,
  status           text NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  UNIQUE (client_id, week_start)
);

-- SMS conversation state (tracks which step each client is on)
CREATE TABLE IF NOT EXISTS sms_conversations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  from_number  text NOT NULL, -- client's phone number for matching inbound
  current_step int NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'active', -- 'active' | 'completed'
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);

-- RLS
ALTER TABLE weekly_pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studio admins can manage weekly pulses for their clients"
  ON weekly_pulses FOR ALL
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN users u ON u.studio_id = c.studio_id
      WHERE u.id = auth.uid() AND u.role = 'studio_admin'
    )
  );

CREATE POLICY "Client users can read their own weekly pulses"
  ON weekly_pulses FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM users
      WHERE users.id = auth.uid() AND users.role = 'client_user'
    )
  );

CREATE POLICY "Studio admins can manage sms conversations for their clients"
  ON sms_conversations FOR ALL
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN users u ON u.studio_id = c.studio_id
      WHERE u.id = auth.uid() AND u.role = 'studio_admin'
    )
  );

GRANT ALL ON weekly_pulses, sms_conversations TO authenticated, service_role;
