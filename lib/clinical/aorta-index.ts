import type { ScoreResult } from "./types";

const SOURCE = { id: "AO-AREA-HEIGHT", version: "0.1" } as const;

/**
 * Surface aortique / hauteur (cm²/m) — segment explicite + taille requis.
 * Jamais calculé sans taille.
 */
export function computeAorticAreaHeight(input: {
  segment: string;
  diameterMm: number | null;
  heightM: number | null;
}): ScoreResult {
  if (input.diameterMm == null || input.diameterMm <= 0) {
    return {
      status: "incomplet",
      value: null,
      rationale: [`Segment ${input.segment} : diamètre non renseigné.`],
      missingInputs: [`Diamètre ${input.segment}`],
      source: SOURCE,
    };
  }
  if (input.heightM == null || input.heightM <= 0) {
    return {
      status: "incomplet",
      value: null,
      rationale: ["Taille nécessaire pour le rapport surface/hauteur."],
      missingInputs: ["Taille (m)"],
      source: SOURCE,
    };
  }
  const radiusCm = input.diameterMm / 20; // mm → cm rayon
  const areaCm2 = Math.PI * radiusCm * radiusCm;
  const ratio = Math.round((areaCm2 / input.heightM) * 100) / 100;
  return {
    status: "calcule",
    value: ratio,
    rationale: [
      `${input.segment} : surface/hauteur ≈ ${ratio} cm²/m (diamètre ${input.diameterMm} mm, taille ${input.heightM} m).`,
      "À valider cliniquement.",
    ],
    missingInputs: [],
    source: SOURCE,
  };
}
