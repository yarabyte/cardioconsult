ALTER TABLE "patient"
  ADD COLUMN IF NOT EXISTS "dossier_number" text,
  ADD COLUMN IF NOT EXISTS "archive_reason" text;

CREATE TABLE IF NOT EXISTS "tenant_counter" (
  "key" text PRIMARY KEY NOT NULL,
  "value" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "patient_identity_enc"
  ADD COLUMN IF NOT EXISTS "treating_physician_enc" text,
  ADD COLUMN IF NOT EXISTS "dossier_number" text,
  ADD COLUMN IF NOT EXISTS "birth_date_blind" text;

CREATE TABLE IF NOT EXISTS "patient_allergy" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id") ON DELETE CASCADE,
  "substance" text NOT NULL,
  "reaction" text,
  "severity" text DEFAULT 'non_renseignee' NOT NULL,
  "source" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "patient_device" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "label" text,
  "implanted_at" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);
