/** Domain types for CardioConsult (fictional clinical SaaS). */

export type Role = "SUPERADMIN" | "MEDECIN" | "INFIRMIERE";

export type TriState = "oui" | "non" | "inconnu";

export type ClinicalStatusVariant =
  | "non-renseigne"
  | "calcule"
  | "incomplet"
  | "valide"
  | "alerte"
  | "red-flag";

export type ScoreStatus = "non_applicable" | "incomplet" | "calcule";

export interface ScoreResult<T = number> {
  status: ScoreStatus;
  value: T | null;
  range?: { min: number; max: number };
  rationale: string[];
  missingInputs: string[];
  source: { id: string; version: string };
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: "Solo" | "Cabinet" | "Clinique";
  status: "Actif" | "Essai" | "Suspendu" | "Paiement en échec";
  usersLabel: string;
  storageLabel: string;
  lastActivityLabel: string;
  city?: string;
}

export interface Member {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  isTenantAdmin?: boolean;
  initials: string;
  mfa: "Activée" | "En attente";
  lastLoginLabel: string;
}

export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date
  sex: "F" | "H";
  pathologies: string[];
  fevgPct: number | null;
  lastConsultDate: string | null;
  nextAppointmentDate: string | null;
  alertLabel: string | null;
  allergies: string[];
  heightM: number | null;
  weightKg: number | null;
  insStatus: string;
  flags: string[];
}

export interface Vitals {
  id: string;
  patientId: string;
  recordedAt: string;
  authorLabel: string;
  tasMmHg: number | null;
  tadMmHg: number | null;
  fcBpm: number | null;
  spo2Pct: number | null;
  temperatureC: number | null;
  frPerMin: number | null;
  weightKg: number | null;
  eva: number | null;
}

export interface LabResult {
  id: string;
  patientId: string;
  datedAt: string;
  ntProBnpPgMl?: number | null;
  dfgMlMin?: number | null;
  kaliemieMmolL?: number | null;
  ldlGL?: number | null;
  hba1cPct?: number | null;
}

export interface EcgStudy {
  id: string;
  patientId: string;
  datedAt: string;
  qtcMs: number | null;
  formula?: "Fridericia" | "Bazett";
}

export interface EchoStudy {
  id: string;
  patientId: string;
  datedAt: string;
  fevgPct: number | null;
  quality?: string;
}

export type AorticSegment =
  | "anneau"
  | "sinus"
  | "jonction"
  | "ascendante"
  | "crosse"
  | "descendante";

export interface AorticMeasurement {
  id: string;
  patientId: string;
  datedAt: string;
  segment: AorticSegment;
  diameterMm: number | null;
  indexedMmM2: number | null;
  method?: string;
  quality?: string;
}

export interface ClinicalScore {
  id: string;
  patientId: string;
  encounterId?: string;
  kind: "cha2ds2va" | "hasbled" | "rcri" | "euroscore_ii";
  datedAt: string;
  result: ScoreResult;
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  level: "alerte_mesure" | "discussion_specialisee" | "potentiellement_urgent";
  title: string;
  ruleId: string;
  ruleVersion: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  details: string[];
}

export type DocumentStatus = "brouillon" | "valide" | "signe";

export interface Document {
  id: string;
  patientId: string;
  encounterId?: string;
  kind: "compte_rendu" | "ordonnance";
  title: string;
  status: DocumentStatus;
  version: number;
  contentHtml: string;
  sourceModified: boolean;
  signedAt: string | null;
  signedBy: string | null;
  updatedAt: string;
}

export interface PrescriptionLine {
  id: string;
  drug: string;
  posology: string;
  duration?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  status: DocumentStatus;
  lines: PrescriptionLine[];
  updatedAt: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  datedAt: string;
  motif: string;
  type: string;
  status: "termine" | "en_cours" | "a_venir" | "salle_attente";
  rubric?: string;
}

export interface Appointment {
  id: string;
  patientId: string | null;
  patientLabel: string;
  day: string;
  time: string;
  motif: string;
  detail: string;
  status?: string;
}

export interface Bed {
  id: string;
  number: string;
  room: number;
  patientId: string | null;
  patientLabel: string;
  motif: string;
  tag: "Libre" | "Fiche" | "Examen" | "Alerte" | "Sortie prévue";
  dayLabel: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number | null;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isTenantAdmin?: boolean;
  initials: string;
  tenantId: string | null;
}
