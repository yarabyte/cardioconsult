"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import {
  acknowledgeClinicalAlert,
  listOpenClinicalAlerts,
} from "@/server/services/clinical/alerts";
import { isClinicalFlagEnabled } from "@/server/services/clinical/flags";

async function actorAlert() {
  const ctx = await requireContext({
    permission: "alert.acknowledge",
    redirectOnFail: false,
  });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
  };
}

export async function listOpenAlertsAction() {
  try {
    const a = await actorAlert();
    if (!(await isClinicalFlagEnabled(a.tenantId, "clinical.alerts"))) {
      return { ok: true as const, files: [], disabled: true as const, alerts: [] };
    }
    const alerts = await listOpenClinicalAlerts(a.tenantId);
    return { ok: true as const, alerts, disabled: false as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function acknowledgeAlertAction(raw: unknown) {
  try {
    const a = await actorAlert();
    if (!(await isClinicalFlagEnabled(a.tenantId, "clinical.alerts"))) {
      return { ok: false as const, error: "Module alertes désactivé" };
    }
    const parsed = z.object({ alertId: z.string().min(1) }).parse(raw);
    const updated = await acknowledgeClinicalAlert(a.tenantId, parsed.alertId, a.userId);
    if (!updated) return { ok: false as const, error: "Alerte introuvable" };
    await recordAuditEvent(a.tenantId, {
      action: "alert.acknowledge",
      entityType: "clinical_alert",
      entityId: parsed.alertId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, alert: updated };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Reconnaissance impossible",
    };
  }
}
