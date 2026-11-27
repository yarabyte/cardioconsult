CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'provisioning_failed', 'active', 'trial', 'suspended', 'past_due', 'deleted');
CREATE TYPE "public"."tenant_plan" AS ENUM('solo', 'cabinet', 'clinique');
CREATE TYPE "public"."member_role" AS ENUM('MEDECIN', 'INFIRMIERE');
CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'disabled');

CREATE TABLE "tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "plan" "tenant_plan" DEFAULT 'solo' NOT NULL,
  "status" "tenant_status" DEFAULT 'provisioning' NOT NULL,
  "db_name" text,
  "db_role" text,
  "provision_step" text,
  "provision_error" text,
  "retention_years" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "tenants_slug_uidx" ON "tenants" ("slug");

CREATE TABLE "tenant_db_secrets" (
  "tenant_id" text PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "password_enc" text NOT NULL,
  "host" text DEFAULT '127.0.0.1' NOT NULL,
  "port" integer DEFAULT 5432 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "tenant_deks" (
  "tenant_id" text PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "wrapped_dek" text NOT NULL,
  "kek_version" text NOT NULL,
  "algorithm" text DEFAULT 'aes-256-gcm' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "rotated_at" timestamptz
);

CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "users_email_uidx" ON "users" ("email");

CREATE TABLE "members" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "role" "member_role" NOT NULL,
  "is_tenant_admin" boolean DEFAULT false NOT NULL,
  "status" "member_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "members_user_tenant_uidx" ON "members" ("user_id", "tenant_id");

CREATE TABLE "platform_audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "at" timestamptz DEFAULT now() NOT NULL,
  "actor_id" text,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "outcome" text DEFAULT 'success' NOT NULL,
  "meta" jsonb,
  "request_id" text
);
