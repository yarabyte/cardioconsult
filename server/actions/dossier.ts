"use server";

import { inArray } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/db/control/schema";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { getControlDb } from "@/server/db/control-db";
import { listAuditEvents } from "@/server/services/audit";
import { getLongitudinalDossier } from "@/server/services/dossier/longitudinal";
import { getPatientForTenant } from "@/server/services/patients/service";
import type { SeriesPeriod } from "@/lib/dossier/series";

async function actorPatient() {
  const ctx = await requireContext({ permission: "patient.read", redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
  };
}

export async function loadLongitudinalAction(raw: unknown) {
  try {
    const a = await actorPatient();
    const parsed = z
      .object({
        patientId: z.string(),
        period: z.enum(["6m", "1a", "all"]).default("1a"),
      })
      .parse(raw);
    const patient = await getPatientForTenant(a.tenantId, parsed.patientId);
    if (!patient) return { ok: false as const, error: "Patient introuvable" };
    const dossier = await getLongitudinalDossier(
      a.tenantId,
      patient,
      parsed.period as SeriesPeriod,
    );
    return { ok: true as const, dossier };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

/** Historique d'accès au dossier — réservé audit.read. */
export async function loadPatientAccessLogAction(patientId: string) {
  try {
    const ctx = await requireContext({ permission: "audit.read", redirectOnFail: false });
    if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
    const events = await listAuditEvents(
      ctx.tenant.id,
      {
        entityType: "patient",
        entityId: patientId,
        limit: 50,
      },
      ctx.db ?? undefined,
    );

    const actorIds = [
      ...new Set(events.map((e) => e.actorId).filter((id): id is string => Boolean(id?.trim()))),
    ];
    const nameById = new Map<string, string>();
    if (actorIds.length > 0) {
      try {
        const rows = await getControlDb()
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, actorIds));
        for (const row of rows) nameById.set(row.id, row.name);
      } catch {
        // Noms indisponibles : on conserve le rôle seul côté UI.
      }
    }

    return {
      ok: true as const,
      events: events.map((e) => ({
        id: e.id,
        at: typeof e.at === "string" ? e.at : new Date(e.at as Date).toISOString(),
        action: e.action,
        actorId: e.actorId,
        actorRole: e.actorRole ?? null,
        actorLabel: e.actorId ? (nameById.get(e.actorId) ?? null) : null,
      })),
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Accès refusé",
      events: [],
    };
  }
}
