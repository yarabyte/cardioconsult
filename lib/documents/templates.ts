import type { CrTemplateId, DocumentSectionId } from "./tiptap-types";

export type CrTemplate = {
  id: CrTemplateId;
  label: string;
  defaultSections: DocumentSectionId[];
};

export const CR_TEMPLATES: CrTemplate[] = [
  {
    id: "prevention",
    label: "Prévention",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "ic",
    label: "Suivi insuffisance cardiaque",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "courbes",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "fa",
    label: "FA",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "post_sca",
    label: "Post-SCA",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "valvulopathie",
    label: "Valvulopathie",
    defaultSections: ["motif", "antecedents", "examen", "examens_comp", "conclusion", "conduite"],
  },
  {
    id: "cmh",
    label: "CMH",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "htp",
    label: "HTP",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
  {
    id: "controle_pm",
    label: "Contrôle PM/DAI",
    defaultSections: ["motif", "examen", "examens_comp", "conclusion", "conduite"],
  },
  {
    id: "preop",
    label: "Bilan préopératoire",
    defaultSections: [
      "motif",
      "antecedents",
      "examen",
      "examens_comp",
      "scores",
      "conclusion",
      "conduite",
    ],
  },
];

export const SECTION_LABELS: Record<DocumentSectionId, string> = {
  motif: "Motif et histoire",
  antecedents: "Antécédents et traitement",
  examen: "Examen clinique",
  examens_comp: "ECG · ETT · biologie",
  scores: "Scores pertinents (avec version)",
  courbes: "Courbes de suivi",
  conclusion: "Conclusion",
  conduite: "Conduite à tenir",
};
