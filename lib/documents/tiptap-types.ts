/**
 * Contenu structuré type Tiptap/ProseMirror — jamais de HTML brut stocké.
 * Rendu uniquement via nœuds typés (pas de dangerouslySetInnerHTML).
 */

export type TipMark = { type: "bold" | "italic" };

export type TipTextNode = {
  type: "text";
  text: string;
  marks?: TipMark[];
};

export type TipParagraph = {
  type: "paragraph";
  content?: TipTextNode[];
};

export type TipHeading = {
  type: "heading";
  attrs: { level: 1 | 2 | 3 };
  content?: TipTextNode[];
};

export type TipDocNode = TipParagraph | TipHeading;

export type TipDoc = {
  type: "doc";
  content: TipDocNode[];
};

export type DocumentSectionId =
  | "motif"
  | "antecedents"
  | "examen"
  | "examens_comp"
  | "scores"
  | "courbes"
  | "conclusion"
  | "conduite";

export type CrTemplateId =
  | "prevention"
  | "ic"
  | "fa"
  | "post_sca"
  | "valvulopathie"
  | "cmh"
  | "htp"
  | "controle_pm"
  | "preop";

export type CabinetHeaderConfig = {
  displayName: string;
  specialty: string;
  cabinetName: string;
  addressLine: string;
  /** Affichés au choix — jamais présentés comme vérifiés. */
  showDegrees: boolean;
  degrees: string[];
  showRppsPlaceholder: boolean;
};

export type SourceSnapshot = {
  capturedAt: string;
  encounterId: string | null;
  patientLabel: string;
  dossierNumber: string;
  birthDate: string | null;
  ageAtAct: number | null;
  actDate: string;
  motif: string | null;
  history: string | null;
  clinicalExam: Record<string, string | number | null>;
  ecg: Record<string, string | number | null>;
  echo: Record<string, string | number | null>;
  labs: Record<string, string | number | null>;
  scores: { label: string; value: string; ruleVersion: string }[];
  conclusion: string | null;
  conduite: string | null;
};

export function emptyTipDoc(): TipDoc {
  return { type: "doc", content: [] };
}

export function para(text: string): TipParagraph {
  if (!text) return { type: "paragraph", content: [] };
  return { type: "paragraph", content: [{ type: "text", text }] };
}

export function heading(level: 1 | 2 | 3, text: string): TipHeading {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}
