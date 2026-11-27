import { uuidv7 } from "uuidv7";
import type { DocumentStatus } from "@/types/domain";
import { generateDraftFromSnapshot } from "@/lib/documents/generate";
import { snapshotFromDraft } from "@/lib/documents/snapshot-from-draft";
import type {
  CrTemplateId,
  DocumentSectionId,
  SourceSnapshot,
  TipDoc,
} from "@/lib/documents/tiptap-types";
import { CR_TEMPLATES } from "@/lib/documents/templates";
import type { DocRecord } from "@/lib/documents/record";
import { getSignatureProvider } from "@/server/signature/provider";
import { ensureEncounterDraft, getEncounterById } from "@/server/consultation/service";
import { getPatientForTenant } from "@/server/services/patients/service";
import { withTenantDb } from "@/server/db/tenant-db";
import {
  fetchCompteRenduByEncounter,
  fetchDocumentRecord,
  fetchDocumentsToValidate,
  insertDocumentRecord,
  insertDocumentVersion,
  persistDocumentRecord,
} from "./repository";
import { documentMemoryStore, isMemoryTestTenant } from "./memory";

const IMMUTABLE: DocumentStatus[] = ["valide", "signe"];

async function loadDoc(tenantId: string, id: string): Promise<DocRecord | null> {
  if (isMemoryTestTenant(tenantId)) {
    return documentMemoryStore.get(tenantId, id);
  }
  return withTenantDb(tenantId, (db) => fetchDocumentRecord(db, id));
}

async function saveDoc(tenantId: string, doc: DocRecord, actorId: string): Promise<DocRecord> {
  if (isMemoryTestTenant(tenantId)) {
    return documentMemoryStore.save(tenantId, doc);
  }
  await withTenantDb(tenantId, async (db) => {
    await persistDocumentRecord(db, doc, actorId);
  });
  return doc;
}

async function pushVersion(
  tenantId: string,
  doc: DocRecord,
  actorId: string,
  reason: string | null,
  content: TipDoc,
): Promise<void> {
  if (isMemoryTestTenant(tenantId)) {
    doc.versions.push({
      id: uuidv7(),
      version: doc.version,
      status: doc.status,
      content: structuredClone(content),
      createdAt: new Date().toISOString(),
      createdBy: actorId,
      reason,
    });
    return;
  }
  const row = await withTenantDb(tenantId, (db) =>
    insertDocumentVersion(db, doc.id, doc.version, doc.status, content, actorId, reason),
  );
  doc.versions.push(row);
}

export async function getDocument(tenantId: string, id: string) {
  return loadDoc(tenantId, id);
}

/**
 * Ouvre le compte rendu lié à une consultation, ou en crée un brouillon
 * généré depuis le snapshot du dossier (pas d’id mock).
 */
export async function getOrCreateCompteRenduForEncounter(
  tenantId: string,
  encounterId: string,
  actorId: string,
): Promise<{ ok: true; doc: DocRecord } | { ok: false; error: string }> {
  if (isMemoryTestTenant(tenantId)) {
    const existing = documentMemoryStore.findByEncounter(tenantId, encounterId);
    if (existing) return { ok: true, doc: existing };
  } else {
    const existing = await withTenantDb(tenantId, (db) =>
      fetchCompteRenduByEncounter(db, encounterId),
    );
    if (existing) return { ok: true, doc: existing };
  }

  const encounter = await getEncounterById(tenantId, encounterId);
  if (!encounter) return { ok: false, error: "Consultation introuvable" };
  const patient = await getPatientForTenant(tenantId, encounter.patientId);
  if (!patient) return { ok: false, error: "Patient introuvable" };
  const draft = await ensureEncounterDraft(tenantId, encounterId);
  if (!draft) return { ok: false, error: "Consultation introuvable" };

  const template = CR_TEMPLATES.find((t) => t.id === "ic") ?? CR_TEMPLATES[0]!;
  const snapshot = snapshotFromDraft({
    draft,
    patient: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      dossierNumber: patient.dossierNumber,
    },
    motif: encounter.motif || null,
  });
  const generated = generateDraftFromSnapshot(snapshot, template.defaultSections);
  const now = new Date().toISOString();
  const doc: DocRecord = {
    id: uuidv7(),
    patientId: patient.id,
    encounterId,
    title: `Compte rendu — ${template.label}`,
    status: "brouillon",
    version: 1,
    templateId: template.id,
    sections: [...template.defaultSections],
    sourceSnapshot: snapshot,
    generated,
    edited: structuredClone(generated),
    sourceModified: false,
    physicianEditPreserved: true,
    signedAt: null,
    signedBy: null,
    updatedAt: now,
    versions: [],
  };

  if (isMemoryTestTenant(tenantId)) {
    documentMemoryStore.save(tenantId, doc);
    return { ok: true, doc };
  }

  await withTenantDb(tenantId, async (db) => {
    await insertDocumentRecord(db, doc, actorId, "compte_rendu");
    const ver = await insertDocumentVersion(
      db,
      doc.id,
      doc.version,
      doc.status,
      doc.edited,
      actorId,
      "génération initiale",
    );
    doc.versions.push(ver);
  });
  return { ok: true, doc };
}

export async function listDocumentsToValidate(tenantId: string) {
  if (isMemoryTestTenant(tenantId)) {
    return documentMemoryStore.listToValidate(tenantId);
  }
  return withTenantDb(tenantId, fetchDocumentsToValidate);
}

