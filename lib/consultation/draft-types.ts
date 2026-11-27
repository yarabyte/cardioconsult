import { emptyEcg, type EcgDraft } from "@/lib/exams/ecg";
import { type LabPanel } from "@/lib/exams/lab";
import { emptyAortaDraft, type AortaDraft } from "@/lib/exams/aorta-measure";
import { emptyExamOrdersDraft, type ExamOrdersDraft } from "@/lib/exam-orders/types";

export type TriState = "yes" | "no" | "unknown";

export type AntecedentRow = {
  id: string;
  pathology: string;
  status: string;
  date: string | null;
  params: string | null;
  comment: string | null;
};

export type TreatmentRow = {
  id: string;
  dci: string;
  dose: string | null;
  frequency: string | null;
};

export type ClinicalExamData = {
  tas: number | null;
  tad: number | null;
  fc: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightM: number | null;
  nyha: string | null;
  signs: string | null;
  /** Texte libre — vide par défaut, jamais « normal ». */
  auscultation: string | null;
  vitalsAuthor?: string | null;
  vitalsAt?: string | null;
};

export type EchoData = {
  fevg: number | null;
  fevgMethod: string | null;
  dtdvgMm: number | null;
  septumMm: number | null;
  posteriorWallMm: number | null;
  ogIndexed: string | null;
  tapseMm: number | null;
  sPrimeVdCms: number | null;
  papsMmHg: number | null;
  vmaxItMs: number | null;
  eOverEPrime: number | null;
  vci: string | null;
  pericarde: string | null;
  im: string | null;
  ia: string | null;
  rao: string | null;
  it: string | null;
  valvesComment: string | null;
  conclusion: string | null;
};

/** Formulaires minimaux P10. */
export type EffortDraft = {
  protocol: string | null;
  maxFc: number | null;
  symptoms: string | null;
  conclusion: string | null;
};

export type CoronairesDraft = {
  modality: string | null;
  findings: string | null;
  cadRads: string | null;
};

export type RythmologieDraft = {
  arrhythmia: string | null;
  device: string | null;
  holterSummary: string | null;
};

export type ImagerieDraft = {
  modality: string | null;
  datedAt: string | null;
  conclusion: string | null;
};

export type EncounterDraftData = {
  identityNotes: string | null;
  motif: string | null;
  history: string | null;
  antecedents: AntecedentRow[];
  riskFactors: Record<string, TriState>;
  treatments: TreatmentRow[];
  allergies: string[];
  clinicalExam: ClinicalExamData;
  labs: LabPanel[];
  ecg: EcgDraft;
  echo: EchoData;
  aorta: AortaDraft;
  effort: EffortDraft;
  coronaires: CoronairesDraft;
  rythmologie: RythmologieDraft;
  imagerie: ImagerieDraft;
  /** Synthèse / décisions — texte libre, jamais prérempli. */
  synthesis: string | null;
  /** Transmissions cabinet — texte libre (hors module hôpital/IDE). */
  transmissions: string | null;
  /**
   * Brouillon d’examens complémentaires (V15) — documentaire uniquement,
   * pas d’envoi laboratoire ni signature exécutoire.
   */
  examOrders: ExamOrdersDraft;
  templateApplied?: string | null;
};

export type EncounterDraft = {
  encounterId: string;
  patientId: string;
  status: "brouillon" | "cloturee";
  actDate: string;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  data: EncounterDraftData;
};

export function emptyClinicalExam(): ClinicalExamData {
  return {
    tas: null,
    tad: null,
    fc: null,
    spo2: null,
    weightKg: null,
    heightM: null,
    nyha: null,
    signs: null,
    auscultation: null,
  };
}

export function emptyEcho(): EchoData {
  return {
    fevg: null,
    fevgMethod: null,
    dtdvgMm: null,
    septumMm: null,
    posteriorWallMm: null,
    ogIndexed: null,
    tapseMm: null,
    sPrimeVdCms: null,
    papsMmHg: null,
    vmaxItMs: null,
    eOverEPrime: null,
    vci: null,
    pericarde: null,
    im: null,
    ia: null,
    rao: null,
    it: null,
    valvesComment: null,
    conclusion: null,
  };
}

export function emptyDraftData(): EncounterDraftData {
  return {
    identityNotes: null,
    motif: null,
    history: null,
    antecedents: [],
    riskFactors: {
      hypertension: "unknown",
      dyslipidemie: "unknown",
      diabete: "unknown",
      tabac: "unknown",
      heredo: "unknown",
    },
    treatments: [],
    allergies: [],
    clinicalExam: emptyClinicalExam(),
    labs: [],
    ecg: emptyEcg(),
    echo: emptyEcho(),
    aorta: emptyAortaDraft(),
    effort: { protocol: null, maxFc: null, symptoms: null, conclusion: null },
    coronaires: { modality: null, findings: null, cadRads: null },
    rythmologie: { arrhythmia: null, device: null, holterSummary: null },
    imagerie: { modality: null, datedAt: null, conclusion: null },
    synthesis: null,
    transmissions: null,
    examOrders: emptyExamOrdersDraft(),
  };
}
