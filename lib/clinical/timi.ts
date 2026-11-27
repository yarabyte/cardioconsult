import { calculated, incompleteRange, type ScoreResult, type TriState } from "./types";

const SOURCE = { id: "timi", version: "1.0" } as const;

/** Critères TIMI UA/NSTEMI (documentation) — jamais un diagnostic. */
export type TimiCriteria = {
  ageGe65: TriState;
  ge3RiskFactors: TriState;
  knownCad50: TriState;
  stDeviation: TriState;
  severeAngina: TriState;
  asaRecent: TriState;
  positiveTroponin: TriState;
};

export const TIMI_LABELS: Record<keyof TimiCriteria, string> = {
  ageGe65: "Âge ≥ 65 ans",
  ge3RiskFactors: "≥ 3 facteurs de risque CV",
  knownCad50: "Sténose coronaire connue ≥ 50 %",
  stDeviation: "Déviation ST",
  severeAngina: "≥ 2 angors / 24 h",
  asaRecent: "Aspirine < 7 j",
  positiveTroponin: "Troponine positive",
};

const LABELS = TIMI_LABELS;

export function emptyTimi(): TimiCriteria {
  return {
    ageGe65: "inconnu",
    ge3RiskFactors: "inconnu",
    knownCad50: "inconnu",
    stDeviation: "inconnu",
    severeAngina: "inconnu",
    asaRecent: "inconnu",
    positiveTroponin: "inconnu",
  };
}

export function computeTimi(criteria: TimiCriteria): ScoreResult {
  let known = 0;
  let unknown = 0;
  const rationale: string[] = [];
  const missingInputs: string[] = [];

  for (const key of Object.keys(LABELS) as (keyof TimiCriteria)[]) {
    const label = LABELS[key];
    const state = criteria[key];
    if (state === "oui") {
      known += 1;
      rationale.push(`${label} (+1)`);
    } else if (state === "inconnu") {
      unknown += 1;
      missingInputs.push(label);
    } else {
      rationale.push(`${label} (0)`);
    }
  }

  rationale.push("Score TIMI — aide à la documentation, à valider cliniquement.");

  if (unknown > 0) {
    return incompleteRange(known, unknown, rationale, missingInputs, SOURCE);
  }
  return calculated(known, rationale, SOURCE);
}
