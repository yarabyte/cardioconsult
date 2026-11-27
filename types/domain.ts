/**
 * Types métier Cardio Soin (référence P00 / CDC §6.2).
 *
 * Conventions :
 * - identifiants : UUID v7 (string) en production ; mocks démo peuvent utiliser des ids lisibles ;
 * - valeurs cliniques absentes : `null` (jamais une valeur « normale » implicite) ;
 * - booléens cliniques : `TriState` (`oui` | `non` | `inconnu`) ;
 * - dates : ISO `YYYY-MM-DD` ou `timestamptz` ISO-8601 selon le champ ;
 * - unités dans le nom (`lvefPct`, `creatinineUmolL`).
 *
 * Certains champs de projection UI (libellés, `contentHtml` démo) restent pour le socle mock ;
 * le modèle cible documents utilise un contenu structuré JSON (Tiptap), pas du HTML brut.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type Role = "SUPERADMIN" | "MEDECIN" | "INFIRMIERE";

/** Trois états cliniques (UI FR). Équivalent règle : yes | no | unknown. */
export type TriState = "oui" | "non" | "inconnu";

export type Sex = "F" | "H" | "Autre" | "NonRenseigne";

export type ClinicalStatusVariant =
  "non-renseigne" | "calcule" | "incomplet" | "valide" | "alerte" | "red-flag";

export type IsoDate = string;
export type IsoDateTime = string;
export type Uuid = string;

export type Sensitivity = "identite" | "sante" | "technique" | "compte";

export type DatabasePlane = "control" | "tenant";

// ---------------------------------------------------------------------------
// Résultats de règles / scores (aide à la documentation, pas décision médicale)
// ---------------------------------------------------------------------------

export type ScoreStatus =
  "non_applicable" | "incomplet" | "calcule" | "saisi_externe" | "incoherent";

export interface ScoreResult<T = number> {
  status: ScoreStatus;
  value: T | null;
  range?: { min: number; max: number };
  rationale: string[];
  missingInputs: string[];
  warnings?: string[];
  source: { id: string; version: string };
}

export type ClinicalScoreKind =
  | "cha2ds2va"
  | "hasbled"
  | "rcri"
  | "score2"
  | "timi"
  | "grace"
  | "euroscore_ii"
  | "sts"
  | "autres";

export type AlertLevel = "alerte_mesure" | "discussion_specialisee" | "potentiellement_urgent";

// ---------------------------------------------------------------------------
// Control-plane
// ---------------------------------------------------------------------------

export type TenantPlan = "Solo" | "Cabinet" | "Clinique";

export type TenantStatus =
  | "provisioning"
  | "provisioning_failed"
  | "Actif"
  | "Essai"
  | "Suspendu"
  | "Paiement en échec"
  | "deleted";

export interface Tenant {
  id: Uuid | string;
  slug: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  /** Projection UI démo */
  usersLabel: string;
  storageLabel: string;
  lastActivityLabel: string;
  city?: string;
  retentionYears?: number | null;
  featureFlags?: TenantFeatureFlags;
}

export interface TenantFeatureFlags {
  /** Modules à finalité médicale — off par défaut en prod tant que non qualifiés. */
  scoresInterpreted: boolean;
  aorticAlerts: boolean;
  clinicalSuggestions: boolean;
  /** Module hospitalisation — offre Clinique + contrat établissement. */
  hospitalisation?: boolean;
}

export type MemberStatus = "active" | "invited" | "disabled";

export type MfaStatus = "Activée" | "En attente";

export interface Member {
  id: Uuid | string;
  tenantId: Uuid | string;
  userId?: Uuid | string;
  name: string;
  email: string;
  role: Role;
  isTenantAdmin?: boolean;
  status?: MemberStatus;
  initials: string;
  mfa: MfaStatus;
  lastLoginLabel: string;
  rpps?: string | null;
}

export interface Invitation {
  id: Uuid;
  tenantId: Uuid;
  email: string;
  role: Exclude<Role, "SUPERADMIN">;
  expiresAt: IsoDateTime;
  acceptedAt: IsoDateTime | null;
}

export type SupportSessionStatus = "requested" | "active" | "revoked" | "expired" | "denied";

