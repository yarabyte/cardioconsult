import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { encounters, settings } from "@/db/tenant/schema";
import { withTenantDb } from "@/server/db/tenant-db";

export type OpenEncounterLink = {
  encounterId: string;
  patientId: string;
  href: string;
  datedAt: string;
};

/**
 * Consultations `en_cours` datées aujourd’hui → map patientId → reprise.
 * Si aucune, retombe sur les dossiers ouverts récents (démo / fuseau).
 */
export async function listOpenEncounterLinksByPatient(
  tenantId: string,
  dayIso: string,
): Promise<Map<string, OpenEncounterLink>> {
  return withTenantDb(tenantId, async (db) => {
    const dayStart = new Date(`${dayIso}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let rows = await db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.status, "en_cours"),
          gte(encounters.datedAt, dayStart),
          lt(encounters.datedAt, dayEnd),
        ),
      )
      .orderBy(desc(encounters.datedAt))
      .limit(40);

    if (rows.length === 0) {
      rows = await db
        .select()
        .from(encounters)
        .where(eq(encounters.status, "en_cours"))
        .orderBy(desc(encounters.datedAt))
        .limit(20);
    }

    const rubricKeys = rows.map((r) => `encounter_rubric:${r.id}`);
    const rubricRows =
      rubricKeys.length > 0
        ? await db.select().from(settings).where(inArray(settings.key, rubricKeys))
        : [];
    const rubricByEnc = new Map<string, string>();
    for (const row of rubricRows) {
      const id = row.key.replace(/^encounter_rubric:/, "");
      if (typeof row.value === "string") rubricByEnc.set(id, row.value);
    }

    const map = new Map<string, OpenEncounterLink>();
    for (const row of rows) {
      if (map.has(row.patientId)) continue;
      const rubric = rubricByEnc.get(row.id)?.trim() || "identite";
      map.set(row.patientId, {
        encounterId: row.id,
        patientId: row.patientId,
        href: `/consultations/${row.id}/${rubric}`,
        datedAt: row.datedAt.toISOString(),
      });
    }
    return map;
  });
}
