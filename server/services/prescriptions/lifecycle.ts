import { uuidv7 } from "uuidv7";
import type { PrescriptionLine } from "@/types/domain";
import type { RxRecord } from "@/lib/prescriptions/record";
import { linesFromTemplate, type RxTemplateId } from "@/lib/prescriptions/templates";
import { withTenantDb } from "@/server/db/tenant-db";
import {
  createPrescriptionRecord,
  fetchPrescriptionByEncounter,
  fetchPrescriptionRecord,
  persistPrescriptionRecord,
} from "./repository";
import { isMemoryTestTenant, prescriptionMemoryStore } from "./memory";
import { getEncounterById } from "@/server/consultation/service";

async function loadRx(tenantId: string, id: string): Promise<RxRecord | null> {
  if (isMemoryTestTenant(tenantId)) {
    return prescriptionMemoryStore.get(tenantId, id);
  }
  return withTenantDb(tenantId, (db) => fetchPrescriptionRecord(db, id));
}

async function saveRx(tenantId: string, rx: RxRecord, actorId: string): Promise<RxRecord> {
  if (isMemoryTestTenant(tenantId)) {
    return prescriptionMemoryStore.save(tenantId, rx);
  }
  await withTenantDb(tenantId, (db) => persistPrescriptionRecord(db, rx, actorId));
  return rx;
}

export async function getPrescription(tenantId: string, id: string) {
  return loadRx(tenantId, id);
}

/** Lecture seule — ne crée pas de brouillon (complétude stepper). */
export async function findPrescriptionForEncounter(
  tenantId: string,
  encounterId: string,
): Promise<RxRecord | null> {
  if (isMemoryTestTenant(tenantId)) {
    return prescriptionMemoryStore.findByEncounter(tenantId, encounterId) ?? null;
  }
  return withTenantDb(tenantId, (db) => fetchPrescriptionByEncounter(db, encounterId));
}

/** Ouvre l’ordonnance liée à une consultation, ou en crée un brouillon vide. */
export async function getOrCreatePrescriptionForEncounter(
  tenantId: string,
  encounterId: string,
  actorId: string,
): Promise<{ ok: true; rx: RxRecord } | { ok: false; error: string }> {
  if (isMemoryTestTenant(tenantId)) {
    const existing = prescriptionMemoryStore.findByEncounter(tenantId, encounterId);
    if (existing) return { ok: true, rx: existing };
  } else {
    const existing = await withTenantDb(tenantId, (db) =>
      fetchPrescriptionByEncounter(db, encounterId),
    );
    if (existing) return { ok: true, rx: existing };
  }

  const encounter = await getEncounterById(tenantId, encounterId);
  if (!encounter) return { ok: false, error: "Consultation introuvable" };

  const payload: Omit<RxRecord, "id" | "updatedAt"> = {
    patientId: encounter.patientId,
    encounterId,
    status: "brouillon",
    lines: [],
    aldLayout: false,
    allergiesCheckedAt: null,
    dfgCheckedAt: null,
    pregnancyNotedAt: null,
    validatedAt: null,
    validatedBy: null,
    duplicatedFromId: null,
  };

  if (isMemoryTestTenant(tenantId)) {
    const rx = prescriptionMemoryStore.create(tenantId, payload);
    return { ok: true, rx };
  }

  const rx = await withTenantDb(tenantId, (db) => createPrescriptionRecord(db, payload, actorId));
  return { ok: true, rx };
}

export async function saveLines(
  tenantId: string,
  id: string,
  lines: PrescriptionLine[],
  aldLayout: boolean,
  actorId: string,
): Promise<{ ok: true; rx: RxRecord } | { ok: false; error: string }> {
  const rx = await loadRx(tenantId, id);
  if (!rx) return { ok: false, error: "Ordonnance introuvable" };
  if (rx.status !== "brouillon") {
    return { ok: false, error: "Ordonnance validée non modifiable" };
  }
  rx.lines = structuredClone(lines);
  rx.aldLayout = aldLayout;
  rx.updatedAt = new Date().toISOString();
  await saveRx(tenantId, rx, actorId);
  return { ok: true, rx };
}

export async function applyTemplate(
  tenantId: string,
  id: string,
  templateId: RxTemplateId,
  actorId: string,
): Promise<{ ok: true; rx: RxRecord } | { ok: false; error: string }> {
  const rx = await loadRx(tenantId, id);
  if (!rx) return { ok: false, error: "Ordonnance introuvable" };
  if (rx.status !== "brouillon") {
    return { ok: false, error: "Ordonnance validée non modifiable" };
  }
  const inserted = linesFromTemplate(templateId);
  rx.lines = [...rx.lines, ...inserted];
  rx.updatedAt = new Date().toISOString();
  await saveRx(tenantId, rx, actorId);
  return { ok: true, rx };
}

/**
 * Validation — step-up vérifié côté action.
 * Ordonnance devient immuable.
 */
export async function validatePrescription(
  tenantId: string,
  id: string,
  actorId: string,
  opts: { stepUpValid: boolean },
): Promise<{ ok: true; rx: RxRecord } | { ok: false; error: string; code?: string }> {
  if (!opts.stepUpValid) {
    return {
      ok: false,
      error: "Ré-authentification (step-up) requise pour valider",
      code: "step_up_required",
    };
  }
  const rx = await loadRx(tenantId, id);
  if (!rx) return { ok: false, error: "Ordonnance introuvable" };
  if (rx.status !== "brouillon") {
    return { ok: false, error: "Ordonnance déjà validée" };
  }
  if (rx.lines.length === 0) {
    return { ok: false, error: "Au moins une ligne est requise" };
  }
  rx.status = "valide";
  rx.validatedAt = new Date().toISOString();
  rx.validatedBy = actorId;
  rx.allergiesCheckedAt = new Date().toISOString();
  rx.dfgCheckedAt = new Date().toISOString();
  rx.updatedAt = new Date().toISOString();
  await saveRx(tenantId, rx, actorId);
  return { ok: true, rx };
}

/** Duplication contrôlée → nouveau brouillon. */
export async function duplicatePrescription(
  tenantId: string,
  id: string,
  actorId: string,
): Promise<{ ok: true; rx: RxRecord } | { ok: false; error: string }> {
  const src = await loadRx(tenantId, id);
  if (!src) return { ok: false, error: "Ordonnance introuvable" };
  const copyPayload: Omit<RxRecord, "id" | "updatedAt"> = {
    patientId: src.patientId,
    encounterId: src.encounterId,
    status: "brouillon",
    lines: structuredClone(src.lines).map((l) => ({ ...l, id: uuidv7() })),
    aldLayout: src.aldLayout,
    allergiesCheckedAt: null,
    dfgCheckedAt: null,
    pregnancyNotedAt: null,
    validatedAt: null,
    validatedBy: null,
    duplicatedFromId: src.id,
  };
  if (isMemoryTestTenant(tenantId)) {
    const copy = prescriptionMemoryStore.create(tenantId, copyPayload);
    return { ok: true, rx: copy };
  }
  const copy = await withTenantDb(tenantId, (db) =>
    createPrescriptionRecord(db, copyPayload, actorId),
  );
  return { ok: true, rx: copy };
}

export { prescriptionMemoryStore, isMemoryTestTenant };