export interface SupportSession {
  id: Uuid | string;
  tenantId: Uuid | string;
  platformActorId: Uuid | string;
  platformActorLabel?: string;
  consentedByMemberId: Uuid | string | null;
  consentedByLabel?: string | null;
  startsAt: IsoDateTime | null;
  endsAt: IsoDateTime | null;
  reason: string;
  status: SupportSessionStatus;
  readOnly: true;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "canceled";

export interface Subscription {
  id: Uuid | string;
  tenantId: Uuid | string;
  plan: TenantPlan;
  status: SubscriptionStatus;
  seats: number;
  currentPeriodEnd: IsoDateTime | null;
  trialEndsAt: IsoDateTime | null;
  graceEndsAt: IsoDateTime | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** Identité de facturation uniquement — jamais de données patient. */
  billingLegalName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
}

/** Utilisateur démo / projection session (pas de données patient). */
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isTenantAdmin?: boolean;
  initials: string;
  tenantId: string | null;
}

// ---------------------------------------------------------------------------
// Patient & séjour
// ---------------------------------------------------------------------------

export type InsQualification = "non_qualifiee" | "qualifiee" | "en_attente";

export interface PatientIdentity {
  firstName: string | null;
  lastName: string | null;
  birthName: string | null;
  birthDate: IsoDate | null;
  sex: Sex | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  /** INS : jamais marquée qualifiée sans téléservice INSi homologué. */
  ins: string | null;
  insStatus: InsQualification;
}

/**
 * Projection dossier patient (liste / fiche).
 * L'identité sensible est chiffrée en base (`patient_identity_enc`) ; ici formes en clair
 * uniquement après déchiffrement serveur pour l'UI autorisée.
 */
export interface Patient {
  id: Uuid | string;
  tenantId: Uuid | string;
  /** Numéro métier affiché (ex. CC-…). Jamais l'UUID technique en UI. */
  dossierNumber?: string;
  firstName: string;
  lastName: string;
  birthDate: IsoDate;
  sex: "F" | "H";
  pathologies: string[];
  fevgPct: number | null;
  lastConsultDate: IsoDate | null;
  nextAppointmentDate: IsoDate | null;
  alertLabel: string | null;
  allergies: string[];
  heightM: number | null;
  weightKg: number | null;
  insStatus: string;
  flags: string[];
  archivedAt?: IsoDateTime | null;
  version?: number;
}

export type StayStatus = "en_cours" | "sortie_prevue" | "sortie" | "annule";

export interface Stay {
  id: Uuid | string;
  patientId: Uuid | string;
  admittedAt: IsoDateTime;
  dischargedAt: IsoDateTime | null;
  plannedDischargeAt?: IsoDateTime | null;
  bedId: Uuid | string | null;
  room?: number | null;
  motif: string | null;
  status: StayStatus;
  referringPhysicianId: Uuid | string | null;
  referringPhysicianLabel?: string | null;
}

// ---------------------------------------------------------------------------
// Agenda & accueil
// ---------------------------------------------------------------------------

export type EncounterStatus = "termine" | "en_cours" | "a_venir" | "salle_attente" | "annule";

export interface Encounter {
  id: Uuid | string;
  patientId: Uuid | string;
  stayId?: Uuid | null;
  datedAt: IsoDate | IsoDateTime;
  motif: string;
  type: string;
  status: EncounterStatus;
  authorId?: Uuid | null;
  historySummary?: string | null;
  antecedentsText?: string | null;
  treatmentsText?: string | null;
  rubric?: string;
  version?: number;
}

export interface Appointment {
  id: Uuid | string;
  patientId: Uuid | string | null;
  patientLabel: string;
  day: string;
  time: string;
  motif: string;
  detail: string;
  status?: string;
  startsAt?: IsoDateTime;
  endsAt?: IsoDateTime | null;
}

export interface Bed {
  id: Uuid | string;
  number: string;
  room: number;
  patientId: Uuid | string | null;
  patientLabel: string;
  motif: string;
  tag: "Libre" | "Fiche" | "Examen" | "Alerte" | "Sortie prévue";
  dayLabel: string;
  stayId?: string | null;
  referringPhysicianLabel?: string | null;
  staffNote?: string | null;
  pendingExams?: string[];
  lastTransmission?: string | null;
  lastTransmissionAt?: IsoDateTime | null;
}

