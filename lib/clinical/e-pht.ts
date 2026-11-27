import type { ScoreResult } from "./types";

const SOURCE = { id: "ePhtProbability", version: "0.1" } as const;

/**
 * Probabilité d'hypertension pulmonaire estimée (ePHT) — placeholder documenté.
 * Reste `incomplet` tant que les critères ESC/ERS minimaux ne sont pas tous présents.
 * Ne produit jamais de libellé décisionnel.
 */
export function computeEphtProbability(input: {
  trVmaxMs: number | null;
  otherSignsOfPh: "oui" | "non" | "inconnu" | null;
}): ScoreResult {
  const missing: string[] = [];
  if (input.trVmaxMs == null) missing.push("Vmax IT (m/s)");
  if (input.otherSignsOfPh == null || input.otherSignsOfPh === "inconnu") {
    missing.push("Autres signes d'HTP");
  }

  if (missing.length > 0) {
    return {
      status: "incomplet",
      value: null,
      rationale: [
        "Estimation ePHT non calculable : critères requis manquants.",
        "Référentiel à valider cliniquement (fiche ePhtProbability).",
      ],
      missingInputs: missing,
      source: SOURCE,
    };
  }

  // Seuils prudents documentaires uniquement
  const vmax = input.trVmaxMs!;
  let band: number;
  const rationale: string[] = [];
  if (vmax <= 2.8 && input.otherSignsOfPh === "non") {
    band = 1;
    rationale.push("Vmax IT ≤ 2,8 m/s sans autre signe — bande basse (documentaire).");
  } else if (vmax >= 3.4) {
    band = 3;
    rationale.push("Vmax IT ≥ 3,4 m/s — bande haute (documentaire).");
  } else {
    band = 2;
    rationale.push("Vmax IT intermédiaire et/ou autres signes — bande intermédiaire.");
  }
  rationale.push("Aide à la documentation — à valider cliniquement.");

  return {
    status: "calcule",
    value: band,
    rationale,
    missingInputs: [],
    source: SOURCE,
  };
}
