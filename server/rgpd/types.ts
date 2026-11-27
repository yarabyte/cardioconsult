import type { Patient } from "@/types/domain";
import type { ErasureCertificate } from "./crypto-erasure";

export type RetentionPolicy = {
  tenantId: string;
  retentionYears: number;
  updatedAt: string;
  updatedBy: string;
};

export type DueDossier = {
  patientId: string;
  label: string;
  archivedAt: string;
  dueAt: string;
};

export type DataExportJob = {
  id: string;
  tenantId: string;
  scope: "tenant" | "patient";
  patientId: string | null;
  status: "ready" | "expired" | "deleted";
  createdAt: string;
  expiresAt: string;
  downloadToken: string;
  contentSha256: string;
  audited: boolean;
};

export type BreachIncident = {
  id: string;
  scope: "cabinet" | "plateforme";
  tenantId: string | null;
  declaredAt: string;
  declaredBy: string;
  description: string;
  qualification: "a_qualifier" | "non_violation" | "violation_probable" | "violation_confirmee";
  actions: string;
  notifyCnilIntent: boolean;
  cnilProcedureUrl: string;
};

export type IdentityAddendum = {
  id: string;
  patientId: string;
  version: number;
  at: string;
  authorId: string;
  reason: string;
  snapshot: Partial<Patient>;
};

export type TenantWipeRequest = {
  id: string;
  tenantId: string;
  adminApprovedAt: string | null;
  adminActorId: string | null;
  platformApprovedAt: string | null;
  platformActorId: string | null;
  graceEndsAt: string | null;
  status: "pending" | "grace" | "erased" | "cancelled";
  certificate: ErasureCertificate | null;
};

export type PatientNotice = {
  tenantId: string;
  body: string;
  updatedAt: string;
};

export const CNIL_PROCEDURE =
  "https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles";
