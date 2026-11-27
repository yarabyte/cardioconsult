import { and, asc, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { clinicalScores } from "@/db/tenant/schema";
import type { ScoreResult } from "@/types/domain";
import { withTenantDb } from "@/server/db/tenant-db";
import type { TenantDb } from "@/server/db/tenant-db";

export type PersistedClinicalScore = {
  id: string;
  patientId: string;
  encounterId: string | null;
  kind: string;
  datedAt: string;
  inputs: Record<string, unknown>;
  result: ScoreResult;
  ruleId: string | null;
  ruleVersion: string | null;
};

function mapRow(row: typeof clinicalScores.$inferSelect): PersistedClinicalScore {
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    kind: row.kind,
    datedAt: row.datedAt.toISOString(),
    inputs: (row.inputs ?? {}) as Record<string, unknown>,
    result: row.result as unknown as ScoreResult,
    ruleId: row.ruleId,
    ruleVersion: row.ruleVersion,
  };
}

export async function listClinicalScoresForEncounter(
  tenantId: string,
  encounterId: string,
): Promise<PersistedClinicalScore[]> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(clinicalScores)
      .where(eq(clinicalScores.encounterId, encounterId))
      .orderBy(asc(clinicalScores.datedAt));
    return rows.map(mapRow);
  });
}

export async function saveClinicalScore(
  tenantId: string,
  input: {
    patientId: string;
    encounterId: string | null;
    kind: string;
    datedAt: Date;
    inputs: Record<string, unknown>;
    result: ScoreResult;
    ruleId: string;
    ruleVersion: string;
    actorId: string;
  },
): Promise<PersistedClinicalScore> {
  return withTenantDb(tenantId, async (db) => upsertClinicalScoreOnDb(db, input));
}

/** Une ligne par (encounter, kind) — mise à jour si déjà présente. */
export async function upsertClinicalScoreOnDb(
  db: TenantDb,
  input: {
    patientId: string;
    encounterId: string | null;
    kind: string;
    datedAt: Date;
    inputs: Record<string, unknown>;
    result: ScoreResult;
    ruleId: string;
    ruleVersion: string;
    actorId: string;
  },
): Promise<PersistedClinicalScore> {
  const existing =
    input.encounterId != null
      ? await db
          .select()
          .from(clinicalScores)
          .where(
            and(
              eq(clinicalScores.encounterId, input.encounterId),
              eq(clinicalScores.kind, input.kind),
            ),
          )
          .limit(1)
      : await db
          .select()
          .from(clinicalScores)
          .where(
            and(
              eq(clinicalScores.patientId, input.patientId),
              isNull(clinicalScores.encounterId),
              eq(clinicalScores.kind, input.kind),
            ),
          )
          .limit(1);

  const row = existing[0];
  if (row) {
    const [updated] = await db
      .update(clinicalScores)
      .set({
        datedAt: input.datedAt,
        inputs: input.inputs,
        result: input.result as unknown as Record<string, unknown>,
        ruleId: input.ruleId,
        ruleVersion: input.ruleVersion,
        updatedBy: input.actorId,
        updatedAt: new Date(),
      })
      .where(eq(clinicalScores.id, row.id))
      .returning();
    return mapRow(updated!);
  }

  const id = uuidv7();
  const [created] = await db
    .insert(clinicalScores)
    .values({
      id,
      patientId: input.patientId,
      encounterId: input.encounterId,
      kind: input.kind,
      datedAt: input.datedAt,
      inputs: input.inputs,
      result: input.result as unknown as Record<string, unknown>,
      ruleId: input.ruleId,
      ruleVersion: input.ruleVersion,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();
  return mapRow(created!);
}

/** @deprecated préférer upsert via saveClinicalScore */
export async function saveClinicalScoreOnDb(
  db: TenantDb,
  input: {
    patientId: string;
    encounterId: string | null;
    kind: string;
    datedAt: Date;
    inputs: Record<string, unknown>;
    result: ScoreResult;
    ruleId: string;
    ruleVersion: string;
    actorId: string;
  },
): Promise<PersistedClinicalScore> {
  return upsertClinicalScoreOnDb(db, input);
}
