import type { AorticSegment } from "@/types/domain";
import type { ScoreResult } from "./types";

const SOURCE = { id: "AO-ASC-01", version: "0.1" } as const;

export type AortaLevel =
  | "non_renseigne"
  | "sous_seuil"
  | "alerte_mesure"
  | "discussion_specialisee"
  | "potentiellement_urgent";

export type AortaThresholds = {
  /** Soft alert threshold (mm) per segment */
  alertMm: number;
  /** Discussion threshold (mm) */
  discussionMm: number;
  /** Potentially urgent threshold (mm) */
  urgentMm: number;
  /** Growth rate mm/year that escalates */
  growthMmPerYear: number;
};

export const DEFAULT_AORTA_THRESHOLDS: AortaThresholds = {
  alertMm: 45,
  discussionMm: 50,
  urgentMm: 55,
  growthMmPerYear: 3,
};

export type SegmentMeasure = {
  segment: AorticSegment;
  diameterMm: number | null;
  /** Si true : jamais traité comme 0 mm — statut incomplet / non visualisé. */
  notVisualized?: boolean;
  priorDiameterMm?: number | null;
  priorDatedAt?: string | null;
  datedAt: string;
};

export type AortaSegmentResult = {
  segment: AorticSegment;
  level: AortaLevel;
  diameterMm: number | null;
  growthMmPerYear: number | null;
  /** « à valider cliniquement » */
  thresholdsNote: string;
  score: ScoreResult;
};

/**
 * Evaluate aorta thresholds per segment — never on global max.
 * Growth only if a dated prior measurement exists.
 */
export function evaluateAorticSegment(
  measure: SegmentMeasure,
  thresholds: AortaThresholds = DEFAULT_AORTA_THRESHOLDS,
): AortaSegmentResult {
  const note = "Seuils configurables — à valider cliniquement.";
  const { segment } = measure;
  // « non visualisé » ou 0 → jamais une mesure exploitable
  const diameterMm = measure.notVisualized || measure.diameterMm === 0 ? null : measure.diameterMm;

  if (diameterMm == null) {
    const reason = measure.notVisualized
      ? `Segment ${segment} : non visualisé (non traité comme 0 mm).`
      : `Segment ${segment} : diamètre non renseigné.`;
    return {
      segment,
      level: "non_renseigne",
      diameterMm: null,
      growthMmPerYear: null,
      thresholdsNote: note,
      score: {
        status: "incomplet",
        value: null,
        rationale: [reason],
        missingInputs: [`Diamètre ${segment}`],
        source: SOURCE,
      },
    };
  }

  let growth: number | null = null;
  if (
    measure.priorDiameterMm != null &&
    measure.priorDatedAt &&
    Number.isFinite(measure.priorDiameterMm)
  ) {
    const t0 = new Date(measure.priorDatedAt).getTime();
    const t1 = new Date(measure.datedAt).getTime();
    const years = (t1 - t0) / (365.25 * 24 * 3600 * 1000);
    if (years > 0) {
      growth = (diameterMm - measure.priorDiameterMm) / years;
    }
  }

  let level: AortaLevel = "sous_seuil";
  const rationale: string[] = [`${segment} : ${diameterMm} mm`];

  if (diameterMm >= thresholds.urgentMm) {
    level = "potentiellement_urgent";
    rationale.push(
      `≥ ${thresholds.urgentMm} mm → potentiellement urgent (évaluation / imagerie de confirmation suggérée)`,
    );
  } else if (diameterMm >= thresholds.discussionMm) {
    level = "discussion_specialisee";
    rationale.push(`≥ ${thresholds.discussionMm} mm → discussion spécialisée suggérée`);
  } else if (diameterMm >= thresholds.alertMm) {
    level = "alerte_mesure";
    rationale.push(`≥ ${thresholds.alertMm} mm → alerte de mesure`);
  }

  if (growth != null && growth >= thresholds.growthMmPerYear) {
    if (level === "sous_seuil" || level === "alerte_mesure") {
      level = "discussion_specialisee";
    }
    rationale.push(`Croissance ${growth.toFixed(1)} mm/an (≥ ${thresholds.growthMmPerYear} mm/an)`);
  } else if (growth != null) {
    rationale.push(`Croissance ${growth.toFixed(1)} mm/an`);
  } else {
    rationale.push("Croissance non calculable (pas de mesure antérieure datée).");
  }

  rationale.push(note);

  return {
    segment,
    level,
    diameterMm,
    growthMmPerYear: growth,
    thresholdsNote: note,
    score: {
      status: "calcule",
      value: diameterMm,
      rationale,
      missingInputs: [],
      source: SOURCE,
    },
  };
}

export function evaluateAllSegments(
  measures: SegmentMeasure[],
  thresholds?: AortaThresholds,
): AortaSegmentResult[] {
  return measures.map((m) => evaluateAorticSegment(m, thresholds));
}
