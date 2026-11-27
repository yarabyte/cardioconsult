import type { ExamOrderGroup } from "./catalog-v15";

export const EXAM_ORDER_PRIORITIES = [
  "Routine",
  "Rapide (selon médecin)",
  "Urgence hospitalière",
] as const;

export type ExamOrderPriority = (typeof EXAM_ORDER_PRIORITIES)[number];

export type ExamOrderGroupFilter = ExamOrderGroup | "Toutes";

export type ExamOrderSelectedItem = {
  id: string;
  label: string;
  /** Protocole d’origine ; null si examen libre. */
  sourceProtocolId: string | null;
  custom?: boolean;
};

/** Brouillon documentaire — non exécutoire, pas d’envoi labo. */
export type ExamOrdersDraft = {
  activeProtocolId: string | null;
  groupFilter: ExamOrderGroupFilter;
  selected: ExamOrderSelectedItem[];
  priority: ExamOrderPriority;
  desiredDate: string | null;
  indication: string | null;
  samplingNotes: string | null;
};

export function emptyExamOrdersDraft(): ExamOrdersDraft {
  return {
    activeProtocolId: null,
    groupFilter: "Toutes",
    selected: [],
    priority: "Routine",
    desiredDate: null,
    indication: null,
    samplingNotes: null,
  };
}
