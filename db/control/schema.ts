import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", [
  "provisioning",
  "provisioning_failed",
  "active",
  "trial",
  "suspended",
  "past_due",
  "deleted",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", ["solo", "cabinet", "clinique"]);

export const memberRoleEnum = pgEnum("member_role", ["MEDECIN", "INFIRMIERE"]);

export const memberStatusEnum = pgEnum("member_status", ["active", "invited", "disabled"]);

export const rppsStatusEnum = pgEnum("rpps_status", [
  "pending_manual_review",
  "verified",
  "rejected",
]);

export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    plan: tenantPlanEnum("plan").notNull().default("solo"),
    status: tenantStatusEnum("status").notNull().default("provisioning"),
    dbName: text("db_name"),
    dbRole: text("db_role"),
    provisionStep: text("provision_step"),
    provisionError: text("provision_error"),
    retentionYears: integer("retention_years"),
    address: text("address"),
    rpps: text("rpps"),
    rppsStatus: rppsStatusEnum("rpps_status").default("pending_manual_review"),
    demoDataEnabled: boolean("demo_data_enabled").notNull().default(true),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    patientNotice: text("patient_notice"),
    /** Identité de facturation (cabinet) — jamais de données patient. */
    billingLegalName: text("billing_legal_name"),
    billingEmail: text("billing_email"),
    billingAddress: text("billing_address"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tenants_slug_uidx").on(t.slug)],
);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "canceled",
]);

/** Abonnement control-plane (Stripe customer / subscription IDs). */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    plan: tenantPlanEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    seats: integer("seats").notNull().default(2),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_tenant_uidx").on(t.tenantId)],
);

/** Idempotence des webhooks Stripe (et démo). */
export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("stripe"),
});

export const trialReminderKindEnum = pgEnum("trial_reminder_kind", ["d7", "d1"]);

/** Idempotence des e-mails de rappel de fin d’essai (J-7 / J-1). */
export const trialReminderSends = pgTable(
  "trial_reminder_sends",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kind: trialReminderKindEnum("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trial_reminder_sends_tenant_kind_uidx").on(t.tenantId, t.kind)],
);

export const billingInvoiceStatusEnum = pgEnum("billing_invoice_status", ["paid", "open", "void"]);

/** Factures control-plane (métadonnées uniquement, jamais patient). */
export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    amountHtCents: integer("amount_ht_cents").notNull(),
    vatRateBps: integer("vat_rate_bps").notNull().default(2000),
    status: billingInvoiceStatusEnum("status").notNull().default("open"),
    pdfUrl: text("pdf_url"),
    stripeInvoiceId: text("stripe_invoice_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("billing_invoices_tenant_number_uidx").on(t.tenantId, t.number)],
);

export const dataExports = pgTable(
  "data_exports",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    patientId: text("patient_id"),
    status: text("status").notNull().default("ready"),
    downloadTokenHash: text("download_token_hash").notNull(),
    contentSha256: text("content_sha256").notNull(),
    storageKey: text("storage_key"),
    ciphertext: text("ciphertext"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    purgedAt: timestamp("purged_at", { withTimezone: true }),
    createdBy: text("created_by"),
  },
  (t) => [uniqueIndex("data_exports_token_uidx").on(t.downloadTokenHash)],
);

export const breachIncidents = pgTable("breach_incidents", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
  declaredBy: text("declared_by").notNull(),
  description: text("description").notNull(),
  qualification: text("qualification").notNull().default("a_qualifier"),
  actions: text("actions").notNull().default(""),
  notifyCnilIntent: boolean("notify_cnil_intent").notNull().default(false),
});

export const tenantWipeRequests = pgTable("tenant_wipe_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  adminApprovedAt: timestamp("admin_approved_at", { withTimezone: true }),
  adminActorId: text("admin_actor_id"),
  platformApprovedAt: timestamp("platform_approved_at", { withTimezone: true }),
  platformActorId: text("platform_actor_id"),
  graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  certificateJson: jsonb("certificate_json").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const identityAddenda = pgTable(
  "identity_addenda",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    version: integer("version").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    authorId: text("author_id").notNull(),
    reason: text("reason").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    uniqueIndex("identity_addenda_patient_version_uidx").on(t.tenantId, t.patientId, t.version),
  ],
);

export const platformRoleEnum = pgEnum("platform_role", [
  "PLATFORM_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_BILLING",
]);

export const supportSessionStatusEnum = pgEnum("support_session_status", [
  "requested",
  "active",
  "revoked",
  "expired",
  "denied",
]);

/** Comptes équipe plateforme (auth distincte, passkey). */
export const platformActors = pgTable(
  "platform_actors",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: platformRoleEnum("role").notNull(),
    passkeyEnrolled: boolean("passkey_enrolled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("platform_actors_email_uidx").on(t.email)],
);

/** Sessions support consenties — TTL 60 min, lecture seule, rôle PG éphémère. */
export const supportSessions = pgTable("support_sessions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  platformActorId: text("platform_actor_id").notNull(),
  reason: text("reason").notNull(),
  status: supportSessionStatusEnum("status").notNull().default("requested"),
  readOnly: boolean("read_only").notNull().default(true),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  consentedByMemberId: text("consented_by_member_id"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ephemeralRoRole: text("ephemeral_ro_role"),
  accessTokenHash: text("access_token_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Acceptations CGU / contrat art. 28 versionnées et horodatées. */
export const contractualAcceptances = pgTable("contractual_acceptances", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  documentType: text("document_type").notNull(), // cgu | dpa_art28
  documentVersion: text("document_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  ipTruncated: text("ip_truncated"),
});

/** Mot de passe du rôle PG tenant — chiffré avec la KEK (jamais en clair). */
export const tenantDbSecrets = pgTable("tenant_db_secrets", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  passwordEnc: text("password_enc").notNull(),
  host: text("host").notNull().default("127.0.0.1"),
  port: integer("port").notNull().default(5432),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantDeks = pgTable("tenant_deks", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  wrappedDek: text("wrapped_dek").notNull(),
  kekVersion: text("kek_version").notNull(),
  algorithm: text("algorithm").notNull().default("aes-256-gcm"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
});

/** Utilisateurs plateforme (socle P02 ; Better Auth complétera en P03). */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uidx").on(t.email)],
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    isTenantAdmin: boolean("is_tenant_admin").notNull().default(false),
    status: memberStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_user_tenant_uidx").on(t.userId, t.tenantId)],
);

export const platformAuditEvents = pgTable("platform_audit_events", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  outcome: text("outcome").notNull().default("success"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  requestId: text("request_id"),
});

/** Invitations équipe — jeton haché, 72 h, usage unique. */
export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull(),
    isTenantAdmin: boolean("is_tenant_admin").notNull().default(false),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: text("invited_by_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invitations_token_hash_uidx").on(t.tokenHash)],
);

/** Surcharges de permissions par tenant / rôle (infirmière uniquement aujourd'hui). */
export const rolePermissionOverrides = pgTable(
  "role_permission_overrides",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by"),
  },
  (t) => [uniqueIndex("role_perm_override_uidx").on(t.tenantId, t.role, t.permission)],
);