export interface NursingNote {
  id: Uuid;
  patientId: Uuid;
  stayId: Uuid | null;
  encounterId: Uuid | null;
  authorId: Uuid;
  recordedAt: IsoDateTime;
  bodyText: string | null;
}

// ---------------------------------------------------------------------------
// Clinique
// ---------------------------------------------------------------------------

export interface Vitals {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  stayId?: Uuid | string | null;
  recordedAt: IsoDateTime;
  authorId?: Uuid | null;
  authorLabel: string;
  tasMmHg: number | null;
  tadMmHg: number | null;
  fcBpm: number | null;
  spo2Pct: number | null;
  temperatureC: number | null;
  frPerMin: number | null;
  weightKg: number | null;
  heightM?: number | null;
  nyha?: "I" | "II" | "III" | "IV" | null;
  eva: number | null;
  edemaMi?: TriState | null;
  crackles?: TriState | null;
  jugularDistension?: TriState | null;
  /** Mesure annulée par correction (immuable — historique conservé). */
  cancelledAt?: IsoDateTime | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
  supersedesId?: string | null;
  alertLabels?: string[];
}

export type LabCode =
  | "hb_g_dl"
  | "plaq_g_l"
  | "creatinine_umol_l"
  | "dfg_ml_min"
  | "kaliemie_mmol_l"
  | "natremie_mmol_l"
  | "ntprobnp_pg_ml"
  | "troponine"
  | "crp_mg_l"
  | "tsh_mui_l"
  | "ldl_g_l"
  | "hba1c_pct"
  | "autre";

export interface LabResult {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  datedAt: IsoDate | IsoDateTime;
  code?: LabCode;
  value?: number | string | null;
  unit?: string | null;
  source?: string | null;
  /** Projection démo aplatie */
  ntProBnpPgMl?: number | null;
  dfgMlMin?: number | null;
  kaliemieMmolL?: number | null;
  ldlGL?: number | null;
  hba1cPct?: number | null;
}

export type EcgRhythm = "sinusal" | "fa" | "flutter" | "rythme_entraine" | "autre" | null;

export interface EcgStudy {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  datedAt: IsoDate | IsoDateTime;
  rythme?: EcgRhythm;
  fcBpm?: number | null;
  prMs?: number | null;
  qrsMs?: number | null;
  qtcMs: number | null;
  formula?: "Fridericia" | "Bazett" | null;
  axis?: string | null;
  interpretationText?: string | null;
  stElevation?: TriState | null;
  stDepression?: TriState | null;
}

export interface EchoValveFindings {
  im?: string | null;
  ia?: string | null;
  rao?: string | null;
  it?: string | null;
  comment?: string | null;
}

export interface EchoStudy {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  datedAt: IsoDate | IsoDateTime;
  fevgPct: number | null;
  dtdVgMm?: number | null;
  septumMm?: number | null;
  posteriorWallMm?: number | null;
  tapseMm?: number | null;
  sPrimeVdCms?: number | null;
  papsMmHg?: number | null;
  vmaxItMs?: number | null;
  eOverEPrime?: number | null;
  valves?: EchoValveFindings | null;
  quality?: string | null;
  conclusionText?: string | null;
}

export type AorticSegment =
  "anneau" | "sinus" | "jonction" | "ascendante" | "crosse" | "descendante";

export interface AorticMeasurement {
  id: Uuid | string;
  patientId: Uuid | string;
  echoStudyId?: Uuid | null;
  datedAt: IsoDate | IsoDateTime;
  segment: AorticSegment;
  diameterMm: number | null;
  indexedMmM2: number | null;
  method?: string | null;
  quality?: string | null;
}

export interface AorticRiskFactors {
  bicuspidAorticValve: TriState | null;
  geneticAortopathy: TriState | null;
  familyHistoryDissection: TriState | null;
  coarctation: TriState | null;
  attributableSymptoms: TriState | null;
  concomitantAorticValveSurgery: TriState | null;
  uncontrolledHta: TriState | null;
  ctOrMriDone: TriState | null;
}

