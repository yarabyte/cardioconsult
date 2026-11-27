/** Feature flags cliniques — désactivés par défaut hors démo. */

export const CLINICAL_FEATURE_FLAGS = [
  "clinical.scores",
  "clinical.alerts",
  "clinical.aorta",
  "clinical.examOrders",
] as const;

export type ClinicalFeatureFlag = (typeof CLINICAL_FEATURE_FLAGS)[number];

export type FeatureFlagState = Record<ClinicalFeatureFlag, boolean>;

/** Prod : tout false. Démo : activés pour parcours synthétique. */
export function defaultClinicalFlags(demo: boolean): FeatureFlagState {
  return {
    "clinical.scores": demo,
    "clinical.alerts": demo,
    "clinical.aorta": demo,
    "clinical.examOrders": demo,
  };
}
