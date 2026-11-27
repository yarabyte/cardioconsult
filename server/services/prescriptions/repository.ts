import { asc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { prescriptionLines, prescriptions, settings } from "@/db/tenant/schema";
import type { PrescriptionLine } from "@/types/domain";
import {
  emptyLineExtras,
  parsePrescriptionLineExtras,
  type PrescriptionLineExtras,
} from "@/lib/prescriptions/format-line";
import {
  defaultPrescriptionMeta,
  type PrescriptionMeta,
  type RxRecord,
} from "@/lib/prescriptions/record";
import type { TenantDb } from "@/server/db/tenant-db";

const metaKey = (id: string) => `prescription_meta:${id}`;

function linePayload(line: PrescriptionLine): PrescriptionLineExtras {
  return {
    dosage: line.dosage ?? null,
    form: line.form ?? null,
    route: line.route ?? null,
    frequency: line.frequency ?? null,
    duration: line.duration ?? null,
    quantity: line.quantity ?? null,
    renewals: line.renewals ?? null,
    remarks: line.remarks ?? null,
    ald: line.ald ?? false,
  };
}

function mapLine(row: typeof prescriptionLines.$inferSelect): PrescriptionLine {
  const extra = parsePrescriptionLineExtras(row.duration) ?? emptyLineExtras();
  return {
    id: row.id,
    drug: row.drugEnc || row.dci || "",
    dci: row.dci,
    dosage: extra.dosage ?? null,
    form: extra.form,
    posology: row.posologyEnc || "",
    route: extra.route,
    frequency: extra.frequency,
    duration: extra.duration ?? "",
    quantity: extra.quantity,
    renewals: extra.renewals,
    remarks: extra.remarks,
    ald: extra.ald,
  };
}

async function loadMeta(db: TenantDb, id: string): Promise<PrescriptionMeta> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, metaKey(id)))
    .limit(1);
  if (!row?.value || typeof row.value !== "object") return defaultPrescriptionMeta();
  const v = row.value as Partial<PrescriptionMeta>;
  return {
    aldLayout: Boolean(v.aldLayout),
    duplicatedFromId: v.duplicatedFromId ?? null,
    pregnancyNotedAt: v.pregnancyNotedAt ?? null,
  };
}

async function saveMeta(db: TenantDb, id: string, meta: PrescriptionMeta, actorId: string) {
  await db
    .insert(settings)
    .values({
      key: metaKey(id),
      value: meta,
      updatedAt: new Date(),
      updatedBy: actorId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: meta, updatedAt: new Date(), updatedBy: actorId },
    });
}

export async function fetchPrescriptionByEncounter(
  db: TenantDb,
  encounterId: string,
): Promise<RxRecord | null> {
  const [row] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.encounterId, encounterId))
    .limit(1);
  if (!row) return null;
  return fetchPrescriptionRecord(db, row.id);
}

export async function fetchPrescriptionRecord(db: TenantDb, id: string): Promise<RxRecord | null> {
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) return null;
  const lineRows = await db
    .select()
    .from(prescriptionLines)
    .where(eq(prescriptionLines.prescriptionId, id))
    .orderBy(asc(prescriptionLines.sortOrder));
  const meta = await loadMeta(db, id);
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    status: row.status,
    lines: lineRows.map(mapLine),
    aldLayout: meta.aldLayout,
    allergiesCheckedAt: row.allergiesCheckedAt?.toISOString() ?? null,
    dfgCheckedAt: row.dfgCheckedAt?.toISOString() ?? null,
    pregnancyNotedAt: meta.pregnancyNotedAt,
    updatedAt: row.updatedAt.toISOString(),
    validatedAt: row.validatedAt?.toISOString() ?? null,
    validatedBy: row.validatedBy,
    duplicatedFromId: meta.duplicatedFromId,
  };
}

export async function persistPrescriptionLines(
  db: TenantDb,
  prescriptionId: string,
  lines: PrescriptionLine[],
  actorId: string,
) {
  await db.delete(prescriptionLines).where(eq(prescriptionLines.prescriptionId, prescriptionId));
  let order = 0;
  for (const line of lines) {
    await db.insert(prescriptionLines).values({
      id: line.id || uuidv7(),
      prescriptionId,
      drugEnc: line.drug,
      dci: line.dci ?? line.drug,
      posologyEnc: line.posology,
      duration: JSON.stringify(linePayload(line)),
      sortOrder: order++,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }
}

export async function persistPrescriptionRecord(
  db: TenantDb,
  rx: RxRecord,
  actorId: string,
): Promise<void> {
  await db
    .update(prescriptions)
    .set({
      status: rx.status,
      allergiesCheckedAt: rx.allergiesCheckedAt ? new Date(rx.allergiesCheckedAt) : null,
      dfgCheckedAt: rx.dfgCheckedAt ? new Date(rx.dfgCheckedAt) : null,
      validatedAt: rx.validatedAt ? new Date(rx.validatedAt) : null,
      validatedBy: rx.validatedBy ?? null,
      updatedAt: new Date(rx.updatedAt),
      updatedBy: actorId,
    })
    .where(eq(prescriptions.id, rx.id));
  await saveMeta(
    db,
    rx.id,
    {
      aldLayout: rx.aldLayout,
      duplicatedFromId: rx.duplicatedFromId ?? null,
      pregnancyNotedAt: rx.pregnancyNotedAt ?? null,
    },
    actorId,
  );
  if (rx.status === "brouillon") {
    await persistPrescriptionLines(db, rx.id, rx.lines, actorId);
  }
}

export async function createPrescriptionRecord(
  db: TenantDb,
  partial: Omit<RxRecord, "id" | "updatedAt"> & { id?: string },
  actorId: string,
): Promise<RxRecord> {
  const id = partial.id ?? uuidv7();
  const now = new Date();
  await db.insert(prescriptions).values({
    id,
    patientId: partial.patientId,
    encounterId: partial.encounterId ?? null,
    status: partial.status,
    allergiesCheckedAt: partial.allergiesCheckedAt ? new Date(partial.allergiesCheckedAt) : null,
    dfgCheckedAt: partial.dfgCheckedAt ? new Date(partial.dfgCheckedAt) : null,
    validatedAt: partial.validatedAt ? new Date(partial.validatedAt) : null,
    validatedBy: partial.validatedBy ?? null,
    createdBy: actorId,
    updatedBy: actorId,
    updatedAt: now,
  });
  const rx: RxRecord = {
    ...partial,
    id,
    updatedAt: now.toISOString(),
    lines: structuredClone(partial.lines),
  };
  await saveMeta(
    db,
    id,
    {
      aldLayout: partial.aldLayout,
      duplicatedFromId: partial.duplicatedFromId ?? null,
      pregnancyNotedAt: partial.pregnancyNotedAt ?? null,
    },
    actorId,
  );
  await persistPrescriptionLines(db, id, rx.lines, actorId);
  return rx;
}
