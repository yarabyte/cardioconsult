import { ageAt } from "@/lib/format";
import { calculated, incompleteRange, type ScoreResult, type TriState } from "./types";

const SOURCE = { id: "hasbled", version: "1.0" } as const;

export type HasbledCriteria = {
  hta: TriState;
  renal: TriState;
  liver: TriState;
  stroke: TriState;
  bleeding: TriState;
  labileInr: TriState;
  drugsOrAlcohol: TriState;
};

export type HasbledInput = {
  birthDate: string;
  actDate: string;
  criteria: HasbledCriteria;
};

export const HASBLED_LABELS: Record<keyof HasbledCriteria, string> = {
  hta: "Hypertension non contrôlée",
  renal: "Atteinte rénale",
  liver: "Atteinte hépatique",
  stroke: "Antécédent d’AVC",
  bleeding: "Antécédent de saignement",
  labileInr: "INR labile",
  drugsOrAlcohol: "Médicaments / alcool",
};

const LABELS = HASBLED_LABELS;

export function computeHasbled(input: HasbledInput): ScoreResult {
  const age = ageAt(input.birthDate, input.actDate);
  let known = 0;
  let unknown = 0;
  const rationale: string[] = [];
  const missingInputs: string[] = [];

  if (age > 65) {
    known += 1;
    rationale.push(`Âge > 65 ans (+1) — ${age} ans à l’acte`);
  } else {
    rationale.push(`Âge ≤ 65 ans (0) — ${age} ans à l’acte`);
  }

  for (const key of Object.keys(LABELS) as (keyof HasbledCriteria)[]) {
    const label = LABELS[key];
    const state = input.criteria[key];
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
