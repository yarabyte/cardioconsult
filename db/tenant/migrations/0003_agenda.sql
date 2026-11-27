ALTER TABLE "appointment"
  ADD COLUMN IF NOT EXISTS "physician_id" text,
  ADD COLUMN IF NOT EXISTS "kind_id" text,
  ADD COLUMN IF NOT EXISTS "waitlist" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "admin_block" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "prep_vitals" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "prep_ecg" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "prep_weight" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "transmission_enc" text;

CREATE TABLE IF NOT EXISTS "appointment_kind" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "duration_min" integer NOT NULL DEFAULT 20,
  "color" text NOT NULL DEFAULT '#0B4FB3',
  "executor_role" text NOT NULL DEFAULT 'MEDECIN'
);
