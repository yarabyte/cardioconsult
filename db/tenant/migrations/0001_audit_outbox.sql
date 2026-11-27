CREATE TABLE IF NOT EXISTS "audit_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "audit_outbox_pending_idx"
  ON "audit_outbox" ("created_at")
  WHERE "processed_at" IS NULL;
