DO $$ BEGIN
  CREATE TYPE "billing_invoice_status" AS ENUM ('paid', 'open', 'void');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "billing_invoices" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "number" text NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "amount_ht_cents" integer NOT NULL,
  "vat_rate_bps" integer DEFAULT 2000 NOT NULL,
  "status" "billing_invoice_status" DEFAULT 'open' NOT NULL,
  "pdf_url" text,
  "stripe_invoice_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_invoices_tenant_number_uidx" ON "billing_invoices" ("tenant_id", "number");

ALTER TABLE "data_exports" ADD COLUMN IF NOT EXISTS "ciphertext" text;

ALTER TABLE "support_sessions" ADD COLUMN IF NOT EXISTS "access_token_hash" text;

CREATE TABLE IF NOT EXISTS "identity_addenda" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "patient_id" text NOT NULL,
  "version" integer NOT NULL,
  "at" timestamptz DEFAULT now() NOT NULL,
  "author_id" text NOT NULL,
  "reason" text NOT NULL,
  "snapshot_json" jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "identity_addenda_patient_version_uidx" ON "identity_addenda" ("tenant_id", "patient_id", "version");