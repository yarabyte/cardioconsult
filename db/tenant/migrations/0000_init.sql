CREATE TYPE "public"."sex" AS ENUM('F', 'H', 'Autre', 'NonRenseigne');
CREATE TYPE "public"."document_status" AS ENUM('brouillon', 'valide', 'signe', 'annule', 'remplace');
CREATE TYPE "public"."document_kind" AS ENUM('compte_rendu', 'ordonnance', 'courrier', 'autre');

CREATE TABLE "patient" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "patient_identity_enc" (
  "patient_id" text PRIMARY KEY NOT NULL REFERENCES "patient"("id") ON DELETE CASCADE,
  "first_name_enc" text,
  "last_name_enc" text,
  "birth_name_enc" text,
  "birth_date_enc" text,
  "sex" "sex",
  "email_enc" text,
  "phone_enc" text,
  "address_line_enc" text,
  "postal_code_enc" text,
  "city_enc" text,
  "ins_enc" text,
  "ins_status" text DEFAULT 'non_qualifiee' NOT NULL,
  "last_name_blind" text,
  "first_name_blind" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);
CREATE UNIQUE INDEX "patient_identity_last_first_blind_uidx" ON "patient_identity_enc" ("last_name_blind", "first_name_blind");

CREATE TABLE "stay" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "admitted_at" timestamptz NOT NULL,
  "discharged_at" timestamptz,
  "bed_label" text,
  "motif_enc" text,
  "status" text DEFAULT 'en_cours' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "encounter" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "stay_id" text REFERENCES "stay"("id"),
  "dated_at" timestamptz NOT NULL,
  "motif_enc" text,
  "type" text,
  "status" text DEFAULT 'a_venir' NOT NULL,
  "author_id" text,
  "history_summary_enc" text,
  "antecedents_text_enc" text,
  "treatments_text_enc" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "vitals" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "recorded_at" timestamptz NOT NULL,
  "author_id" text,
  "tas_mm_hg" integer,
  "tad_mm_hg" integer,
  "fc_bpm" integer,
  "spo2_pct" integer,
  "temperature_c" numeric(4, 1),
  "weight_kg" numeric(5, 1),
  "height_m" numeric(3, 2),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  CONSTRAINT "vitals_tas_range" CHECK ("tas_mm_hg" is null or ("tas_mm_hg" >= 40 and "tas_mm_hg" <= 300)),
  CONSTRAINT "vitals_spo2_range" CHECK ("spo2_pct" is null or ("spo2_pct" >= 50 and "spo2_pct" <= 100))
);

CREATE TABLE "lab_result" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "dated_at" timestamptz NOT NULL,
  "code" text NOT NULL,
  "value_numeric" numeric,
  "value_text" text,
  "unit" text,
  "comment_enc" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "ecg_study" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "dated_at" timestamptz NOT NULL,
  "rythme" text,
  "pr_ms" integer,
  "qrs_ms" integer,
  "qtc_ms" integer,
  "formula" text,
  "interpretation_enc" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "echo_study" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "dated_at" timestamptz NOT NULL,
  "fevg_pct" integer,
  "conclusion_enc" text,
  "quality" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "aortic_measurement" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "echo_study_id" text REFERENCES "echo_study"("id"),
  "dated_at" timestamptz NOT NULL,
  "segment" text NOT NULL,
  "diameter_mm" numeric(5, 1),
  "method" text,
  "quality" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "clinical_score" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "kind" text NOT NULL,
  "dated_at" timestamptz NOT NULL,
  "inputs" jsonb,
  "result" jsonb NOT NULL,
  "rule_id" text,
  "rule_version" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "clinical_alert" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "level" text NOT NULL,
  "title" text NOT NULL,
  "message" text,
  "rule_id" text NOT NULL,
  "rule_version" text NOT NULL,
  "acknowledged_at" timestamptz,
  "acknowledged_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "document" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "kind" "document_kind" NOT NULL,
  "title" text NOT NULL,
  "status" "document_status" DEFAULT 'brouillon' NOT NULL,
  "doc_version" integer DEFAULT 1 NOT NULL,
  "content_enc" text,
  "source_snapshot" jsonb,
  "signed_at" timestamptz,
  "signed_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "document_version" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "status" "document_status" NOT NULL,
  "content_enc" text,
  "reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text
);

CREATE TABLE "prescription" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "status" "document_status" DEFAULT 'brouillon' NOT NULL,
  "allergies_checked_at" timestamptz,
  "dfg_checked_at" timestamptz,
  "validated_at" timestamptz,
  "validated_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "prescription_line" (
  "id" text PRIMARY KEY NOT NULL,
  "prescription_id" text NOT NULL REFERENCES "prescription"("id") ON DELETE CASCADE,
  "drug_enc" text,
  "dci" text,
  "posology_enc" text,
  "duration" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "appointment" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text REFERENCES "patient"("id"),
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "motif_enc" text,
  "status" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "nursing_note" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "stay_id" text REFERENCES "stay"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "author_id" text,
  "recorded_at" timestamptz NOT NULL,
  "body_enc" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "file_object" (
  "id" text PRIMARY KEY NOT NULL,
  "patient_id" text NOT NULL REFERENCES "patient"("id"),
  "encounter_id" text REFERENCES "encounter"("id"),
  "storage_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "checksum_sha256" text NOT NULL,
  "virus_scan_status" text DEFAULT 'pending' NOT NULL,
  "uploaded_by" text,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  "original_name_sanitized" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz
);

CREATE TABLE "setting" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text
);

CREATE TABLE "feature_flag" (
  "key" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text
);

CREATE TABLE "audit_event" (
  "id" text PRIMARY KEY NOT NULL,
  "at" timestamptz DEFAULT now() NOT NULL,
  "actor_id" text,
  "actor_role" text,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "outcome" text DEFAULT 'success' NOT NULL,
  "ip_truncated" text,
  "user_agent_hash" text,
  "request_id" text,
  "prev_hash" text,
  "hash" text NOT NULL
);

-- Append-only : refuse UPDATE/DELETE
CREATE OR REPLACE FUNCTION audit_event_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_update
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE PROCEDURE audit_event_append_only();
