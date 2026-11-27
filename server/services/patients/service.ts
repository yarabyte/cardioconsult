import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  aorticMeasurements,
  clinicalAlerts,
  echoStudies,
  encounters,
  patientAllergies,
  patientDevices,
  patientIdentityEnc,
  patients,
  settings,
  tenantCounters,
} from "@/db/tenant/schema";
import type { Patient } from "@/types/domain";
import type { EncounterDraftData } from "@/lib/consultation/draft-types";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";
import { normalizeForBlindIndex } from "@/server/crypto/blind-index";
import type { PatientCreateInput } from "@/lib/validation/patient";
import { getInsProvider } from "@/server/ins/not-available";

export type StructuredAllergy = {
  id: string;
  substance: string;
  reaction: string | null;
  severity: string;
  source: string | null;
};

export type ImplantedDevice = {
  id: string;
  kind: string;
  label: string | null;
  implantedAt: string | null;
};

export type PatientView = Patient & {
  birthName?: string | null;
  treatingPhysician?: string | null;
  structuredAllergies: StructuredAllergy[];
  devices: ImplantedDevice[];
  archiveReason?: string | null;
  dossierNumber: string;
};

export type PatientListQuery = {
  q?: string;
  pathology?: string;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
};

export type PatientListResult = {
  items: PatientView[];
  total: number;
  page: number;
  pageSize: number;
};

type IdentityRow = typeof patientIdentityEnc.$inferSelect;
type PatientRow = typeof patients.$inferSelect;

function sexForUi(sex: IdentityRow["sex"]): "F" | "H" {
  return sex === "F" ? "F" : "H";
}

function mapToPatientView(
  tenantId: string,
  row: PatientRow,
  identity: IdentityRow,
  allergies: (typeof patientAllergies.$inferSelect)[],
  devices: (typeof patientDevices.$inferSelect)[],
): PatientView {
  const dossierNumber = row.dossierNumber ?? identity.dossierNumber ?? row.id;
  const structuredAllergies: StructuredAllergy[] = allergies.map((a) => ({
    id: a.id,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    source: a.source,
  }));
  const deviceRows: ImplantedDevice[] = devices.map((d) => ({
    id: d.id,
    kind: d.kind,
    label: d.label,
    implantedAt: d.implantedAt,
  }));

  return {
    id: row.id,
    tenantId,
    dossierNumber,
    firstName: identity.firstNameEnc ?? "",
    lastName: identity.lastNameEnc ?? "",
    birthName: identity.birthNameEnc ?? identity.lastNameEnc ?? "",
    birthDate: identity.birthDateEnc ?? "",
    sex: sexForUi(identity.sex),
    pathologies: [],
    fevgPct: null,
    lastConsultDate: null,
    nextAppointmentDate: null,
    alertLabel: null,
    allergies: allergies.map((a) => a.substance),
    structuredAllergies,
    devices: deviceRows,
    treatingPhysician: identity.treatingPhysicianEnc ?? null,
    heightM: null,
    weightKg: null,
    insStatus: identity.insStatus,
    flags: [],
    archivedAt: row.archivedAt?.toISOString() ?? null,
    archiveReason: row.archiveReason,
    version: row.version,
  };
}

function matchesSearch(view: PatientView, qNorm: string): boolean {
  const dossier = normalizeForBlindIndex(view.dossierNumber);
  const ln = normalizeForBlindIndex(view.lastName);
  const fn = normalizeForBlindIndex(view.firstName);
  return (
    dossier.includes(qNorm) ||
    ln.startsWith(qNorm) ||
    fn.startsWith(qNorm) ||
    `${ln} ${fn}`.includes(qNorm) ||
    `${fn} ${ln}`.includes(qNorm)
  );
}

