import type { Bed } from "@/types/domain";

export type BedFilter = "Tous" | Bed["tag"];

export type FluidBalanceEntry = {
  id: string;
  patientId: string;
  recordedAt: string;
  intakeMl: number;
  outputMl: number;
  diuresisMl: number | null;
  authorLabel: string;
};

export type TargetedTransmission = {
  id: string;
  patientId: string;
  stayId: string | null;
  recordedAt: string;
  authorLabel: string;
  body: string;
  target: string;
};

export type NursingStructuredNote =
  | {
      kind: "fluid";
      intakeMl: number;
      outputMl: number;
      diuresisMl: number | null;
      authorLabel: string;
    }
  | { kind: "transmission"; target: string; body: string; authorLabel: string };

export type VitalsMeta = {
  authorLabel: string;
  stayId: string | null;
  frPerMin: number | null;
  eva: number | null;
  alertLabels: string[];
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  supersedesId: string | null;
};

export const HOSPITALISATION_FLAG_KEY = "hospitalisation";
export const HOSPITALISATION_MODULE_SETTING = "hospitalisation.module";
export const HOSPITALISATION_WARD_SETTING = "hospitalisation.ward";
