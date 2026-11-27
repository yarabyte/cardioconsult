-- P10 — enrichissement examens + cycle de vie fichiers
ALTER TABLE "ecg_study" ADD COLUMN IF NOT EXISTS "fc_bpm" integer;
ALTER TABLE "ecg_study" ADD COLUMN IF NOT EXISTS "axis" text;
ALTER TABLE "ecg_study" ADD COLUMN IF NOT EXISTS "conductions" jsonb;
ALTER TABLE "ecg_study" ADD COLUMN IF NOT EXISTS "pacing" boolean DEFAULT false;
ALTER TABLE "ecg_study" ADD COLUMN IF NOT EXISTS "device" text;

ALTER TABLE "echo_study" ADD COLUMN IF NOT EXISTS "fevg_method" text;
ALTER TABLE "echo_study" ADD COLUMN IF NOT EXISTS "measures" jsonb;

ALTER TABLE "lab_result" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'mesure';
ALTER TABLE "lab_result" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "lab_result" ADD COLUMN IF NOT EXISTS "sampled_at" timestamptz;

ALTER TABLE "aortic_measurement" ADD COLUMN IF NOT EXISTS "not_visualized" boolean DEFAULT false NOT NULL;

ALTER TABLE "file_object" ADD COLUMN IF NOT EXISTS "lifecycle_status" text DEFAULT 'en_analyse' NOT NULL;
ALTER TABLE "file_object" ADD COLUMN IF NOT EXISTS "reject_reason" text;
