import type { ScoreResult } from "./types";
import { calculated, nonApplicable } from "./types";

const SOURCE = { id: "bsa-mosteller", version: "1.0" } as const;

/**
 * Body surface area — Mosteller: √((heightCm × weightKg) / 3600)
 * Rejects missing or impossible values.
 */
export function computeBsa(
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
      rationale: ["Taille et poids requis pour le calcul BSA (Mosteller)."],
      missingInputs: [
        ...(heightM == null ? ["Taille"] : []),
        ...(weightKg == null ? ["Poids"] : []),
      ],
      source: SOURCE,
    };
  }
  if (heightM <= 0 || heightM > 2.5 || weightKg <= 0 || weightKg > 400) {
    return nonApplicable(["Valeurs anthropométriques impossibles — BSA non calculée."], SOURCE);
  }
  const heightCm = heightM * 100;
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  return calculated(
    Number(bsa.toFixed(2)),
    [`Mosteller : √((${heightCm} × ${weightKg}) / 3600)`],
    SOURCE,
  );
}
