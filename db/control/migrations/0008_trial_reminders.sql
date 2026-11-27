DO $$ BEGIN
  CREATE TYPE "trial_reminder_kind" AS ENUM ('d7', 'd1');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "trial_reminder_sends" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "kind" "trial_reminder_kind" NOT NULL,
  "sent_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "trial_reminder_sends_tenant_kind_uidx"
  ON "trial_reminder_sends" ("tenant_id", "kind");
