import { uuidv7 } from "uuidv7";
import type { PrescriptionLine } from "@/types/domain";

export type RxTemplateId = "ic_base" | "fa_anticoag" | "post_sca" | "hta";

export type RxTemplate = {
  id: RxTemplateId;
  label: string;
  /** DCI uniquement — jamais de dose. */
  dcis: string[];
};

export const RX_TEMPLATES: RxTemplate[] = [
  {
    id: "ic_base",
    label: "IC — socle (DCI)",
    dcis: ["bisoprolol", "ramipril", "spironolactone", "dapagliflozine"],
  },
  {
    id: "fa_anticoag",
    label: "FA — anticoagulant (DCI)",
    dcis: ["apixaban", "bisoprolol"],
  },
  {
    id: "post_sca",
    label: "Post-SCA (DCI)",
    dcis: ["aspirine", "clopidogrel", "atorvastatine", "bisoprolol", "ramipril"],
  },
  {
    id: "hta",
    label: "HTA (DCI)",
    dcis: ["ramipril", "bisoprolol"],
  },
];

/** Insère des lignes DCI sans dose / posologie (T-17). */
export function linesFromTemplate(templateId: RxTemplateId): PrescriptionLine[] {
  const tpl = RX_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return [];
  return tpl.dcis.map((dci) => ({
    id: uuidv7(),
    drug: dci,
    dci,
    dosage: null,
    form: null,
    posology: "",
    route: null,
    frequency: null,
    duration: "",
    quantity: null,
    renewals: null,
    remarks: null,
    ald: false,
  }));
}

/** Garantit qu'aucune dose n'est présente sur les lignes issues d'un modèle. */
export function assertTemplateHasNoDoses(lines: PrescriptionLine[]): boolean {
  return lines.every(
    (l) =>
      (l.dosage == null || l.dosage === "") &&
      (l.posology == null || l.posology === "") &&
      (l.quantity == null || l.quantity === ""),
  );
}
