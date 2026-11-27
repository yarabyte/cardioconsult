ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billing_legal_name" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billing_email" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billing_address" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "plan" "tenant_plan" NOT NULL,
  "status" "subscription_status" DEFAULT 'trialing' NOT NULL,
  "seats" integer DEFAULT 2 NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamptz,
  "trial_ends_at" timestamptz,
  "grace_ends_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_uidx" ON "subscriptions" ("tenant_id");

CREATE TABLE IF NOT EXISTS "processed_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamptz DEFAULT now() NOT NULL,
  "source" text DEFAULT 'stripe' NOT NULL
);
