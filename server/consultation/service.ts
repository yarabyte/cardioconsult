import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  emptyDraftData,
  type EncounterDraft,
  type EncounterDraftData,
} from "@/lib/consultation/draft-types";
import { encounters, patients, settings } from "@/db/tenant/schema";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";
import type { Encounter } from "@/types/domain";

const draftKey = (encounterId: string) => `encounter_draft:${encounterId}`;
const rubricKey = (encounterId: string) => `encounter_rubric:${encounterId}`;

function workspaceHref(encounterId: string, rubric?: string | null): string {
  const slug = rubric?.trim() ? rubric.trim() : "identite";
  return `/consultations/${encounterId}/${slug}`;
}

export type OpenEncounterSummary = {
  id: string;
  patientId: string;
  datedAt: string;
  rubric: string;
  version: number;
  href: string;
};

function mapEncounterRow(row: typeof encounters.$inferSelect, rubric: string | null): Encounter {
  return {
    id: row.id,
    patientId: row.patientId,
    stayId: row.stayId,
    datedAt: row.datedAt.toISOString(),
    motif: row.motifEnc ?? "",
    type: row.type ?? "",
    status: (row.status ?? "a_venir") as Encounter["status"],
    authorId: row.authorId,
    historySummary: row.historySummaryEnc,
    antecedentsText: row.antecedentsTextEnc,
    treatmentsText: row.treatmentsTextEnc,
    rubric: rubric ?? undefined,
    version: row.version,
  };
}

function draftStatusFromEncounter(status: string | null): EncounterDraft["status"] {
  if (status === "termine" || status === "cloturee") return "cloturee";
  return "brouillon";
}

/** Statut DB verrouillé (plus de modification de brouillon). */
export function isEncounterClosedStatus(status: string | null | undefined): boolean {
  return draftStatusFromEncounter(status ?? null) === "cloturee";
}

function normalizeDraftData(raw: EncounterDraftData): EncounterDraftData {
  const base = emptyDraftData();
  return {
    ...base,
    ...raw,
    clinicalExam: raw.clinicalExam
      ? { ...base.clinicalExam, ...raw.clinicalExam }
      : base.clinicalExam,
    echo: raw.echo ? { ...base.echo, ...raw.echo } : base.echo,
    ecg: raw.ecg ? { ...base.ecg, ...raw.ecg } : base.ecg,
    aorta: raw.aorta ?? base.aorta,
    effort: raw.effort ? { ...base.effort, ...raw.effort } : base.effort,
    coronaires: raw.coronaires ? { ...base.coronaires, ...raw.coronaires } : base.coronaires,
    rythmologie: raw.rythmologie ? { ...base.rythmologie, ...raw.rythmologie } : base.rythmologie,
    imagerie: raw.imagerie ? { ...base.imagerie, ...raw.imagerie } : base.imagerie,
    labs: raw.labs ?? base.labs,
    riskFactors: raw.riskFactors ? { ...base.riskFactors, ...raw.riskFactors } : base.riskFactors,
    antecedents: raw.antecedents ?? base.antecedents,
    treatments: raw.treatments ?? base.treatments,
    allergies: raw.allergies ?? base.allergies,
    synthesis: raw.synthesis ?? null,
    transmissions: raw.transmissions ?? null,
    examOrders: raw.examOrders
      ? { ...base.examOrders, ...raw.examOrders, selected: raw.examOrders.selected ?? [] }
      : base.examOrders,
  };
}

async function loadDraftPayload(
  db: TenantDb,
  encounterId: string,
): Promise<EncounterDraftData | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, draftKey(encounterId)))
    .limit(1);
  if (!row?.value || typeof row.value !== "object") return null;
  return normalizeDraftData(row.value as EncounterDraftData);
}

async function loadRubric(db: TenantDb, encounterId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, rubricKey(encounterId)))
    .limit(1);
  if (!row?.value || typeof row.value !== "string") return null;
  return row.value;
}

