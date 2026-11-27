import { ETT_RUBRICS, type RubricState } from "./rubrics";
import type { EncounterDraft } from "./draft-types";

const P09_SLUGS = [
  "identite",
  "motif",
  "antecedents",
  "facteurs",
  "traitements",
  "examen",
] as const;

function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.values(v as object).some(isFilled);
  return Boolean(v);
}

/** Indices hors brouillon (ordonnance, scores…) — jamais « fait » sans donnée réelle. */
export type CompletenessHints = {
  /** Ordonnance avec lignes ou statut valide/signé. */
  hasOrdonnanceContent?: boolean;
  /** Au moins un score clinique persisté. */
  hasScores?: boolean;
};

/** État « ordonnance » à partir d’une prescription liée à la consultation. */
export function ordonnanceStateFromRx(
  rx: { status: string; lines: readonly unknown[] } | null | undefined,
): RubricState {
  if (!rx) return "vide";
  if (rx.status === "valide" || rx.status === "signe") return "fait";
  if (rx.lines.length > 0) return "fait";
  return "vide";
}

/** État par rubrique à partir du brouillon — jamais « fait » sans donnée. */
export function computeRubricStates(
  draft: EncounterDraft | null,
  currentSlug: string,
  hints: CompletenessHints = {},
): Record<string, RubricState> {
  const states: Record<string, RubricState> = {};
  for (const r of ETT_RUBRICS) {
    states[r.slug] = "vide";
  }
  if (!draft) {
    applyHints(states, hints);
    if (currentSlug in states) states[currentSlug] = "courant";
    return states;
  }

  const d = draft.data;
  // Identité : notes locales, ou patient déjà porté par le dossier (rubrique consultée).
  states.identite = isFilled(d.identityNotes) ? "fait" : "vide";
  states.motif = isFilled(d.motif) || isFilled(d.history) ? "fait" : "vide";
  states.antecedents = (d.antecedents?.length ?? 0) > 0 ? "fait" : "vide";
  states.facteurs = Object.values(d.riskFactors ?? {}).some((v) => v && v !== "unknown")
    ? "fait"
    : "vide";
  states.traitements =
    (d.treatments?.length ?? 0) > 0 || (d.allergies?.length ?? 0) > 0 ? "fait" : "vide";
  const exam = d.clinicalExam;
  states.examen =
    exam &&
    (isFilled(exam.tas) ||
      isFilled(exam.tad) ||
      isFilled(exam.fc) ||
      isFilled(exam.nyha) ||
      isFilled(exam.auscultation))
      ? isFilled(exam.auscultation) || isFilled(exam.tas)
        ? "fait"
        : "incomplet"
      : "vide";

  states.biologie =
    (d.labs?.length ?? 0) > 0 &&
    d.labs.some((p) => p.rows.some((r) => r.value != null && r.value !== ""))
      ? "fait"
      : "vide";

  const ecg = d.ecg;
  if (ecg && (isFilled(ecg.rythme) || isFilled(ecg.fcBpm) || isFilled(ecg.qtcMs))) {
    states.ecg = ecg.qtcMs != null && ecg.qtcMethod == null ? "incomplet" : "fait";
  } else {
    states.ecg = "vide";
  }

  const echo = d.echo;
  if (echo && (isFilled(echo.fevg) || isFilled(echo.conclusion))) {
    states.echocardiographie = "fait";
  } else {
    states.echocardiographie = "vide";
  }

  const aorta = d.aorta;
  if (aorta && aorta.segments.some((s) => s.notVisualized || s.diameterMm != null)) {
    states.aorte = "fait";
  } else {
    states.aorte = "vide";
  }

  states.coronaires =
    isFilled(d.coronaires?.findings) || isFilled(d.coronaires?.modality) ? "fait" : "vide";
  states.rythmologie =
    isFilled(d.rythmologie?.arrhythmia) || isFilled(d.rythmologie?.device) ? "fait" : "vide";
  states.epreuve = isFilled(d.effort?.protocol) || isFilled(d.effort?.conclusion) ? "fait" : "vide";
  states.imagerie =
    isFilled(d.imagerie?.modality) || isFilled(d.imagerie?.conclusion) ? "fait" : "vide";

  states.synthese = isFilled(d.synthesis) ? "fait" : "vide";
  states.transmissions = isFilled(d.transmissions) ? "fait" : "vide";
  states["examens-complementaires"] =
    (d.examOrders?.selected?.length ?? 0) > 0 || isFilled(d.examOrders?.indication)
      ? "fait"
      : "vide";

  applyHints(states, hints);

  // Ne pas rétrograder « fait » → « courant » : le surlignage actif vient du slug URL.
  // Sinon les pastilles ✓ disparaissent sur la rubrique en cours.
  if (currentSlug in states && states[currentSlug] === "vide") {
    states[currentSlug] = "courant";
  }

  return states;
}

function applyHints(states: Record<string, RubricState>, hints: CompletenessHints) {
  if (hints.hasOrdonnanceContent) states.ordonnance = "fait";
  if (hints.hasScores) states.scores = "fait";
}

export function completenessFromDraft(
  draft: EncounterDraft | null,
  currentSlug: string,
  hints: CompletenessHints = {},
) {
  const states = computeRubricStates(draft, currentSlug, hints);
  const done = Object.values(states).filter((s) => s === "fait" || s === "courant").length;
  return { done, total: ETT_RUBRICS.length, states, p09Focus: P09_SLUGS };
}

/** T-02 : aucun texte généré ne doit introduire « normal » si champs vides. */
export function buildReportExcerpt(draft: EncounterDraft | null): string {
  if (!draft) return "";
  const parts: string[] = [];
  if (draft.data.motif?.trim()) parts.push(`Motif : ${draft.data.motif.trim()}`);
  if (draft.data.clinicalExam?.auscultation?.trim()) {
    parts.push(`Auscultation : ${draft.data.clinicalExam.auscultation.trim()}`);
  }
  if (draft.data.echo?.conclusion?.trim()) {
    parts.push(`ETT : ${draft.data.echo.conclusion.trim()}`);
  }
  if (draft.data.ecg?.interpretation?.trim()) {
    parts.push(`ECG : ${draft.data.ecg.interpretation.trim()}`);
  }
  return parts.join("\n");
}
