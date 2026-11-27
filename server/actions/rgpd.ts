"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { requireStepUp } from "@/server/auth/step-up";
import { recordAuditEvent } from "@/server/services/audit";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import * as rgpdRepo from "@/server/rgpd/repository";
import { listPatients } from "@/server/services/patients/service";

async function actorRgpd(permission: "settings.manage" | "export.data" | "patient.write") {
  const ctx = await requireContext({ permission, redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    name: ctx.user.name,
    isTenantAdmin: Boolean(ctx.user.isTenantAdmin),
  };
}

export async function loadRgpdSettingsAction() {
  try {
    const a = await actorRgpd("settings.manage");
    const patients = await listPatients(a.tenantId, { pageSize: 500 });
    const retention = await rgpdRepo.getRetention(a.tenantId);
    return {
      ok: true as const,
      retention,
      due: rgpdRepo.listDueDossiers(a.tenantId, patients.items, retention.retentionYears),
      notice: await rgpdRepo.getNotice(a.tenantId),
      breaches: await rgpdRepo.listBreaches({ scope: "cabinet", tenantId: a.tenantId }),
      cnilUrl: "https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles",
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function setRetentionAction(raw: unknown) {
  try {
    const a = await actorRgpd("settings.manage");
    const parsed = z.object({ retentionYears: z.number().int().min(1).max(100) }).parse(raw);
    const r = await rgpdRepo.setRetention(a.tenantId, parsed.retentionYears, a.userId);
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "rgpd.retention_updated",
      entityType: "tenant",
      entityId: a.tenantId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function requestDataExportAction(raw: unknown) {
  try {
    const a = await actorRgpd("export.data");
    await requireStepUp();
    const parsed = z
      .object({
        scope: z.enum(["tenant", "patient"]),
        patientId: z.string().optional().nullable(),
      })
      .parse(raw);

    if (parsed.scope === "patient" && !parsed.patientId) {
      return { ok: false as const, error: "patientId requis pour l'export dossier" };
    }

    const patients = await listPatients(a.tenantId, { pageSize: 500 });

    const job = await rgpdRepo.createExport({
      tenantId: a.tenantId,
      scope: parsed.scope,
      patientId: parsed.patientId,
      actorId: a.userId,
      patients: patients.items,
    });

    await recordAuditEvent(a.tenantId, {
      action: parsed.scope === "tenant" ? "rgpd.export_tenant" : "rgpd.export_patient",
      entityType: "data_export",
      entityId: job.id,
      actorId: a.userId,
      actorRole: a.role,
    });

    return {
      ok: true as const,
      exportId: job.id,
      downloadToken: job.downloadToken,
      expiresAt: job.expiresAt,
      contentSha256: job.contentSha256,
      downloadPath: `/api/rgpd/export/${job.downloadToken}`,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Export impossible",
    };
  }
}

export async function savePatientNoticeAction(raw: unknown) {
  try {
    const a = await actorRgpd("settings.manage");
    const parsed = z.object({ body: z.string().min(20).max(20_000) }).parse(raw);
    const notice = await rgpdRepo.saveNotice(a.tenantId, parsed.body);
    return { ok: true as const, notice };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function declareBreachAction(raw: unknown) {
  try {
    const a = await actorRgpd("settings.manage");
    const parsed = z
      .object({
        description: z.string().min(10).max(5000),
        actions: z.string().max(5000).default(""),
        notifyCnilIntent: z.boolean().default(false),
      })
      .parse(raw);

    const breach = await rgpdRepo.declareBreach({
      scope: "cabinet",
      tenantId: a.tenantId,
      declaredBy: a.userId,
      description: parsed.description,
      qualification: "a_qualifier",
      actions: parsed.actions,
      notifyCnilIntent: parsed.notifyCnilIntent,
    });

    await recordAuditEvent(a.tenantId, {
      action: "rgpd.breach_declared",
      entityType: "breach",
      entityId: breach.id,
      actorId: a.userId,
      actorRole: a.role,
    });

    return { ok: true as const, breach };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Déclaration impossible",
    };
  }
}

export async function addIdentityAddendumAction(raw: unknown) {
  try {
    const a = await actorRgpd("patient.write");
    const parsed = z
      .object({
        patientId: z.string().min(1),
        reason: z.string().min(3).max(500),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        city: z.string().optional(),
      })
      .parse(raw);

    const r = await rgpdRepo.addIdentityAddendum({
      tenantId: a.tenantId,
      patientId: parsed.patientId,
      authorId: a.userId,
      reason: parsed.reason,
      snapshot: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
      },
    });
    if (!r.ok) return r;

    await recordAuditEvent(a.tenantId, {
      action: "rgpd.identity_addendum",
      entityType: "patient",
      entityId: parsed.patientId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Addendum impossible",
    };
  }
}

export async function requestTenantWipeAction() {
  try {
    const a = await actorRgpd("settings.manage");
    if (!a.isTenantAdmin) throw new AccessDeniedError("Réservé à l'administrateur du cabinet");
    const wipe = await rgpdRepo.requestTenantWipe(a.tenantId);
    const approved = await rgpdRepo.approveWipe(wipe.id, "admin", a.userId);
    if ("error" in approved) return { ok: false as const, error: approved.error };
    await recordAuditEvent(a.tenantId, {
      action: "rgpd.wipe_requested",
      entityType: "tenant",
      entityId: a.tenantId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, wipe: approved };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Demande impossible",
    };
  }
}

/** Approbation plateforme (console) — second volet de la double validation. */
export async function platformApproveWipeAction(raw: unknown) {
  try {
    const parsed = z.object({ wipeId: z.string(), justification: z.string().min(10) }).parse(raw);
    const ctx = await requireContext({ permission: "console.manage", redirectOnFail: false });
    if (ctx.role !== "SUPERADMIN") throw new AccessDeniedError();
    const approved = await rgpdRepo.approveWipe(parsed.wipeId, "platform", ctx.user.id);
    if ("error" in approved) return { ok: false as const, error: approved.error };
    await writePlatformAudit({
      actorId: ctx.user.id,
      action: "rgpd.wipe_platform_approved",
      entityType: "tenant_wipe",
      entityId: parsed.wipeId,
      meta: { justification: parsed.justification },
    });
    return { ok: true as const, wipe: approved };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Approbation impossible",
    };
  }
}
