ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false;
