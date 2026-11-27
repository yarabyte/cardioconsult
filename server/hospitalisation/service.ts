import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  nursingNotes,
  patientIdentityEnc,
  patients,
  settings,
  stays,
  vitals,
} from "@/db/tenant/schema";
import {
  evaluateVitalsAlerts,
  DEFAULT_VITALS_THRESHOLDS,
} from "@/lib/hospitalisation/vitals-alerts";
import { formatDateShort } from "@/lib/format";
import type { Bed, Stay, Vitals } from "@/types/domain";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";
import type {
  BedFilter,
  FluidBalanceEntry,
  NursingStructuredNote,
  TargetedTransmission,
  VitalsMeta,
} from "@/server/hospitalisation/types";
import { HOSPITALISATION_WARD_SETTING } from "@/server/hospitalisation/types";

const VITALS_META_PREFIX = "vitals_meta:";

function vitalsMetaKey(id: string): string {
  return `${VITALS_META_PREFIX}${id}`;
}

export function parseVitalsMeta(raw: unknown): VitalsMeta {
  const base: VitalsMeta = {
    authorLabel: "",
    stayId: null,
    frPerMin: null,
    eva: null,
    alertLabels: [],
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    supersedesId: null,
  };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    authorLabel: typeof o.authorLabel === "string" ? o.authorLabel : "",
    stayId: typeof o.stayId === "string" ? o.stayId : null,
    frPerMin: typeof o.frPerMin === "number" ? o.frPerMin : null,
    eva: typeof o.eva === "number" ? o.eva : null,
    alertLabels: Array.isArray(o.alertLabels)
      ? o.alertLabels.filter((x): x is string => typeof x === "string")
      : [],
    cancelledAt: typeof o.cancelledAt === "string" ? o.cancelledAt : null,
    cancelledBy: typeof o.cancelledBy === "string" ? o.cancelledBy : null,
    cancelReason: typeof o.cancelReason === "string" ? o.cancelReason : null,
    supersedesId: typeof o.supersedesId === "string" ? o.supersedesId : null,
  };
}

function parseNursingNote(raw: string | null): NursingStructuredNote | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as NursingStructuredNote;
    if (o.kind === "fluid" || o.kind === "transmission") return o;
  } catch {
    return null;
  }
  return null;
}

function mapStayRow(row: typeof stays.$inferSelect, motif: string | null): Stay {
  const bedId = row.bedLabel ?? null;
  const room = bedId?.match(/b(\d+)/i) ? Number.parseInt(bedId.replace(/\D/g, ""), 10) : null;
  return {
    id: row.id,
    patientId: row.patientId,
    admittedAt: row.admittedAt.toISOString(),
    dischargedAt: row.dischargedAt?.toISOString() ?? null,
    plannedDischargeAt: null,
    bedId,
    room: Number.isFinite(room) ? room : null,
    motif,
    status: row.status as Stay["status"],
    referringPhysicianId: null,
    referringPhysicianLabel: null,
  };
}

function mapVitalsRow(row: typeof vitals.$inferSelect, meta: VitalsMeta): Vitals {
  const cancelledAt = meta.cancelledAt ?? (row.archivedAt ? row.archivedAt.toISOString() : null);
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    stayId: meta.stayId,
    recordedAt: row.recordedAt.toISOString(),
    authorId: row.authorId,
    authorLabel: meta.authorLabel || row.createdBy || "—",
    tasMmHg: row.tasMmHg,
    tadMmHg: row.tadMmHg,
    fcBpm: row.fcBpm,
    spo2Pct: row.spo2Pct,
    temperatureC: row.temperatureC != null ? Number(row.temperatureC) : null,
    frPerMin: meta.frPerMin,
    weightKg: row.weightKg != null ? Number(row.weightKg) : null,
    heightM: row.heightM != null ? Number(row.heightM) : null,
    eva: meta.eva,
    cancelledAt,
    cancelledBy: meta.cancelledBy,
    cancelReason: meta.cancelReason,
    supersedesId: meta.supersedesId,
    alertLabels: meta.alertLabels,
  };
}

