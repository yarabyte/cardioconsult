import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { blindIndex, encryptedText } from "@/server/crypto/drizzle-types";

export const sexEnum = pgEnum("sex", ["F", "H", "Autre", "NonRenseigne"]);
export const documentStatusEnum = pgEnum("document_status", [
  "brouillon",
  "valide",
  "signe",
  "annule",
  "remplace",
]);
export const documentKindEnum = pgEnum("document_kind", [
  "compte_rendu",
  "ordonnance",
  "courrier",
  "autre",
]);

const auditCols = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
  version: integer("version").notNull().default(1),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
};

export const patients = pgTable("patient", {
  id: text("id").primaryKey(),
  dossierNumber: text("dossier_number"),
  archiveReason: text("archive_reason"),
  ...auditCols,
});

export const tenantCounters = pgTable("tenant_counter", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const patientIdentityEnc = pgTable(
  "patient_identity_enc",
  {
    patientId: text("patient_id")
      .primaryKey()
      .references(() => patients.id, { onDelete: "cascade" }),
    firstNameEnc: encryptedText("first_name_enc"),
    lastNameEnc: encryptedText("last_name_enc"),
    birthNameEnc: encryptedText("birth_name_enc"),
    birthDateEnc: encryptedText("birth_date_enc"),
    sex: sexEnum("sex"),
    emailEnc: encryptedText("email_enc"),
    phoneEnc: encryptedText("phone_enc"),
    addressLineEnc: encryptedText("address_line_enc"),
    postalCodeEnc: encryptedText("postal_code_enc"),
    cityEnc: encryptedText("city_enc"),
    treatingPhysicianEnc: encryptedText("treating_physician_enc"),
    insEnc: encryptedText("ins_enc"),
    insStatus: text("ins_status").notNull().default("non_qualifiee"),
    dossierNumber: text("dossier_number"),
    lastNameBlind: blindIndex("last_name_blind"),
    firstNameBlind: blindIndex("first_name_blind"),
    birthDateBlind: blindIndex("birth_date_blind"),
    ...auditCols,
  },
  (t) => [
    uniqueIndex("patient_identity_last_first_blind_uidx").on(t.lastNameBlind, t.firstNameBlind),
  ],
);

export const patientAllergies = pgTable("patient_allergy", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  substance: text("substance").notNull(),
  reaction: text("reaction"),
  severity: text("severity").notNull().default("non_renseignee"),
  source: text("source"),
  ...auditCols,
});

export const patientDevices = pgTable("patient_device", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  label: text("label"),
  implantedAt: text("implanted_at"),
  ...auditCols,
});

export const stays = pgTable("stay", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  admittedAt: timestamp("admitted_at", { withTimezone: true }).notNull(),
  dischargedAt: timestamp("discharged_at", { withTimezone: true }),
  bedLabel: text("bed_label"),
  motifEnc: encryptedText("motif_enc"),
  status: text("status").notNull().default("en_cours"),
  ...auditCols,
});

export const encounters = pgTable("encounter", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  stayId: text("stay_id").references(() => stays.id),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  motifEnc: encryptedText("motif_enc"),
  type: text("type"),
  status: text("status").notNull().default("a_venir"),
  authorId: text("author_id"),
  historySummaryEnc: encryptedText("history_summary_enc"),
  antecedentsTextEnc: encryptedText("antecedents_text_enc"),
  treatmentsTextEnc: encryptedText("treatments_text_enc"),
  ...auditCols,
});

export const vitals = pgTable(
  "vitals",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    encounterId: text("encounter_id").references(() => encounters.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    authorId: text("author_id"),
    tasMmHg: integer("tas_mm_hg"),
    tadMmHg: integer("tad_mm_hg"),
    fcBpm: integer("fc_bpm"),
    spo2Pct: integer("spo2_pct"),
    temperatureC: numeric("temperature_c", { precision: 4, scale: 1 }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
    heightM: numeric("height_m", { precision: 3, scale: 2 }),
    ...auditCols,
  },
  (t) => [
    check(
      "vitals_tas_range",
      sql`${t.tasMmHg} is null or (${t.tasMmHg} >= 40 and ${t.tasMmHg} <= 300)`,
    ),
    check(
      "vitals_spo2_range",
      sql`${t.spo2Pct} is null or (${t.spo2Pct} >= 50 and ${t.spo2Pct} <= 100)`,
    ),
  ],
);

export const labResults = pgTable("lab_result", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  code: text("code").notNull(),
  valueNumeric: numeric("value_numeric"),
  valueText: text("value_text"),
  unit: text("unit"),
  commentEnc: encryptedText("comment_enc"),
  ...auditCols,
});

