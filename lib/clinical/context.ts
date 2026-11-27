import type { ScoreResult } from "./types";
import { nonApplicable } from "./types";

export type ScoreFamilyId =
  "cha2ds2va" | "hasbled" | "rcri" | "timi" | "aorta" | "ePht" | "eurosource_externe";

export type ClinicalContext = {
  hasAfibOrFlutter: boolean;
  plannedNoncardiacSurgery: boolean;
  suspectedAcs: boolean;
  hasAorticMeasure: boolean;
  echoDone: boolean;
};

export type FamilyApplicability = {
  familyId: ScoreFamilyId;
  applicable: boolean;
  reason: string;
};

/** N'affiche comme applicables que les familles contextualisées. */
export function scoreFamiliesForContext(ctx: ClinicalContext): FamilyApplicability[] {
  return [
    {
      familyId: "cha2ds2va",
      applicable: ctx.hasAfibOrFlutter,
      reason: ctx.hasAfibOrFlutter
        ? "FA / flutter documenté — score d'aide à la documentation."
        : "Non applicable : pas de FA/flutter saisi dans le contexte.",
    },
    {
      familyId: "hasbled",
      applicable: ctx.hasAfibOrFlutter,
      reason: ctx.hasAfibOrFlutter
        ? "FA / flutter — risque hémorragique documentaire."
        : "Non applicable : pas de FA/flutter saisi.",
    },
    {
      familyId: "rcri",
      applicable: ctx.plannedNoncardiacSurgery,
      reason: ctx.plannedNoncardiacSurgery
        ? "Chirurgie non cardiaque planifiée."
        : "Non applicable : pas de chirurgie non cardiaque planifiée.",
    },
    {
      familyId: "timi",
      applicable: ctx.suspectedAcs,
      reason: ctx.suspectedAcs
        ? "Contexte SCA suspecté — score documentaire."
        : "Non applicable : pas de contexte SCA saisi.",
    },
    {
      familyId: "aorta",
      applicable: ctx.hasAorticMeasure || ctx.echoDone,
      reason:
        ctx.hasAorticMeasure || ctx.echoDone
          ? "Mesures aortiques / ETT disponibles."
          : "Non applicable : aucune mesure aortique ni ETT.",
    },
    {
      familyId: "ePht",
      applicable: ctx.echoDone,
      reason: ctx.echoDone
        ? "ETT disponible — ePHT si critères présents."
        : "Non applicable : ETT non renseignée.",
    },
  ];
}

export function externalScoreStub(label: string, url: string): ScoreResult {
  return {
    status: "saisi_externe",
    value: null,
    rationale: [
      `${label} : saisie externe uniquement.`,
      `Calculateur de référence : ${url}`,
      "Non recalculé par Cardio Soin.",
    ],
    missingInputs: [],
    source: { id: label, version: "external" },
  };
}

export function naResult(reason: string, sourceId: string): ScoreResult {
  return nonApplicable([reason], { id: sourceId, version: "1.0" });
}
