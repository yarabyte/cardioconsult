import { ageAt } from "@/lib/format";
import { calculated, incompleteRange, type ScoreResult, type TriState } from "./types";

const SOURCE = { id: "cha2ds2va", version: "1.0" } as const;

export type Cha2ds2vaCriteria = {
  insuffisanceCardiaque: TriState;
  hta: TriState;
  diabete: TriState;
  avc: TriState;
  vasculaire: TriState;
};

export type Cha2ds2vaInput = {
  birthDate: string;
  actDate: string;
  criteria: Cha2ds2vaCriteria;
};

export const CHA2DS2VA_LABELS: Record<keyof Cha2ds2vaCriteria, { label: string; points: number }> =
  {
    insuffisanceCardiaque: { label: "Insuffisance cardiaque", points: 1 },
    hta: { label: "Hypertension artérielle", points: 1 },
    diabete: { label: "Diabète", points: 1 },
    avc: { label: "AVC / AIT / embolie systémique", points: 2 },
    vasculaire: { label: "Maladie vasculaire", points: 1 },
  };

/** @deprecated alias — préférer CHA2DS2VA_LABELS */
const LABELS = CHA2DS2VA_LABELS;

/**
 * CHA₂DS₂-VA without sex criterion.
 * Age is derived from birthDate at actDate — never entered twice.
 * Unknown criteria never count as 0: returns min–max range.
 */
export function computeCha2ds2va(input: Cha2ds2vaInput): ScoreResult {
  const age = ageAt(input.birthDate, input.actDate);
  let known = 0;
  let unknown = 0;
  const rationale: string[] = [];
  const missingInputs: string[] = [];

  if (age >= 75) {
    known += 2;
    rationale.push(`Âge ≥ 75 ans (+2) — ${age} ans à l’acte`);
  } else if (age >= 65) {
    known += 1;
    rationale.push(`Âge 65–74 ans (+1) — ${age} ans à l’acte`);
  } else {
    rationale.push(`Âge < 65 ans (0) — ${age} ans à l’acte`);
  }

  for (const key of Object.keys(LABELS) as (keyof Cha2ds2vaCriteria)[]) {
    const meta = LABELS[key];
    const state = input.criteria[key];
    if (state === "oui") {
      known += meta.points;
      rationale.push(`${meta.label} (+${meta.points})`);
    } else if (state === "inconnu") {
      unknown += meta.points;
      missingInputs.push(meta.label);
    } else {
      rationale.push(`${meta.label} (0)`);
    }
  }

  if (unknown > 0) {
    return incompleteRange(known, unknown, rationale, missingInputs, SOURCE);
  }
  return calculated(known, rationale, SOURCE);
}