function dateOnlyIso(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function derivePathologies(input: {
  fevgPct: number | null;
  hasAortaMeasure: boolean;
  alertTitle: string | null;
  riskFactors?: Record<string, string> | null;
  hasAfib?: boolean;
}): string[] {
  const tags: string[] = [];
  if (input.fevgPct != null && input.fevgPct < 50) tags.push("IC");
  if (input.hasAortaMeasure || (input.alertTitle?.toLowerCase().includes("aorte") ?? false)) {
    tags.push("Aorte");
  }
  if (input.riskFactors?.hypertension === "yes") tags.push("HTA");
  if (input.hasAfib) tags.push("FA");
  return [...new Set(tags)];
}

function draftLooksLikeAfib(data: EncounterDraftData | null): boolean {
  if (!data) return false;
  const blob = [data.rythmologie?.arrhythmia, data.motif, data.history, data.ecg?.rythme]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(fa|fibrillation|flutter)\b/.test(blob);
}

/**
 * Enrichit la liste / fiche avec FEVG, dernière consultation, alertes et tags dérivés.
 * (Le mapping de base laisse ces champs vides volontairement — pas de colonnes dénormalisées.)
 */
async function enrichClinicalSummary(db: TenantDb, views: PatientView[]): Promise<PatientView[]> {
  if (views.length === 0) return views;
  const ids = views.map((v) => v.id);

  const [encRows, echoRows, alertRows, aortaRows] = await Promise.all([
    db
      .select({
        patientId: encounters.patientId,
        id: encounters.id,
        datedAt: encounters.datedAt,
      })
      .from(encounters)
      .where(and(inArray(encounters.patientId, ids), isNull(encounters.archivedAt)))
      .orderBy(desc(encounters.datedAt)),
    db
      .select({
        patientId: echoStudies.patientId,
        fevgPct: echoStudies.fevgPct,
        datedAt: echoStudies.datedAt,
      })
      .from(echoStudies)
      .where(
        and(
          inArray(echoStudies.patientId, ids),
          isNull(echoStudies.archivedAt),
          sql`${echoStudies.fevgPct} is not null`,
        ),
      )
      .orderBy(desc(echoStudies.datedAt)),
    db
      .select({
        patientId: clinicalAlerts.patientId,
        title: clinicalAlerts.title,
        createdAt: clinicalAlerts.createdAt,
      })
      .from(clinicalAlerts)
      .where(
        and(
          inArray(clinicalAlerts.patientId, ids),
          isNull(clinicalAlerts.acknowledgedAt),
          isNull(clinicalAlerts.archivedAt),
        ),
      )
      .orderBy(desc(clinicalAlerts.createdAt)),
    db
      .select({
        patientId: aorticMeasurements.patientId,
      })
      .from(aorticMeasurements)
      .where(and(inArray(aorticMeasurements.patientId, ids), isNull(aorticMeasurements.archivedAt)))
      .groupBy(aorticMeasurements.patientId),
  ]);

  const latestEncByPatient = new Map<string, { id: string; datedAt: Date }>();
  for (const row of encRows) {
    if (latestEncByPatient.has(row.patientId)) continue;
    latestEncByPatient.set(row.patientId, { id: row.id, datedAt: row.datedAt });
  }

  const draftKeys = [...latestEncByPatient.values()].map((e) => `encounter_draft:${e.id}`);
  const draftRows =
    draftKeys.length > 0
      ? await db.select().from(settings).where(inArray(settings.key, draftKeys))
      : [];
  const draftByEncounter = new Map<string, EncounterDraftData>();
  for (const row of draftRows) {
    const encounterId = row.key.replace(/^encounter_draft:/, "");
    if (row.value && typeof row.value === "object") {
      draftByEncounter.set(encounterId, row.value as EncounterDraftData);
    }
  }

  const latestFevg = new Map<string, number>();
  for (const row of echoRows) {
    if (row.fevgPct == null || latestFevg.has(row.patientId)) continue;
    latestFevg.set(row.patientId, row.fevgPct);
  }
  const openAlert = new Map<string, string>();
  for (const row of alertRows) {
    if (openAlert.has(row.patientId)) continue;
    openAlert.set(row.patientId, row.title);
  }
  const hasAorta = new Set(aortaRows.map((r) => r.patientId));

  return views.map((v) => {
    const enc = latestEncByPatient.get(v.id);
    const draft = enc ? (draftByEncounter.get(enc.id) ?? null) : null;
    const draftFevg =
      typeof draft?.echo?.fevg === "number" && Number.isFinite(draft.echo.fevg)
        ? draft.echo.fevg
        : null;
    const draftAorta =
      draft?.aorta?.segments?.some((s) => s.notVisualized || s.diameterMm != null) ?? false;
    const fevgPct = latestFevg.get(v.id) ?? draftFevg;
    const alertLabel = openAlert.get(v.id) ?? null;
    const pathologies = derivePathologies({
      fevgPct,
      hasAortaMeasure: hasAorta.has(v.id) || draftAorta,
      alertTitle: alertLabel,
      riskFactors: draft?.riskFactors ?? null,
      hasAfib: draftLooksLikeAfib(draft),
    });
    return {
      ...v,
      fevgPct,
      lastConsultDate: enc ? dateOnlyIso(enc.datedAt) : null,
      alertLabel,
      pathologies,
    };
  });
}

async function nextDossierNumber(
  db: Parameters<Parameters<typeof withTenantDb>[1]>[0],
): Promise<string> {
  const key = "dossier";
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(tenantCounters)
      .where(eq(tenantCounters.key, key))
      .limit(1);
    let seq: number;
    if (!existing) {
      await tx.insert(tenantCounters).values({ key, value: 1 });
      seq = 1;
    } else {
      seq = existing.value + 1;
      await tx.update(tenantCounters).set({ value: seq }).where(eq(tenantCounters.key, key));
    }
    return `CC-${String(seq).padStart(6, "0")}`;
  });
}

