import { calculated, type ScoreResult } from "./types";

const SOURCE = { id: "qtc", version: "1.0" } as const;

export type QtcMethod = "Fridericia" | "Bazett";

/**
 * QTc à partir de QT (ms) et RR (s) ou FC (bpm).
 * Méthode obligatoire — jamais calculée sans méthode explicite.
 */
export function computeQtc(input: {
  qtMs: number | null;
  hrBpm: number | null;
  method: QtcMethod | null;
}): ScoreResult {
  if (input.method == null) {
    return {
      status: "incomplet",
      value: null,
      rationale: ["Méthode QTc non renseignée (Fridericia ou Bazett)."],
      missingInputs: ["Méthode QTc"],
      source: SOURCE,
    };
  }
  if (input.qtMs == null || input.qtMs <= 0) {
    return {
      status: "incomplet",
      value: null,
      rationale: ["QT non renseigné ou invalide."],
      missingInputs: ["QT (ms)"],
      source: SOURCE,
    };
  }
  if (input.hrBpm == null || input.hrBpm <= 0) {
    return {
      status: "incomplet",
      value: null,
      rationale: ["Fréquence cardiaque non renseignée."],
      missingInputs: ["FC (bpm)"],
      source: SOURCE,
    };
  }

  const rr = 60 / input.hrBpm;
  let qtc: number;
  if (input.method === "Bazett") {
    qtc = input.qtMs / Math.sqrt(rr);
  } else {
    qtc = input.qtMs / Math.cbrt(rr);
  }
  const rounded = Math.round(qtc * 10) / 10;
  return calculated(
    rounded,
    [
      `QTc ${input.method} : QT ${input.qtMs} ms, FC ${input.hrBpm} bpm → ${rounded} ms`,
      "Aide à la documentation — à valider cliniquement.",
    ],
    SOURCE,
  );
}
