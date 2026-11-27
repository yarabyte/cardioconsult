CREATE TYPE "public"."rpps_status" AS ENUM('pending_manual_review', 'verified', 'rejected');

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "rpps" text,
  ADD COLUMN IF NOT EXISTS "rpps_status" "rpps_status" DEFAULT 'pending_manual_review',
  ADD COLUMN IF NOT EXISTS "demo_data_enabled" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamptz;

CREATE TABLE IF NOT EXISTS "contractual_acceptances" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "document_type" text NOT NULL,
  "document_version" text NOT NULL,
  "accepted_at" timestamptz DEFAULT now() NOT NULL,
  "ip_truncated" text
);

CREATE TABLE IF NOT EXISTS "signup_rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamptz DEFAULT now() NOT NULL
);