async function loadPatientView(
  db: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  patientId: string,
): Promise<PatientView | null> {
  const [row] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!row) return null;
  const [identity] = await db
    .select()
    .from(patientIdentityEnc)
    .where(eq(patientIdentityEnc.patientId, patientId))
    .limit(1);
  if (!identity) return null;

  const [allergies, devices] = await Promise.all([
    db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patientId)),
    db.select().from(patientDevices).where(eq(patientDevices.patientId, patientId)),
  ]);

  const base = mapToPatientView(tenantId, row, identity, allergies, devices);
  const [enriched] = await enrichClinicalSummary(db, [base]);
  return enriched ?? base;
}

/**
 * Liste paginée. Recherche par index aveugle exact puis filtre normalisé en mémoire si besoin.
 */
export async function listPatients(
  tenantId: string,
  query: PatientListQuery,
): Promise<PatientListResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

  return withTenantDb(tenantId, async (db) => {
    const conditions = [];
    if (!query.includeArchived) {
      conditions.push(isNull(patients.archivedAt));
    }

    const qRaw = query.q?.trim();
    let useInMemorySearch = false;
    if (qRaw) {
      const dossierMatch = /^cc-\d+/i.test(qRaw);
      if (dossierMatch) {
        conditions.push(eq(patients.dossierNumber, qRaw.toUpperCase()));
      } else {
        const parts = qRaw.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
          const token = parts[0]!;
          conditions.push(
            or(
              eq(patientIdentityEnc.lastNameBlind, token),
              eq(patientIdentityEnc.firstNameBlind, token),
            )!,
          );
        } else if (parts.length >= 2) {
          const [a, b] = parts;
          conditions.push(
            or(
              and(
                eq(patientIdentityEnc.lastNameBlind, a!),
                eq(patientIdentityEnc.firstNameBlind, b!),
              )!,
              and(
                eq(patientIdentityEnc.lastNameBlind, b!),
                eq(patientIdentityEnc.firstNameBlind, a!),
              )!,
            )!,
          );
        }
        useInMemorySearch = true;
      }
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseRows = await db
      .select({
        patient: patients,
        identity: patientIdentityEnc,
      })
      .from(patients)
      .innerJoin(patientIdentityEnc, eq(patientIdentityEnc.patientId, patients.id))
      .where(whereClause)
      .orderBy(asc(patientIdentityEnc.lastNameBlind));

    let views = baseRows.map((r) => mapToPatientView(tenantId, r.patient, r.identity, [], []));

    if (qRaw && useInMemorySearch) {
      const qNorm = normalizeForBlindIndex(qRaw);
      views = views.filter((p) => matchesSearch(p, qNorm));
    } else if (qRaw && /^cc-/i.test(qRaw) && views.length === 0) {
      const qNorm = normalizeForBlindIndex(qRaw);
      const allRows = await db
        .select({ patient: patients, identity: patientIdentityEnc })
        .from(patients)
        .innerJoin(patientIdentityEnc, eq(patientIdentityEnc.patientId, patients.id))
        .where(!query.includeArchived ? isNull(patients.archivedAt) : undefined);
      views = allRows
        .map((r) => mapToPatientView(tenantId, r.patient, r.identity, [], []))
        .filter((p) => matchesSearch(p, qNorm));
    }

    views = await enrichClinicalSummary(db, views);

    if (query.pathology) {
      const tag = query.pathology.toLowerCase();
      views = views.filter((p) => p.pathologies.some((x) => x.toLowerCase().includes(tag)));
    }

    views.sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"));
    const total = views.length;
    const start = (page - 1) * pageSize;
    const slice = views.slice(start, start + pageSize);

    const ids = slice.map((p) => p.id);
    if (ids.length > 0) {
      const allergyRows = await db
        .select()
        .from(patientAllergies)
        .where(inArray(patientAllergies.patientId, ids));
      const byPatient = new Map<string, (typeof patientAllergies.$inferSelect)[]>();
      for (const a of allergyRows) {
        const list = byPatient.get(a.patientId) ?? [];
        list.push(a);
        byPatient.set(a.patientId, list);
      }
      for (let i = 0; i < slice.length; i++) {
        const p = slice[i]!;
        const al = byPatient.get(p.id) ?? [];
        slice[i] = {
          ...p,
          allergies: al.map((x) => x.substance),
          structuredAllergies: al.map((x) => ({
            id: x.id,
            substance: x.substance,
            reaction: x.reaction,
            severity: x.severity,
            source: x.source,
          })),
        };
      }
    }

    return { items: slice, total, page, pageSize };
  });
}

