CREATE TABLE IF NOT EXISTS "invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" "member_role" NOT NULL,
  "is_tenant_admin" boolean DEFAULT false NOT NULL,
  "token_hash" text NOT NULL,
  "invited_by_user_id" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_hash_uidx" ON "invitations" ("token_hash");

CREATE TABLE IF NOT EXISTS "role_permission_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "role" "member_role" NOT NULL,
  "permission" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_perm_override_uidx"
  ON "role_permission_overrides" ("tenant_id", "role", "permission");
