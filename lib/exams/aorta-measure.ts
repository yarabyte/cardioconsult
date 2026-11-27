import type { AorticSegment } from "@/types/domain";
import { evaluateAorticSegment, type AortaSegmentResult } from "@/lib/clinical/aorta";

export const AORTA_SEGMENTS: { segment: AorticSegment; label: string }[] = [
  { segment: "anneau", label: "Anneau" },
  { segment: "sinus", label: "Sinus de Valsalva" },
  { segment: "jonction", label: "Jonction sino-tubulaire" },
  { segment: "ascendante", label: "Ascendante tubulaire" },
  { segment: "crosse", label: "Crosse" },
  { segment: "descendante", label: "Descendante" },
];

export type AortaSegmentEntry = {
  segment: AorticSegment;
  /** null si non renseigné ou non visualisé — jamais 0 forcé. */
  diameterMm: number | null;
  notVisualized: boolean;
  method: string | null;
  quality: string | null;
  datedAt: string | null;
};

export type AortaDraft = {
  datedAt: string | null;
  segments: AortaSegmentEntry[];
  growthMmPerYear: number | null;
  bicuspid: boolean;
  genetic: boolean;
  familyDissection: boolean;
  coarctation: boolean;
  symptoms: boolean;
  valveSurgery: boolean;
  uncontrolledHta: boolean;
  ctOrMri: boolean;
  conclusion: string | null;
};

export function emptyAortaSegment(segment: AorticSegment): AortaSegmentEntry {
  return {
    segment,
    diameterMm: null,
    notVisualized: false,
    method: null,
    quality: null,
    datedAt: null,
  };
}

export function emptyAortaDraft(): AortaDraft {
  return {
    datedAt: null,
    segments: AORTA_SEGMENTS.map((s) => emptyAortaSegment(s.segment)),
    growthMmPerYear: null,
    bicuspid: false,
    genetic: false,
    familyDissection: false,
    coarctation: false,
    symptoms: false,
    valveSurgery: false,
    uncontrolledHta: false,
    ctOrMri: false,
    conclusion: null,
  };
}

/**
 * Normalise une saisie segmentaire : « non visualisé » → diamètre null (jamais 0).
 */
export function normalizeAortaSegment(entry: AortaSegmentEntry): AortaSegmentEntry {
  if (entry.notVisualized) {
    return { ...entry, diameterMm: null };
  }
  // 0 explicite traité comme non renseigné (pas une mesure anatomique)
  if (entry.diameterMm === 0) {
    return { ...entry, diameterMm: null };
  }
  return entry;
}

export function evaluateAortaDraft(draft: AortaDraft): AortaSegmentResult[] {
  const datedAt = draft.datedAt ?? new Date().toISOString().slice(0, 10);
  return draft.segments.map((raw) => {
    const entry = normalizeAortaSegment(raw);
    return evaluateAorticSegment({
      segment: entry.segment,
      diameterMm: entry.diameterMm,
      datedAt: entry.datedAt ?? datedAt,
      notVisualized: entry.notVisualized,
    });
  });
}
