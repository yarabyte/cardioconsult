"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import { computeCabinetStats, exportStatsCsv } from "@/server/services/stats/cabinet";

async function actorStats(opts?: { stepUp?: boolean }) {
  const ctx = await requireContext({
    permission: "stats.read",
    redirectOnFail: false,
    stepUp: Boolean(opts?.stepUp),
  });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    isTenantAdmin: Boolean(ctx.user.isTenantAdmin),
    stepUpValid: ctx.stepUpValid,
  };
}

export async function loadCabinetStatsAction() {
  try {
    const a = await actorStats();
    const stats = await computeCabinetStats(a.tenantId, {
      actorId: a.userId,
      isTenantAdmin: a.isTenantAdmin,
    });
    return { ok: true as const, stats };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function exportStatsCsvAction(raw: unknown) {
  try {
    const parsed = z.object({ stepUpConfirmed: z.boolean() }).parse(raw);
    const a = await actorStats({ stepUp: true });
    if (!a.stepUpValid) {
      return {
        ok: false as const,
        error: "Ré-authentification (step-up) requise pour l'export",
        code: "step_up_required" as const,
      };
    }
    const stats = await computeCabinetStats(a.tenantId, {
      actorId: a.userId,
      isTenantAdmin: a.isTenantAdmin,
    });
    const { csv, maskedFevg } = exportStatsCsv(stats);
    await recordAuditEvent(a.tenantId, {
      action: "stats.export",
      entityType: "tenant",
      entityId: a.tenantId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return {
      ok: true as const,
      csv,
      maskedCount: maskedFevg.filter((c) => c.masked).length,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Export impossible",
    };
  }
}
