import { and, eq, isNull } from "drizzle-orm";
import { clinicalAlerts } from "@/db/tenant/schema";
import type { ClinicalAlert } from "@/types/domain";
import { withTenantDb } from "@/server/db/tenant-db";
import type { TenantDb } from "@/server/db/tenant-db";

function mapRow(row: typeof clinicalAlerts.$inferSelect): ClinicalAlert {
  let details: string[] = [];
  if (row.message?.includes("\n---\n")) {
    const [message, rest] = row.message.split("\n---\n");
    try {
      const parsed = JSON.parse(rest ?? "[]") as string[];
      if (Array.isArray(parsed)) details = parsed;
    } catch {
      details = [];
    }
    return {
      id: row.id,
      patientId: row.patientId,
      encounterId: row.encounterId,
      level: row.level as ClinicalAlert["level"],
      title: row.title,
      message,
      ruleId: row.ruleId,
      ruleVersion: row.ruleVersion,
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: row.acknowledgedBy,
      details,
    };
  }
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    level: row.level as ClinicalAlert["level"],
    title: row.title,
    message: row.message ?? undefined,
    ruleId: row.ruleId,
    ruleVersion: row.ruleVersion,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: row.acknowledgedBy,
    details,
  };
}

export async function listOpenClinicalAlerts(tenantId: string): Promise<ClinicalAlert[]> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(clinicalAlerts)
      .where(isNull(clinicalAlerts.acknowledgedAt));
    return rows.map(mapRow);
  });
}

export async function acknowledgeClinicalAlert(
  tenantId: string,
  alertId: string,
  actorId: string,
): Promise<ClinicalAlert | null> {
  return withTenantDb(tenantId, async (db) => {
    const now = new Date();
    const [row] = await db
      .update(clinicalAlerts)
      .set({
        acknowledgedAt: now,
        acknowledgedBy: actorId,
        updatedAt: now,
        updatedBy: actorId,
      })
      .where(and(eq(clinicalAlerts.id, alertId), isNull(clinicalAlerts.acknowledgedAt)))
      .returning();
    return row ? mapRow(row) : null;
  });
}

export async function upsertClinicalAlert(
  db: TenantDb,
  alert: Omit<ClinicalAlert, "acknowledgedAt" | "acknowledgedBy">,
): Promise<void> {
  const message =
    alert.details.length > 0
      ? `${alert.message ?? ""}\n---\n${JSON.stringify(alert.details)}`
      : (alert.message ?? null);
  await db
    .insert(clinicalAlerts)
    .values({
      id: alert.id,
      patientId: alert.patientId,
      encounterId: alert.encounterId ?? null,
      level: alert.level,
      title: alert.title,
      message,
      ruleId: alert.ruleId,
      ruleVersion: alert.ruleVersion,
    })
    .onConflictDoNothing();
}
