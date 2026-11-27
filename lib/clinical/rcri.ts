import { calculated, incompleteRange, type ScoreResult, type TriState } from "./types";

const SOURCE = { id: "rcri", version: "1.0" } as const;

export type RcriCriteria = {
  highRiskSurgery: TriState;
  ischemicHeartDisease: TriState;
  heartFailure: TriState;
  cerebrovascularDisease: TriState;
  insulinDependentDiabetes: TriState;
  creatinineAbove177: TriState;
};

export const RCRI_LABELS: Record<keyof RcriCriteria, string> = {
  highRiskSurgery: "Chirurgie à haut risque",
  ischemicHeartDisease: "Cardiopathie ischémique",
  heartFailure: "Insuffisance cardiaque",
  cerebrovascularDisease: "AVC / AIT",
  insulinDependentDiabetes: "Diabète sous insuline",
  creatinineAbove177: "Créatinine > 177 µmol/L",
};

const LABELS = RCRI_LABELS;

export function computeRcri(criteria: RcriCriteria): ScoreResult {
  let known = 0;
  let unknown = 0;
  const rationale: string[] = [];
  const missingInputs: string[] = [];

  for (const key of Object.keys(LABELS) as (keyof RcriCriteria)[]) {
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

  if (unknown > 0) {
    return incompleteRange(known, unknown, rationale, missingInputs, SOURCE);
  }
  return calculated(known, rationale, SOURCE);
}