export async function updateEditedContent(
  tenantId: string,
  id: string,
  edited: TipDoc,
  actorId: string,
): Promise<{ ok: true; doc: DocRecord } | { ok: false; error: string }> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (IMMUTABLE.includes(doc.status)) {
    return { ok: false, error: "Document immuable — créer une version N+1 motivée" };
  }
  doc.edited = structuredClone(edited);
  doc.updatedAt = new Date().toISOString();
  await pushVersion(tenantId, doc, actorId, "édition médecin", doc.edited);
  await saveDoc(tenantId, doc, actorId);
  return { ok: true, doc };
}

/** Régénération non destructive : nouvelle version, édition précédente conservée. */
export async function regenerateDocument(
  tenantId: string,
  id: string,
  snapshot: SourceSnapshot,
  sections: DocumentSectionId[],
  actorId: string,
): Promise<{ ok: true; doc: DocRecord; previousEdit: TipDoc } | { ok: false; error: string }> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (doc.status === "signe") {
    return { ok: false, error: "Document signé non modifiable" };
  }
  const previousEdit = structuredClone(doc.edited);
  const generated = generateDraftFromSnapshot(snapshot, sections);
  doc.version += 1;
  doc.status = "brouillon";
  doc.sourceSnapshot = snapshot;
  doc.generated = generated;
  doc.edited = structuredClone(generated);
  doc.sourceModified = false;
  doc.physicianEditPreserved = true;
  doc.sections = sections;
  doc.updatedAt = new Date().toISOString();
  await pushVersion(tenantId, doc, actorId, "régénération depuis sources", doc.edited);
  doc.versions.push({
    id: uuidv7(),
    version: doc.version - 1,
    status: "remplace",
    content: previousEdit,
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    reason: "édition médecin avant régénération (préservée)",
  });
  await saveDoc(tenantId, doc, actorId);
  return { ok: true, doc, previousEdit };
}

export async function validateDocument(
  tenantId: string,
  id: string,
  actorId: string,
): Promise<{ ok: true; doc: DocRecord } | { ok: false; error: string }> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (doc.status !== "brouillon") {
    return { ok: false, error: "Seuls les brouillons peuvent être validés" };
  }
  doc.status = "valide";
  doc.version += 1;
  doc.updatedAt = new Date().toISOString();
  await pushVersion(tenantId, doc, actorId, "validation", doc.edited);
  await saveDoc(tenantId, doc, actorId);
  return { ok: true, doc };
}

/** Signature : NotAvailable → reste valide. Step-up exigé côté action. */
export async function signDocument(
  tenantId: string,
  id: string,
  actorId: string,
): Promise<
  | { ok: true; doc: DocRecord; signed: true }
  | { ok: false; error: string; code?: string; doc?: DocRecord }
> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (doc.status !== "valide") {
    return { ok: false, error: "Le document doit être validé avant signature" };
  }
  const provider = getSignatureProvider();
  const result = await provider.sign({
    documentId: id,
    documentVersion: doc.version,
    actorId,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      code: result.code,
      doc,
    };
  }
  doc.status = "signe";
  doc.signedAt = result.signedAt;
  doc.signedBy = actorId;
  doc.version += 1;
  doc.updatedAt = new Date().toISOString();
  await pushVersion(tenantId, doc, actorId, "signature", doc.edited);
  await saveDoc(tenantId, doc, actorId);
  return { ok: true, doc, signed: true };
}

/** Correction motivée d'un document validé/signé → nouvelle version brouillon. */
export async function amendDocument(
  tenantId: string,
  id: string,
  reason: string,
  actorId: string,
): Promise<{ ok: true; doc: DocRecord } | { ok: false; error: string }> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (!reason.trim()) return { ok: false, error: "Motif obligatoire" };
  if (doc.status !== "valide" && doc.status !== "signe") {
    return { ok: false, error: "Amendement réservé aux documents validés ou signés" };
  }
  doc.status = "brouillon";
  doc.version += 1;
  doc.signedAt = null;
  doc.signedBy = null;
  doc.updatedAt = new Date().toISOString();
  await pushVersion(tenantId, doc, actorId, reason.trim(), doc.edited);
  await saveDoc(tenantId, doc, actorId);
  return { ok: true, doc };
}

export async function setTemplate(
  tenantId: string,
  id: string,
  templateId: CrTemplateId,
  sections: DocumentSectionId[],
): Promise<{ ok: true; doc: DocRecord } | { ok: false; error: string }> {
  const doc = await loadDoc(tenantId, id);
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (IMMUTABLE.includes(doc.status)) {
    return { ok: false, error: "Document immuable" };
  }
  if (!CR_TEMPLATES.some((t) => t.id === templateId)) {
    return { ok: false, error: "Modèle inconnu" };
  }
  doc.templateId = templateId;
  doc.sections = sections;
  await saveDoc(tenantId, doc, "system");
  return { ok: true, doc };
}

export async function markSourceModified(tenantId: string, id: string) {
  const doc = await loadDoc(tenantId, id);
  if (!doc || doc.status === "signe") return;
  doc.sourceModified = true;
  await saveDoc(tenantId, doc, "system");
}

export { documentMemoryStore, isMemoryTestTenant };