async function loadVitalsMetaMap(db: TenantDb, ids: string[]): Promise<Map<string, VitalsMeta>> {
  if (ids.length === 0) return new Map();
  const keys = ids.map(vitalsMetaKey);
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));
  const map = new Map<string, VitalsMeta>();
  for (const row of rows) {
    const id = row.key.slice(VITALS_META_PREFIX.length);
    map.set(id, parseVitalsMeta(row.value));
  }
  return map;
}

export async function resolvePatientId(db: TenantDb, ref: string): Promise<string | null> {
  const [byId] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, ref))
    .limit(1);
  if (byId) return byId.id;
  const dossier = ref.toUpperCase();
  const [byDossier] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.dossierNumber, dossier))
    .limit(1);
  return byDossier?.id ?? null;
}

async function loadWardTemplate(db: TenantDb): Promise<Bed[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HOSPITALISATION_WARD_SETTING))
    .limit(1);
  if (row?.value && Array.isArray(row.value)) {
    return row.value as Bed[];
  }
  return [];
}

async function saveWardTemplate(db: TenantDb, beds: Bed[]): Promise<void> {
  await db
    .insert(settings)
    .values({
      key: HOSPITALISATION_WARD_SETTING,
      value: beds,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: beds, updatedAt: new Date() },
    });
}

function enrichBedFromStay(bed: Bed, stay: Stay, patientLabel: string): Bed {
  const admit = formatDateShort(stay.admittedAt);
  return {
    ...bed,
    patientId: stay.patientId,
    patientLabel,
    motif: stay.motif ?? bed.motif,
    stayId: stay.id,
    dayLabel: stay.status === "en_cours" ? `Séjour · entrée le ${admit}` : bed.dayLabel,
  };
}

export async function listBedsOnDb(db: TenantDb, filter: BedFilter = "Tous"): Promise<Bed[]> {
  const template = await loadWardTemplate(db);
  const activeStays = await db
    .select()
    .from(stays)
    .where(inArray(stays.status, ["en_cours", "sortie_prevue"]));

  const patientIds = [...new Set(activeStays.map((s) => s.patientId))];
  const identities =
    patientIds.length > 0
      ? await db
          .select()
          .from(patientIdentityEnc)
          .where(inArray(patientIdentityEnc.patientId, patientIds))
      : [];

  const labelByPatient = new Map<string, string>();
  for (const idRow of identities) {
    const initial = (idRow.firstNameEnc?.[0] ?? "?").toUpperCase();
    const last = idRow.lastNameEnc?.split(" ")[0] ?? "";
    labelByPatient.set(idRow.patientId, `${initial}. ${last}`.trim());
  }

  const stayByBed = new Map<string, (typeof activeStays)[0]>();
  for (const s of activeStays) {
    if (s.bedLabel) stayByBed.set(s.bedLabel, s);
  }

  let beds = template.map((bed) => {
    const stayRow = stayByBed.get(bed.id);
    if (!stayRow) return bed;
    const motif = stayRow.motifEnc ?? null;
    const stay = mapStayRow(stayRow, motif);
    const label = labelByPatient.get(stay.patientId) ?? bed.patientLabel;
    return enrichBedFromStay(bed, stay, label);
  });

  beds = await applyVitalsAlertsToBeds(db, beds);
  return filter === "Tous" ? beds : beds.filter((b) => b.tag === filter);
}

export async function listBeds(tenantId: string, filter: BedFilter = "Tous"): Promise<Bed[]> {
  return withTenantDb(tenantId, (db) => listBedsOnDb(db, filter));
}

