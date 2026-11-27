import { and, asc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { documentVersions, documents } from "@/db/tenant/schema";
import type { DocumentStatus } from "@/types/domain";
import type { SourceSnapshot, TipDoc } from "@/lib/documents/tiptap-types";
import type {
  DocRecord,
  DocVersionRecord,
  DocumentVersionPayload,
  DocumentWorkflowPayload,
} from "@/lib/documents/record";
import type { TenantDb } from "@/server/db/tenant-db";

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function workflowFromRow(contentEnc: string | null): DocumentWorkflowPayload | null {
  return parseJson<DocumentWorkflowPayload>(contentEnc);
}

export function mapVersions(rows: (typeof documentVersions.$inferSelect)[]): DocVersionRecord[] {
  return rows.map((v) => {
    const payload = parseJson<DocumentVersionPayload>(v.contentEnc);
    const content: TipDoc = payload?.content ?? { type: "doc", content: [] };
    return {
      id: v.id,
      version: v.version,
      status: v.status,
      content,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy ?? "",
      reason: v.reason,
    };
  });
}

export function rowToDocRecord(
  row: typeof documents.$inferSelect,
  versionRows: (typeof documentVersions.$inferSelect)[],
): DocRecord | null {
  const workflow = workflowFromRow(row.contentEnc);
  if (!workflow) return null;
  const snapshot = (row.sourceSnapshot as SourceSnapshot | null) ?? null;
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    title: row.title,
    status: row.status,
    version: row.docVersion,
    templateId: workflow.templateId,
    sections: workflow.sections,
    sourceSnapshot: snapshot,
    generated: workflow.generated,
    edited: workflow.edited,
    sourceModified: workflow.sourceModified,
    physicianEditPreserved: workflow.physicianEditPreserved,
    signedAt: row.signedAt?.toISOString() ?? null,
    signedBy: row.signedBy,
    updatedAt: row.updatedAt.toISOString(),
    versions: mapVersions(versionRows),
  };
}

export async function fetchDocumentRecord(db: TenantDb, id: string): Promise<DocRecord | null> {
  const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!row) return null;
  const versionRows = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(asc(documentVersions.version));
  return rowToDocRecord(row, versionRows);
}

export async function fetchCompteRenduByEncounter(
  db: TenantDb,
  encounterId: string,
): Promise<DocRecord | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.encounterId, encounterId), eq(documents.kind, "compte_rendu")))
    .limit(1);
  if (!row) return null;
  const versionRows = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, row.id))
    .orderBy(asc(documentVersions.version));
  return rowToDocRecord(row, versionRows);
}

export async function insertDocumentRecord(
  db: TenantDb,
  doc: DocRecord,
  actorId: string,
  kind: "compte_rendu" | "ordonnance" | "courrier" | "autre" = "compte_rendu",
): Promise<void> {
  const workflow: DocumentWorkflowPayload = {
    templateId: doc.templateId,
    sections: doc.sections,
    generated: doc.generated,
    edited: doc.edited,
    sourceModified: doc.sourceModified,
    physicianEditPreserved: doc.physicianEditPreserved,
  };
  const now = new Date(doc.updatedAt);
  await db.insert(documents).values({
    id: doc.id,
    patientId: doc.patientId,
    encounterId: doc.encounterId,
    kind,
    title: doc.title,
    status: doc.status,
    docVersion: doc.version,
    contentEnc: JSON.stringify(workflow),
    sourceSnapshot: doc.sourceSnapshot as Record<string, unknown> | null,
    signedAt: doc.signedAt ? new Date(doc.signedAt) : null,
    signedBy: doc.signedBy,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
  });
}

export async function fetchDocumentsToValidate(db: TenantDb): Promise<DocRecord[]> {
  const rows = await db.select().from(documents).where(eq(documents.status, "brouillon"));
  const out: DocRecord[] = [];
  for (const row of rows) {
    const versionRows = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, row.id))
      .orderBy(asc(documentVersions.version));
    const rec = rowToDocRecord(row, versionRows);
    if (rec) out.push(rec);
  }
  return out;
}

export async function persistDocumentRecord(
  db: TenantDb,
  doc: DocRecord,
  actorId: string,
): Promise<void> {
  const workflow: DocumentWorkflowPayload = {
    templateId: doc.templateId,
    sections: doc.sections,
    generated: doc.generated,
    edited: doc.edited,
    sourceModified: doc.sourceModified,
    physicianEditPreserved: doc.physicianEditPreserved,
  };
  await db
    .update(documents)
    .set({
      status: doc.status,
      docVersion: doc.version,
      contentEnc: JSON.stringify(workflow),
      sourceSnapshot: doc.sourceSnapshot as Record<string, unknown> | null,
      signedAt: doc.signedAt ? new Date(doc.signedAt) : null,
      signedBy: doc.signedBy,
      updatedAt: new Date(doc.updatedAt),
      updatedBy: actorId,
    })
    .where(eq(documents.id, doc.id));
}

export async function insertDocumentVersion(
  db: TenantDb,
  documentId: string,
  version: number,
  status: DocumentStatus,
  content: TipDoc,
  actorId: string,
  reason: string | null,
  createdAt = new Date(),
): Promise<DocVersionRecord> {
  const id = uuidv7();
  const payload: DocumentVersionPayload = { content: structuredClone(content) };
  await db.insert(documentVersions).values({
    id,
    documentId,
    version,
    status,
    contentEnc: JSON.stringify(payload),
    reason,
    createdAt,
    createdBy: actorId,
  });
  return {
    id,
    version,
    status,
    content: structuredClone(content),
    createdAt: createdAt.toISOString(),
    createdBy: actorId,
    reason,
  };
}
