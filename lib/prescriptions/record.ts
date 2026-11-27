import type { Prescription, PrescriptionLine } from "@/types/domain";

export type RxRecord = Prescription & {
  aldLayout: boolean;
  lines: PrescriptionLine[];
};

export type PrescriptionMeta = {
  aldLayout: boolean;
  duplicatedFromId: string | null;
  pregnancyNotedAt: string | null;
};

export const defaultPrescriptionMeta = (): PrescriptionMeta => ({
  aldLayout: false,
  duplicatedFromId: null,
  pregnancyNotedAt: null,
});