async function applyVitalsAlertsToBeds(db: TenantDb, beds: Bed[]): Promise<Bed[]> {
  const patientIds = beds.map((b) => b.patientId).filter((id): id is string => Boolean(id));
  if (patientIds.length === 0) return beds;

  const vitalRows = await db
    .select()
    .from(vitals)
    .where(and(inArray(vitals.patientId, patientIds), isNull(vitals.archivedAt)))
    .orderBy(desc(vitals.recordedAt));

  const metaMap = await loadVitalsMetaMap(
    db,
    vitalRows.map((v) => v.id),
  );

  const latestByPatient = new Map<string, Vitals>();
  for (const row of vitalRows) {
    if (latestByPatient.has(row.patientId)) continue;
    const meta = metaMap.get(row.id) ?? parseVitalsMeta(null);
    if (meta.cancelledAt) continue;
    latestByPatient.set(row.patientId, mapVitalsRow(row, meta));
  }

  return beds.map((bed) => {
    if (!bed.patientId || bed.tag === "Libre") return bed;
    const latest = latestByPatient.get(bed.patientId);
    if (!latest?.alertLabels?.length) return bed;
    return {
      ...bed,
      tag: "Alerte",
      lastTransmission: latest.alertLabels[0] ?? null,
      lastTransmissionAt: latest.recordedAt,
    };
  });
}

export async function listStaysForPatientOnDb(db: TenantDb, patientRef: string): Promise<Stay[]> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) return [];
  const rows = await db
    .select()
    .from(stays)
    .where(eq(stays.patientId, patientId))
    .orderBy(desc(stays.admittedAt));
  return rows.map((r) => mapStayRow(r, r.motifEnc ?? null));
}

export async function listStaysForPatient(tenantId: string, patientRef: string): Promise<Stay[]> {
  return withTenantDb(tenantId, (db) => listStaysForPatientOnDb(db, patientRef));
}

async function listVitalsForPatientOnDb(db: TenantDb, patientRef: string): Promise<Vitals[]> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) return [];
  const rows = await db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt));
  const metaMap = await loadVitalsMetaMap(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => mapVitalsRow(r, metaMap.get(r.id) ?? parseVitalsMeta(null)));
}

export async function listActiveVitalsOnDb(db: TenantDb, patientRef: string): Promise<Vitals[]> {
  const all = await listVitalsForPatientOnDb(db, patientRef);
  return all.filter((v) => !v.cancelledAt);
}

export async function listAllVitalsOnDb(db: TenantDb, patientRef: string): Promise<Vitals[]> {
  return listVitalsForPatientOnDb(db, patientRef);
}

export async function recordVitalsOnDb(
  db: TenantDb,
  patientRef: string,
  input: Omit<Vitals, "id" | "alertLabels" | "cancelledAt">,
): Promise<Vitals> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) throw new Error("Patient introuvable");

  const alerts = evaluateVitalsAlerts(input, DEFAULT_VITALS_THRESHOLDS);
  const id = uuidv7();
  const recordedAt = new Date(input.recordedAt);

  await db.insert(vitals).values({
    id,
    patientId,
    encounterId: input.encounterId ?? null,
    recordedAt,
    authorId: input.authorId ?? null,
    tasMmHg: input.tasMmHg,
    tadMmHg: input.tadMmHg,
    fcBpm: input.fcBpm,
    spo2Pct: input.spo2Pct,
    temperatureC: input.temperatureC != null ? String(input.temperatureC) : null,
    weightKg: input.weightKg != null ? String(input.weightKg) : null,
    heightM: input.heightM != null ? String(input.heightM) : null,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    createdBy: input.authorId ?? null,
  });

  const meta: VitalsMeta = {
    authorLabel: input.authorLabel,
    stayId: input.stayId ?? null,
    frPerMin: input.frPerMin ?? null,
    eva: input.eva ?? null,
    alertLabels: alerts,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    supersedesId: input.supersedesId ?? null,
  };

  await db.insert(settings).values({
    key: vitalsMetaKey(id),
    value: meta,
    updatedAt: new Date(),
    updatedBy: input.authorId ?? null,
  });

  const row = mapVitalsRow(
    {
      id,
      patientId,
      encounterId: input.encounterId ?? null,
      recordedAt,
      authorId: input.authorId ?? null,
      tasMmHg: input.tasMmHg,
      tadMmHg: input.tadMmHg,
      fcBpm: input.fcBpm,
      spo2Pct: input.spo2Pct,
      temperatureC: input.temperatureC != null ? String(input.temperatureC) : null,
      weightKg: input.weightKg != null ? String(input.weightKg) : null,
      heightM: input.heightM != null ? String(input.heightM) : null,
      createdAt: recordedAt,
      createdBy: input.authorId ?? null,
      updatedAt: recordedAt,
      updatedBy: null,
      version: 1,
      archivedAt: null,
    },
    meta,
  );

  if (alerts.length > 0) {
    const beds = await loadWardTemplate(db);
    let changed = false;
    const updated = beds.map((b) => {
      if (b.patientId !== patientId || b.tag === "Libre") return b;
      changed = true;
      return {
        ...b,
        tag: "Alerte" as const,
        lastTransmission: alerts[0] ?? null,
        lastTransmissionAt: input.recordedAt,
      };
    });
    if (changed) await saveWardTemplate(db, updated);
  }

  return row;
}