export interface ClinicalScore {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | string;
  kind: ClinicalScoreKind;
  datedAt: IsoDate | IsoDateTime;
  inputs?: Record<string, TriState | number | string | null>;
  result: ScoreResult;
  validatedBy?: Uuid | null;
}

export interface ClinicalAlert {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  level: AlertLevel;
  title: string;
  message?: string;
  ruleId: string;
  ruleVersion: string;
  acknowledgedAt: IsoDateTime | null;
  acknowledgedBy: Uuid | string | null;
  details: string[];
}

// ---------------------------------------------------------------------------
// Documents, fichiers, ordonnances
// ---------------------------------------------------------------------------

export type DocumentStatus = "brouillon" | "valide" | "signe" | "annule" | "remplace";

export type DocumentKind = "compte_rendu" | "ordonnance" | "courrier" | "autre";

/** Contenu structuré cible (Tiptap/ProseMirror). */
export type RichDocumentContent = Record<string, unknown>;

export interface Document {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | string;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  version: number;
  /** Cible production : JSON structuré. */
  contentJson?: RichDocumentContent | null;
  /**
   * Projection démo uniquement — ne pas persister de HTML patient en production.
   * @deprecated Remplacé par contentJson + rendu sûr.
   */
  contentHtml: string;
  sourceSnapshot?: Record<string, unknown> | null;
  sourceModified: boolean;
  signedAt: IsoDateTime | null;
  signedBy: Uuid | string | null;
  updatedAt: IsoDateTime;
  replaceOfId?: Uuid | null;
}

export interface DocumentVersion {
  id: Uuid;
  documentId: Uuid;
  version: number;
  status: DocumentStatus;
  contentJson: RichDocumentContent;
  createdAt: IsoDateTime;
  createdBy: Uuid;
  reason: string | null;
}

export interface PrescriptionLine {
  id: Uuid | string;
  /** Libellé affiché (souvent = DCI). */
  drug: string;
  dci?: string | null;
  /** Vide par défaut — jamais prérempli par un modèle (T-17). */
  dosage?: string | null;
  form?: string | null;
  posology: string;
  route?: string | null;
  frequency?: string | null;
  duration?: string;
  quantity?: string | null;
  renewals?: number | null;
  remarks?: string | null;
  /** Zone ALD (bizone). */
  ald?: boolean;
}

export interface Prescription {
  id: Uuid | string;
  patientId: Uuid | string;
  encounterId?: Uuid | null;
  status: DocumentStatus;
  lines: PrescriptionLine[];
  allergiesCheckedAt?: IsoDateTime | null;
  dfgCheckedAt?: IsoDateTime | null;
  pregnancyNotedAt?: IsoDateTime | null;
  updatedAt: IsoDateTime;
  validatedAt?: IsoDateTime | null;
  validatedBy?: Uuid | null;
  /** Identifiant du brouillon source si duplication. */
  duplicatedFromId?: Uuid | string | null;
}

export interface FileObject {
  id: Uuid;
  patientId: Uuid;
  encounterId: Uuid | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  virusScanStatus: "pending" | "clean" | "infected" | "error";
  /** Cycle de vie métier (P10). */
  lifecycleStatus?: "en_analyse" | "disponible" | "rejete";
  rejectReason?: string | null;
  uploadedBy: Uuid;
  uploadedAt: IsoDateTime;
  originalNameSanitized: string;
}

// ---------------------------------------------------------------------------
// Audit, réglages
// ---------------------------------------------------------------------------

export type AuditOutcome = "success" | "denied" | "failure";

export interface AuditEvent {
  id: Uuid | string;
  at: IsoDateTime;
  actorId?: Uuid | null;
  actorLabel: string;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId: string;
  outcome?: AuditOutcome;
  requestId?: string | null;
  prevHash?: string | null;
  hash?: string | null;
}

export interface TenantSetting {
  key: string;
  value: unknown;
  updatedAt: IsoDateTime;
  updatedBy: Uuid;
}

export interface TimeSeriesPoint {
  date: IsoDate;
  value: number | null;
}