export function mergeDraftData(
  base: EncounterDraftData,
  patch: Partial<EncounterDraftData>,
): EncounterDraftData {
  return {
    ...base,
    ...patch,
    clinicalExam: patch.clinicalExam
      ? { ...base.clinicalExam, ...patch.clinicalExam }
      : base.clinicalExam,
    echo: patch.echo ? { ...base.echo, ...patch.echo } : base.echo,
    ecg: patch.ecg ? { ...base.ecg, ...patch.ecg } : base.ecg,
    aorta: patch.aorta ? { ...base.aorta, ...patch.aorta } : base.aorta,
    effort: patch.effort ? { ...base.effort, ...patch.effort } : base.effort,
    coronaires: patch.coronaires ? { ...base.coronaires, ...patch.coronaires } : base.coronaires,
    rythmologie: patch.rythmologie
      ? { ...base.rythmologie, ...patch.rythmologie }
      : base.rythmologie,
    imagerie: patch.imagerie ? { ...base.imagerie, ...patch.imagerie } : base.imagerie,
    labs: patch.labs ?? base.labs,
    riskFactors: patch.riskFactors
      ? { ...base.riskFactors, ...patch.riskFactors }
      : base.riskFactors,
    examOrders: patch.examOrders
      ? {
          ...base.examOrders,
          ...patch.examOrders,
          selected: patch.examOrders.selected ?? base.examOrders.selected,
        }
      : base.examOrders,
  };
}

export async function getEncounterById(
  tenantId: string,
  encounterId: string,
): Promise<Encounter | null> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (!row) return null;
    const rubric = await loadRubric(db, encounterId);
    return mapEncounterRow(row, rubric);
  });
}

export async function listOpenEncountersForPatient(
  tenantId: string,
  patientId: string,
): Promise<OpenEncounterSummary[]> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(encounters)
      .where(and(eq(encounters.patientId, patientId), eq(encounters.status, "en_cours")))
      .orderBy(desc(encounters.datedAt));
    const out: OpenEncounterSummary[] = [];
    for (const row of rows) {
      const rubric = (await loadRubric(db, row.id)) ?? "identite";
      out.push({
        id: row.id,
        patientId: row.patientId,
        datedAt: row.datedAt.toISOString(),
        rubric,
        version: row.version,
        href: workspaceHref(row.id, rubric),
      });
    }
    return out;
  });
}

export async function getLatestOpenEncounterForPatient(
  tenantId: string,
  patientId: string,
): Promise<OpenEncounterSummary | null> {
  const list = await listOpenEncountersForPatient(tenantId, patientId);
  return list[0] ?? null;
}

/** Dernière consultation du patient (ouverte ou clôturée) — accès ordonnance / CR. */
export async function getLatestEncounterForPatient(
  tenantId: string,
  patientId: string,
): Promise<OpenEncounterSummary | null> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.datedAt))
      .limit(1);
    if (!row) return null;
    const rubric = (await loadRubric(db, row.id)) ?? "identite";
    return {
      id: row.id,
      patientId: row.patientId,
      datedAt: row.datedAt.toISOString(),
      rubric,
      version: row.version,
      href: workspaceHref(row.id, rubric),
    };
  });
}

/** Mémorise la rubrique courante pour reprise ultérieure. */
export async function setEncounterRubric(
  tenantId: string,
  encounterId: string,
  rubric: string,
  actorId: string,
): Promise<void> {
  const slug = rubric.trim() || "identite";
  await withTenantDb(tenantId, async (db) => {
    const now = new Date();
    await db
      .insert(settings)
      .values({
        key: rubricKey(encounterId),
        value: slug,
        updatedAt: now,
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: slug, updatedAt: now, updatedBy: actorId },
      });
  });
}

/** Crée une consultation (encounter + brouillon vide) pour un patient du tenant. */
export async function createEncounter(
  tenantId: string,
  patientId: string,
  authorId: string,
  opts?: { type?: string; motif?: string | null },
): Promise<{ ok: true; encounterId: string } | { ok: false; code: "patient_not_found" }> {
  return withTenantDb(tenantId, async (db) => {
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (!patient || patient.archivedAt) return { ok: false, code: "patient_not_found" };

    const id = uuidv7();
    const now = new Date();
    await db.insert(encounters).values({
      id,
      patientId,
      datedAt: now,
      motifEnc: opts?.motif ?? null,
      type: opts?.type ?? "consultation",
      status: "en_cours",
      authorId,
      createdAt: now,
      createdBy: authorId,
      updatedAt: now,
      updatedBy: authorId,
      version: 1,
    });

    const data = emptyDraftData();
    await db.insert(settings).values({
      key: draftKey(id),
      value: data,
      updatedAt: now,
      updatedBy: authorId,
    });
    await db.insert(settings).values({
      key: rubricKey(id),
      value: "identite",
      updatedAt: now,
      updatedBy: authorId,
    });

    return { ok: true, encounterId: id };
  });
}