export async function correctVitalsOnDb(
  db: TenantDb,
  patientRef: string,
  previousId: string,
  reason: string,
  input: Omit<Vitals, "id" | "alertLabels" | "cancelledAt" | "supersedesId">,
  actorLabel: string,
): Promise<{ ok: true; previous: Vitals; next: Vitals } | { ok: false; error: string }> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) return { ok: false, error: "Patient introuvable" };

  const [prevRow] = await db.select().from(vitals).where(eq(vitals.id, previousId)).limit(1);
  if (!prevRow || prevRow.patientId !== patientId) {
    return { ok: false, error: "Mesure introuvable" };
  }

  const [prevMetaRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, vitalsMetaKey(previousId)))
    .limit(1);
  const prevMeta = parseVitalsMeta(prevMetaRow?.value);
  if (prevMeta.cancelledAt || prevRow.archivedAt) {
    return { ok: false, error: "Mesure déjà annulée" };
  }
  if (!reason.trim()) return { ok: false, error: "Motif obligatoire" };

  const cancelledAt = new Date().toISOString();
  const cancelledMeta: VitalsMeta = {
    ...prevMeta,
    cancelledAt,
    cancelledBy: actorLabel,
    cancelReason: reason.trim(),
  };

  await db
    .update(vitals)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(vitals.id, previousId));

  await db
    .insert(settings)
    .values({
      key: vitalsMetaKey(previousId),
      value: cancelledMeta,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: cancelledMeta, updatedAt: new Date() },
    });

  const previous = mapVitalsRow(prevRow, cancelledMeta);
  const next = await recordVitalsOnDb(db, patientId, {
    ...input,
    patientId,
    supersedesId: previousId,
    authorLabel: actorLabel,
  });

  return { ok: true, previous, next };
}

export async function listFluidsOnDb(
  db: TenantDb,
  patientRef: string,
): Promise<FluidBalanceEntry[]> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) return [];

  const rows = await db
    .select()
    .from(nursingNotes)
    .where(eq(nursingNotes.patientId, patientId))
    .orderBy(desc(nursingNotes.recordedAt));

  const fluids: FluidBalanceEntry[] = [];
  for (const row of rows) {
    const parsed = parseNursingNote(row.bodyEnc);
    if (!parsed || parsed.kind !== "fluid") continue;
    fluids.push({
      id: row.id,
      patientId,
      recordedAt: row.recordedAt.toISOString(),
      intakeMl: parsed.intakeMl,
      outputMl: parsed.outputMl,
      diuresisMl: parsed.diuresisMl,
      authorLabel: parsed.authorLabel,
    });
  }
  return fluids;
}

