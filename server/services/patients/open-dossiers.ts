import { desc, eq, inArray } from "drizzle-orm";
import { encounters, patientIdentityEnc, settings } from "@/db/tenant/schema";
import { patientDisplayName } from "@/lib/format";
import { listAuditEvents } from "@/server/services/audit";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";

export type SidebarOpenDossier = {
  patientId: string;
  label: string;
  href: string;
  /** Consultation en cours vs dossier récemment consulté. */
  kind: "en_cours" | "recent";
  subtitle: string;
};

const MAX = 10;

function dismissedKey(actorId: string) {
  return `sidebar_dismissed_dossiers:${actorId}`;
}

function workspaceHref(encounterId: string, rubric?: string | null): string {
  const slug = rubric?.trim() ? rubric.trim() : "identite";
  return `/consultations/${encounterId}/${slug}`;
}

async function loadDismissedIds(db: TenantDb, actorId: string): Promise<string[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, dismissedKey(actorId)))
    .limit(1);
  if (!row?.value || !Array.isArray(row.value)) return [];
  return row.value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function saveDismissedIds(db: TenantDb, actorId: string, ids: string[]): Promise<void> {
  const now = new Date();
  const unique = [...new Set(ids)].slice(0, 50);
  await db
    .insert(settings)
    .values({
      key: dismissedKey(actorId),
      value: unique,
      updatedAt: now,
      updatedBy: actorId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: unique, updatedAt: now, updatedBy: actorId },
    });
}

/** Retire un dossier de la liste sidebar (ne clôture pas la consultation). */
export async function dismissSidebarDossier(
  tenantId: string,
  actorId: string,
  patientId: string,
): Promise<void> {
  await withTenantDb(tenantId, async (db) => {
    const current = await loadDismissedIds(db, actorId);
    if (current.includes(patientId)) return;
    await saveDismissedIds(db, actorId, [...current, patientId]);
  });
}

/** Réaffiche le dossier dans la liste (ex. à la réouverture du patient). */
export async function undismissSidebarDossier(
  tenantId: string,
  actorId: string,
  patientId: string,
): Promise<void> {
  await withTenantDb(tenantId, async (db) => {
    const current = await loadDismissedIds(db, actorId);
    if (!current.includes(patientId)) return;
    await saveDismissedIds(
      db,
      actorId,
      current.filter((id) => id !== patientId),
    );
  });
}

/**
 * Dossiers à afficher dans le sidebar :
 * 1. consultations `en_cours`
 * 2. dossiers récemment ouverts par l’acteur (`patient.open`, sans localStorage)
 * Les IDs retirés manuellement sont exclus jusqu’à réouverture du dossier.
 */
export async function listSidebarOpenDossiers(
  tenantId: string,
  actorId: string,
): Promise<SidebarOpenDossier[]> {
  return withTenantDb(tenantId, async (db) => {
    const dismissed = new Set(await loadDismissedIds(db, actorId));

    const openRows = await db
      .select()
      .from(encounters)
      .where(eq(encounters.status, "en_cours"))
      .orderBy(desc(encounters.datedAt))
      .limit(MAX * 2);

    const openPatientIds = [
      ...new Set(openRows.map((r) => r.patientId).filter((id) => !dismissed.has(id))),
    ];

    const recentEvents = await listAuditEvents(
      tenantId,
      {
        actorId,
        action: "patient.open",
        entityType: "patient",
        limit: 40,
      },
      db,
    );
    const recentPatientIds: string[] = [];
    for (const e of recentEvents) {
      if (!e.entityId || dismissed.has(e.entityId)) continue;
      if (openPatientIds.includes(e.entityId)) continue;
      if (recentPatientIds.includes(e.entityId)) continue;
      recentPatientIds.push(e.entityId);
      if (openPatientIds.length + recentPatientIds.length >= MAX) break;
    }

    const allIds = [...new Set([...openPatientIds, ...recentPatientIds])];
    if (allIds.length === 0) return [];

    const identities = await db
      .select()
      .from(patientIdentityEnc)
      .where(inArray(patientIdentityEnc.patientId, allIds));
    const nameById = new Map(
      identities.map((i) => [
        i.patientId,
        patientDisplayName(i.firstNameEnc ?? "", i.lastNameEnc ?? "") || "Patient",
      ]),
    );

    const openRowsVisible = openRows.filter((r) => !dismissed.has(r.patientId));
    const rubricKeys = openRowsVisible.map((r) => `encounter_rubric:${r.id}`);
    const rubricRows =
      rubricKeys.length > 0
        ? await db.select().from(settings).where(inArray(settings.key, rubricKeys))
        : [];
    const rubricByEnc = new Map<string, string>();
    for (const row of rubricRows) {
      const encId = row.key.replace(/^encounter_rubric:/, "");
      if (typeof row.value === "string") rubricByEnc.set(encId, row.value);
    }

    const out: SidebarOpenDossier[] = [];
    const seen = new Set<string>();

    for (const enc of openRowsVisible) {
      if (seen.has(enc.patientId)) continue;
      seen.add(enc.patientId);
      out.push({
        patientId: enc.patientId,
        label: nameById.get(enc.patientId) ?? "Patient",
        href: workspaceHref(enc.id, rubricByEnc.get(enc.id)),
        kind: "en_cours",
        subtitle: "Consultation en cours",
      });
      if (out.length >= MAX) break;
    }

    for (const patientId of recentPatientIds) {
      if (seen.has(patientId)) continue;
      seen.add(patientId);
      out.push({
        patientId,
        label: nameById.get(patientId) ?? "Patient",
        href: `/patients/${patientId}`,
        kind: "recent",
        subtitle: "Ouvert récemment",
      });
      if (out.length >= MAX) break;
    }

    return out;
  });
}