export async function ensureEncounterDraft(
  tenantId: string,
  encounterId: string,
): Promise<EncounterDraft | null> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (!row) return null;

    const existing = await loadDraftPayload(db, encounterId);
    const data = existing ?? emptyDraftData();
    if (!existing) {
      await db
        .insert(settings)
        .values({
          key: draftKey(encounterId),
          value: data,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: data, updatedAt: new Date() },
        });
    }

    return {
      encounterId,
      patientId: row.patientId,
      status: draftStatusFromEncounter(row.status),
      actDate: row.datedAt.toISOString(),
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      data,
    };
  });
}

export async function saveEncounterDraft(
  tenantId: string,
  encounterId: string,
  expectedVersion: number,
  patch: Partial<EncounterDraftData>,
  actorId: string,
): Promise<
  | { ok: true; draft: EncounterDraft }
  | { ok: false; code: "conflict"; draft: EncounterDraft }
  | { ok: false; code: "not_found" }
  | { ok: false; code: "closed" }
> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (!row) return { ok: false, code: "not_found" };
    if (draftStatusFromEncounter(row.status) === "cloturee") {
      return { ok: false, code: "closed" };
    }
    if (row.version !== expectedVersion) {
      const data = (await loadDraftPayload(db, encounterId)) ?? emptyDraftData();
      return {
        ok: false,
        code: "conflict",
        draft: {
          encounterId,
          patientId: row.patientId,
          status: draftStatusFromEncounter(row.status),
          actDate: row.datedAt.toISOString(),
          version: row.version,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
          data,
        },
      };
    }

    const base = (await loadDraftPayload(db, encounterId)) ?? emptyDraftData();
    const data = mergeDraftData(base, patch);
    const now = new Date();
    const nextVersion = row.version + 1;

    await db
      .insert(settings)
      .values({
        key: draftKey(encounterId),
        value: data,
        updatedAt: now,
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: data, updatedAt: now, updatedBy: actorId },
      });

    const encounterPatch: Partial<typeof encounters.$inferInsert> = {
      version: nextVersion,
      updatedAt: now,
      updatedBy: actorId,
    };
    if (patch.motif !== undefined) encounterPatch.motifEnc = patch.motif;
    if (patch.history !== undefined) encounterPatch.historySummaryEnc = patch.history;
    if (patch.antecedents !== undefined && patch.antecedents.length > 0) {
      encounterPatch.antecedentsTextEnc = JSON.stringify(patch.antecedents);
    }
    if (patch.treatments !== undefined && patch.treatments.length > 0) {
      encounterPatch.treatmentsTextEnc = JSON.stringify(patch.treatments);
    }

    await db.update(encounters).set(encounterPatch).where(eq(encounters.id, encounterId));

    const draft: EncounterDraft = {
      encounterId,
      patientId: row.patientId,
      status: "brouillon",
      actDate: row.datedAt.toISOString(),
      version: nextVersion,
      updatedAt: now.toISOString(),
      updatedBy: actorId,
      data,
    };
    return { ok: true, draft };
  });
}

export async function closeEncounter(
  tenantId: string,
  encounterId: string,
  expectedVersion: number,
  actorId: string,
): Promise<
  | { ok: true; draft: EncounterDraft }
  | { ok: false; code: "conflict"; draft: EncounterDraft }
  | { ok: false; code: "not_found" }
> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (!row) return { ok: false, code: "not_found" };
    if (row.version !== expectedVersion) {
      const data = (await loadDraftPayload(db, encounterId)) ?? emptyDraftData();
      return {
        ok: false,
        code: "conflict",
        draft: {
          encounterId,
          patientId: row.patientId,
          status: draftStatusFromEncounter(row.status),
          actDate: row.datedAt.toISOString(),
          version: row.version,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
          data,
        },
      };
    }
    const now = new Date();
    const nextVersion = row.version + 1;
    await db
      .update(encounters)
      .set({
        status: "termine",
        version: nextVersion,
        updatedAt: now,
        updatedBy: actorId,
      })
      .where(eq(encounters.id, encounterId));
    const data = (await loadDraftPayload(db, encounterId)) ?? emptyDraftData();
    const draft: EncounterDraft = {
      encounterId,
      patientId: row.patientId,
      status: "cloturee",
      actDate: row.datedAt.toISOString(),
      version: nextVersion,
      updatedAt: now.toISOString(),
      updatedBy: actorId,
      data,
    };
    return { ok: true, draft };
  });
}
