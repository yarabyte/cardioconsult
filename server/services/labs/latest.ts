import { and, desc, eq } from "drizzle-orm";
import { labResults } from "@/db/tenant/schema";
import { ensureEncounterDraft } from "@/server/consultation/service";
import { withTenantDb } from "@/server/db/tenant-db";

export type DatedLabValue = {
  value: number | string | null;
  datedAt: string | null;
};

async function latestFromLabTable(
  tenantId: string,
  patientId: string,
  code: string,
): Promise<DatedLabValue> {
  return withTenantDb(tenantId, async (db) => {
    const [row] = await db
      .select()
      .from(labResults)
      .where(and(eq(labResults.patientId, patientId), eq(labResults.code, code)))
      .orderBy(desc(labResults.datedAt))
      .limit(1);
    if (!row) return { value: null, datedAt: null };
    let value: number | string | null = null;
    if (row.valueNumeric != null && String(row.valueNumeric).trim() !== "") {
      const n = Number(row.valueNumeric);
      value = Number.isFinite(n) ? n : null;
    } else if (row.valueText?.trim()) {
      value = row.valueText.trim();
    }
    return {
      value,
      datedAt: row.datedAt.toISOString().slice(0, 10),
    };
  });
}

/** Lit une valeur dans le brouillon de consultation (panels biologie). */
async function latestFromEncounterDraft(
  tenantId: string,
  encounterId: string,
  code: string,
): Promise<DatedLabValue> {
  const draft = await ensureEncounterDraft(tenantId, encounterId);
  if (!draft) return { value: null, datedAt: null };
  for (const panel of [...draft.data.labs].reverse()) {
    const row = panel.rows.find((r) => r.code === code);
    if (row && row.value != null && row.value !== "") {
      return {
        value: row.value,
        datedAt: panel.sampledAt?.slice(0, 10) || draft.actDate.slice(0, 10),
      };
    }
  }
  return { value: null, datedAt: null };
}

/**
 * Dernière valeur labo connue pour un patient.
 * Priorité : brouillon de consultation liée → table lab_result.
 * Jamais de valeur fictive.
 */
export async function getLatestLabForPatient(
  tenantId: string,
  patientId: string,
  code: string,
  encounterId?: string | null,
): Promise<DatedLabValue> {
  if (encounterId) {
    const fromDraft = await latestFromEncounterDraft(tenantId, encounterId, code);
    if (fromDraft.value != null) return fromDraft;
  }
  return latestFromLabTable(tenantId, patientId, code);
}

export async function getPrescriptionSafetyLabs(
  tenantId: string,
  patientId: string,
  encounterId?: string | null,
): Promise<{ dfg: DatedLabValue; kaliemie: DatedLabValue }> {
  const [dfg, kaliemie] = await Promise.all([
    getLatestLabForPatient(tenantId, patientId, "dfg_ml_min", encounterId),
    getLatestLabForPatient(tenantId, patientId, "kaliemie_mmol_l", encounterId),
  ]);
  return { dfg, kaliemie };
}
