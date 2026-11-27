import { inArray } from "drizzle-orm";
import { patientIdentityEnc } from "@/db/tenant/schema";
import { withTenantDb } from "@/server/db/tenant-db";

export type AgendaPatientMeta = {
  birthDate: string | null;
  sex: string | null;
};

/** Identité minimale pour l’agenda (âge / sexe) — pas d’invention si absent. */
export async function loadAgendaPatientMeta(
  tenantId: string,
  patientIds: (string | null | undefined)[],
): Promise<Map<string, AgendaPatientMeta>> {
  const ids = [...new Set(patientIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();

  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select({
        patientId: patientIdentityEnc.patientId,
        birthDateEnc: patientIdentityEnc.birthDateEnc,
        sex: patientIdentityEnc.sex,
      })
      .from(patientIdentityEnc)
      .where(inArray(patientIdentityEnc.patientId, ids));

    return new Map(
      rows.map((r) => [
        r.patientId,
        {
          birthDate: r.birthDateEnc?.trim() || null,
          sex: r.sex && r.sex !== "NonRenseigne" ? r.sex : null,
        },
      ]),
    );
  });
}
