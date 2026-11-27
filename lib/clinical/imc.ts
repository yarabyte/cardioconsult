import type { ScoreResult } from "./types";
import { calculated, nonApplicable } from "./types";

const SOURCE = { id: "imc-oms", version: "1.0" } as const;

/** IMC = poids (kg) / taille (m)² — refuse valeurs impossibles. */
export function computeImc(
  heightM: number | null | undefined,
  weightKg: number | null | undefined,
): ScoreResult {
  if (
    heightM == null ||
    weightKg == null ||
    !Number.isFinite(heightM) ||
    !Number.isFinite(weightKg)
  ) {
    return {
      status: "incomplet",
      value: null,
      rationale: ["Taille et poids requis pour l'IMC."],
      missingInputs: [
        ...(heightM == null ? ["Taille"] : []),
        ...(weightKg == null ? ["Poids"] : []),
      ],
      source: SOURCE,
    };
  }
  if (heightM <= 0 || heightM > 2.5 || weightKg <= 0 || weightKg > 400) {
    return nonApplicable(["Valeurs anthropométriques impossibles — IMC non calculé."], SOURCE);
  }
  const imc = weightKg / (heightM * heightM);
  return calculated(Number(imc.toFixed(1)), [`IMC = ${weightKg} / (${heightM})²`], SOURCE);
}