export async function addFluidOnDb(
  db: TenantDb,
  entry: Omit<FluidBalanceEntry, "id">,
): Promise<FluidBalanceEntry> {
  const patientId = await resolvePatientId(db, entry.patientId);
  if (!patientId) throw new Error("Patient introuvable");

  const id = uuidv7();
  const recordedAt = new Date(entry.recordedAt);
  const payload: NursingStructuredNote = {
    kind: "fluid",
    intakeMl: entry.intakeMl,
    outputMl: entry.outputMl,
    diuresisMl: entry.diuresisMl,
    authorLabel: entry.authorLabel,
  };

  await db.insert(nursingNotes).values({
    id,
    patientId,
    stayId: null,
    encounterId: null,
    authorId: null,
    recordedAt,
    bodyEnc: JSON.stringify(payload),
    createdAt: recordedAt,
    updatedAt: recordedAt,
  });

  return { ...entry, id, patientId };
}

export async function listTransmissionsOnDb(
  db: TenantDb,
  patientRef: string,
): Promise<TargetedTransmission[]> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) return [];

  const rows = await db
    .select()
    .from(nursingNotes)
    .where(eq(nursingNotes.patientId, patientId))
    .orderBy(desc(nursingNotes.recordedAt));

  const out: TargetedTransmission[] = [];
  for (const row of rows) {
    const parsed = parseNursingNote(row.bodyEnc);
    if (!parsed || parsed.kind !== "transmission") continue;
    out.push({
      id: row.id,
      patientId,
      stayId: row.stayId,
      recordedAt: row.recordedAt.toISOString(),
      authorLabel: parsed.authorLabel,
      body: parsed.body,
      target: parsed.target,
    });
  }
  return out;
}

export async function addTransmissionOnDb(
  db: TenantDb,
  entry: Omit<TargetedTransmission, "id">,
): Promise<TargetedTransmission> {
  const patientId = await resolvePatientId(db, entry.patientId);
  if (!patientId) throw new Error("Patient introuvable");

  const id = uuidv7();
  const recordedAt = new Date(entry.recordedAt);
  const payload: NursingStructuredNote = {
    kind: "transmission",
    target: entry.target,
    body: entry.body,
    authorLabel: entry.authorLabel,
  };

  await db.insert(nursingNotes).values({
    id,
    patientId,
    stayId: entry.stayId,
    encounterId: null,
    authorId: null,
    recordedAt,
    bodyEnc: JSON.stringify(payload),
    createdAt: recordedAt,
    updatedAt: recordedAt,
  });

  return { ...entry, id, patientId };
}

export async function loadSurveillanceOnDb(
  db: TenantDb,
  patientRef: string,
): Promise<{
  active: Vitals[];
  all: Vitals[];
  fluids: FluidBalanceEntry[];
  transmissions: TargetedTransmission[];
  patientId: string | null;
  label: string | null;
  stayId: string | null;
}> {
  const patientId = await resolvePatientId(db, patientRef);
  if (!patientId) {
    return {
      active: [],
      all: [],
      fluids: [],
      transmissions: [],
      patientId: null,
      label: null,
      stayId: null,
    };
  }

  const [identity] = await db
    .select()
    .from(patientIdentityEnc)
    .where(eq(patientIdentityEnc.patientId, patientId))
    .limit(1);
  const initial = (identity?.firstNameEnc?.[0] ?? "?").toUpperCase();
  const last = identity?.lastNameEnc ?? "";
  const label = `${initial}. ${last}`.trim();

  const staysList = await listStaysForPatientOnDb(db, patientId);
  const activeStay = staysList.find((s) => s.status === "en_cours") ?? staysList[0] ?? null;

  const [active, all, fluids, transmissions] = await Promise.all([
    listActiveVitalsOnDb(db, patientId),
    listAllVitalsOnDb(db, patientId),
    listFluidsOnDb(db, patientId),
    listTransmissionsOnDb(db, patientId),
  ]);

  return {
    active,
    all,
    fluids,
    transmissions,
    patientId,
    label,
    stayId: activeStay?.id ?? null,
  };
}
