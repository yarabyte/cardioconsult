import type { DocumentStatus } from "@/types/domain";
import type {
  CrTemplateId,
  DocumentSectionId,
  SourceSnapshot,
  TipDoc,
} from "@/lib/documents/tiptap-types";

export type DocVersionRecord = {
  id: string;
  version: number;
  status: DocumentStatus;
  content: TipDoc;
  createdAt: string;
  createdBy: string;
  reason: string | null;
};

export type DocRecord = {
  id: string;
  patientId: string;
  encounterId: string | null;
  title: string;
  status: DocumentStatus;
  version: number;
  templateId: CrTemplateId;
  sections: DocumentSectionId[];
  sourceSnapshot: SourceSnapshot | null;
  generated: TipDoc;
  edited: TipDoc;
  sourceModified: boolean;
  physicianEditPreserved: boolean;
  signedAt: string | null;
  signedBy: string | null;
  updatedAt: string;
  versions: DocVersionRecord[];
};

export type DocumentWorkflowPayload = {
  templateId: CrTemplateId;
  sections: DocumentSectionId[];
  generated: TipDoc;
  edited: TipDoc;
  sourceModified: boolean;
  physicianEditPreserved: boolean;
};

export type DocumentVersionPayload = {
  content: TipDoc;
};

export function emptyWorkflowPayload(templateId: CrTemplateId = "ic"): DocumentWorkflowPayload {
  const empty: TipDoc = { type: "doc", content: [] };
  return {
    templateId,
    sections: [],
    generated: structuredClone(empty),
    edited: structuredClone(empty),
    sourceModified: false,
    physicianEditPreserved: true,
  };
}