export async function getPatientForTenant(
  tenantId: string,
  patientId: string,
): Promise<PatientView | null> {
  return withTenantDb(tenantId, (db) => loadPatientView(db, tenantId, patientId));
}

export type CreatePatientResult =
  | { ok: true; patient: PatientView }
  | {
      ok: false;
      code: "duplicate";
      duplicates: Array<{ id: string; dossierNumber: string; label: string }>;
    }
  | { ok: false; code: "validation"; message: string };

export async function createPatient(
  tenantId: string,
  input: PatientCreateInput,
  actorId: string,
): Promise<CreatePatientResult> {
  return withTenantDb(tenantId, async (db) => {
    const dupRows = await db
      .select({
        patient: patients,
        identity: patientIdentityEnc,
      })
      .from(patientIdentityEnc)
      .innerJoin(patients, eq(patients.id, patientIdentityEnc.patientId))
      .where(
        and(
          eq(patientIdentityEnc.lastNameBlind, input.lastName),
          eq(patientIdentityEnc.firstNameBlind, input.firstName),
          eq(patientIdentityEnc.birthDateBlind, input.birthDate),
        ),
      );

    if (dupRows.length > 0 && !input.confirmDuplicate) {
      return {
        ok: false,
        code: "duplicate",
        duplicates: dupRows.map((d) => {
          const dn = d.patient.dossierNumber ?? d.identity.dossierNumber ?? d.patient.id;
          return {
            id: d.patient.id,
            dossierNumber: dn,
            label: `${(d.identity.lastNameEnc ?? "").toUpperCase()} ${d.identity.firstNameEnc ?? ""} · ${dn}`,
          };
        }),
      };
    }

    const ins = await getInsProvider().lookup({
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      sex: input.sex,
    });

    const id = uuidv7();
    const dossierNumber = await nextDossierNumber(db);
    const insStatus = ins.status === "qualifiee" ? "qualifiee" : "non_qualifiee";
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(patients).values({
        id,
        dossierNumber,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(patientIdentityEnc).values({
        patientId: id,
        firstNameEnc: input.firstName,
        lastNameEnc: input.lastName,
        birthNameEnc: input.birthName || input.lastName,
        birthDateEnc: input.birthDate,
        sex: input.sex === "F" || input.sex === "H" ? input.sex : "NonRenseigne",
        ...(input.email ? { emailEnc: input.email } : {}),
        ...(input.phone ? { phoneEnc: input.phone } : {}),
        ...(input.addressLine ? { addressLineEnc: input.addressLine } : {}),
        ...(input.postalCode ? { postalCodeEnc: input.postalCode } : {}),
        ...(input.city ? { cityEnc: input.city } : {}),
        ...(input.treatingPhysician ? { treatingPhysicianEnc: input.treatingPhysician } : {}),
        insStatus,
        dossierNumber,
        lastNameBlind: input.lastName,
        firstNameBlind: input.firstName,
        birthDateBlind: input.birthDate,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: now,
        updatedAt: now,
      });

      for (const a of input.allergies) {
        await tx.insert(patientAllergies).values({
          id: uuidv7(),
          patientId: id,
          substance: a.substance,
          reaction: a.reaction ?? null,
          severity: a.severity,
          source: a.source ?? null,
          createdBy: actorId,
          updatedBy: actorId,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const d of input.devices) {
        await tx.insert(patientDevices).values({
          id: uuidv7(),
          patientId: id,
          kind: d.kind,
          label: d.label ?? null,
          implantedAt: d.implantedAt ?? null,
          createdBy: actorId,
          updatedBy: actorId,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const patient = await loadPatientView(db, tenantId, id);
    if (!patient) {
      return { ok: false, code: "validation", message: "Création incomplète." };
    }
    return { ok: true, patient };
  });
}

export async function archivePatient(
  tenantId: string,
  patientId: string,
  reason: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "not_found" }> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (!row) return { ok: false, code: "not_found" };
    await db
      .update(patients)
      .set({
        archivedAt: new Date(),
        archiveReason: reason,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(patients.id, patientId));
    return { ok: true };
  });
}

export async function restorePatient(
  tenantId: string,
  patientId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "not_found" }> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (!row) return { ok: false, code: "not_found" };
    await db
      .update(patients)
      .set({
        archivedAt: null,
        archiveReason: null,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(patients.id, patientId));
    return { ok: true };
  });
}
