DO $$ BEGIN
  CREATE TYPE "support_session_status" AS ENUM ('requested', 'active', 'revoked', 'expired', 'denied');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "platform_role" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_BILLING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "platform_actors" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "platform_role" NOT NULL,
  "passkey_enrolled" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_actors_email_uidx" ON "platform_actors" ("email");

CREATE TABLE IF NOT EXISTS "support_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "platform_actor_id" text NOT NULL,
  "reason" text NOT NULL,
  "status" "support_session_status" DEFAULT 'requested' NOT NULL,
  "read_only" boolean DEFAULT true NOT NULL,
  "requested_at" timestamptz DEFAULT now() NOT NULL,
  "consented_at" timestamptz,
  "consented_by_member_id" text,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "revoked_at" timestamptz,
  "ephemeral_ro_role" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_sessions_tenant_idx" ON "support_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "support_sessions_status_idx" ON "support_sessions" ("status");
