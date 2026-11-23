import type { ScoreResult, TriState } from "@/types/domain";

export type { ScoreResult, TriState };

export function incompleteRange(
  knownPoints: number,
  unknownPoints: number,
  rationale: string[],
  missingInputs: string[],
  source: { id: string; version: string },
): ScoreResult {
  return {
    status: "incomplet",
    value: null,
    range: { min: knownPoints, max: knownPoints + unknownPoints },
    rationale,
    missingInputs,
    source,
  };
}

export function calculated(
  value: number,
  rationale: string[],
  source: { id: string; version: string },
): ScoreResult {
  return {
    status: "calcule",
    value,
    rationale,
    missingInputs: [],
    source,
  };
}

export function nonApplicable(
  rationale: string[],
  source: { id: string; version: string },
): ScoreResult {
  return {
    status: "non_applicable",
    value: null,
    rationale,
    missingInputs: [],
    source,
  };
}
