ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "patient_notice" text;

CREATE TABLE IF NOT EXISTS "data_exports" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "scope" text NOT NULL,
  "patient_id" text,
  "status" text NOT NULL DEFAULT 'ready',
  "download_token_hash" text NOT NULL,
  "content_sha256" text NOT NULL,
  "storage_key" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "purged_at" timestamptz,
  "created_by" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "data_exports_token_uidx" ON "data_exports" ("download_token_hash");

CREATE TABLE IF NOT EXISTS "breach_incidents" (
  "id" text PRIMARY KEY NOT NULL,
  "scope" text NOT NULL,
  "tenant_id" text REFERENCES "tenants"("id") ON DELETE SET NULL,
  "declared_at" timestamptz DEFAULT now() NOT NULL,
  "declared_by" text NOT NULL,
  "description" text NOT NULL,
  "qualification" text NOT NULL DEFAULT 'a_qualifier',
  "actions" text NOT NULL DEFAULT '',
  "notify_cnil_intent" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenant_wipe_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "admin_approved_at" timestamptz,
  "admin_actor_id" text,
  "platform_approved_at" timestamptz,
  "platform_actor_id" text,
  "grace_ends_at" timestamptz,
  "status" text NOT NULL DEFAULT 'pending',
  "certificate_json" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