export const ecgStudies = pgTable("ecg_study", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  rythme: text("rythme"),
  prMs: integer("pr_ms"),
  qrsMs: integer("qrs_ms"),
  qtcMs: integer("qtc_ms"),
  formula: text("formula"),
  interpretationEnc: encryptedText("interpretation_enc"),
  ...auditCols,
});

export const echoStudies = pgTable("echo_study", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  fevgPct: integer("fevg_pct"),
  conclusionEnc: encryptedText("conclusion_enc"),
  quality: text("quality"),
  ...auditCols,
});

export const aorticMeasurements = pgTable("aortic_measurement", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  echoStudyId: text("echo_study_id").references(() => echoStudies.id),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  segment: text("segment").notNull(),
  diameterMm: numeric("diameter_mm", { precision: 5, scale: 1 }),
  method: text("method"),
  quality: text("quality"),
  ...auditCols,
});

export const clinicalScores = pgTable("clinical_score", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  kind: text("kind").notNull(),
  datedAt: timestamp("dated_at", { withTimezone: true }).notNull(),
  inputs: jsonb("inputs").$type<Record<string, unknown>>(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  ruleId: text("rule_id"),
  ruleVersion: text("rule_version"),
  ...auditCols,
});

export const clinicalAlerts = pgTable("clinical_alert", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  level: text("level").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  ruleId: text("rule_id").notNull(),
  ruleVersion: text("rule_version").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by"),
  ...auditCols,
});

export const documents = pgTable("document", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  kind: documentKindEnum("kind").notNull(),
  title: text("title").notNull(),
  status: documentStatusEnum("status").notNull().default("brouillon"),
  docVersion: integer("doc_version").notNull().default(1),
  contentEnc: encryptedText("content_enc"),
  sourceSnapshot: jsonb("source_snapshot").$type<Record<string, unknown>>(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signedBy: text("signed_by"),
  ...auditCols,
});

export const documentVersions = pgTable("document_version", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  status: documentStatusEnum("status").notNull(),
  contentEnc: encryptedText("content_enc"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by"),
});

export const prescriptions = pgTable("prescription", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  status: documentStatusEnum("status").notNull().default("brouillon"),
  allergiesCheckedAt: timestamp("allergies_checked_at", { withTimezone: true }),
  dfgCheckedAt: timestamp("dfg_checked_at", { withTimezone: true }),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  validatedBy: text("validated_by"),
  ...auditCols,
});

export const prescriptionLines = pgTable("prescription_line", {
  id: text("id").primaryKey(),
  prescriptionId: text("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  drugEnc: encryptedText("drug_enc"),
  dci: text("dci"),
  posologyEnc: encryptedText("posology_enc"),
  duration: text("duration"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...auditCols,
});

export const appointmentKinds = pgTable("appointment_kind", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  durationMin: integer("duration_min").notNull().default(20),
  color: text("color").notNull().default("#0B4FB3"),
  executorRole: text("executor_role").notNull().default("MEDECIN"),
});

export const appointments = pgTable("appointment", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").references(() => patients.id),
  physicianId: text("physician_id"),
  kindId: text("kind_id"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  motifEnc: encryptedText("motif_enc"),
  status: text("status"),
  waitlist: boolean("waitlist").notNull().default(false),
  adminBlock: boolean("admin_block").notNull().default(false),
  prepVitals: boolean("prep_vitals").notNull().default(false),
  prepEcg: boolean("prep_ecg").notNull().default(false),
  prepWeight: boolean("prep_weight").notNull().default(false),
  transmissionEnc: encryptedText("transmission_enc"),
  ...auditCols,
});

export const nursingNotes = pgTable("nursing_note", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  stayId: text("stay_id").references(() => stays.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  authorId: text("author_id"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  bodyEnc: encryptedText("body_enc"),
  ...auditCols,
});

export const fileObjects = pgTable("file_object", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  encounterId: text("encounter_id").references(() => encounters.id),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  virusScanStatus: text("virus_scan_status").notNull().default("pending"),
  lifecycleStatus: text("lifecycle_status").notNull().default("en_analyse"),
  rejectReason: text("reject_reason"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  originalNameSanitized: text("original_name_sanitized").notNull(),
  ...auditCols,
});

export const settings = pgTable("setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const featureFlags = pgTable("feature_flag", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

/** Append-only : droits SQL + trigger (voir migration SQL). */
export const auditEvents = pgTable("audit_event", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actorId: text("actor_id"),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  outcome: text("outcome").notNull().default("success"),
  ipTruncated: text("ip_truncated"),
  userAgentHash: text("user_agent_hash"),
  requestId: text("request_id"),
  prevHash: text("prev_hash"),
  hash: text("hash").notNull(),
});

/** Outbox lectures (patient.open, etc.) — flush → audit_event. */
export const auditOutbox = pgTable("audit_outbox", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
