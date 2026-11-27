"use server";

import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { can } from "@/lib/rbac";
import { patientArchiveSchema, patientCreateSchema } from "@/lib/validation/patient";
import {
  archivePatient,
  createPatient,
  getPatientForTenant,
  listPatients,
  restorePatient,
  type PatientListQuery,
} from "@/server/services/patients/service";
import { dismissSidebarDossier } from "@/server/services/patients/open-dossiers";
import { withAudit, recordAuditEvent } from "@/server/services/audit";
import { z } from "zod";

async function tenantActor() {
  const ctx = await requireContext({ permission: "patient.read", redirectOnFail: false });
  if (!ctx.tenant || !ctx.db) throw new AccessDeniedError("Cabinet requis");
  return {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    role: ctx.role,
    isTenantAdmin: ctx.user.isTenantAdmin,
    requestId: ctx.requestId,
    db: ctx.db,
  };
}

export async function listPatientsAction(raw: PatientListQuery) {
  try {
    const actor = await tenantActor();
    if (!can({ role: actor.role, isTenantAdmin: actor.isTenantAdmin }, "patient.read")) {
      return { ok: false as const, error: "Accès refusé" };
    }
    const result = await listPatients(actor.tenantId, raw);
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, error: "Impossible de lister les patients" };
  }
}

export async function createPatientAction(raw: unknown) {
  try {
    const ctx = await requireContext({ permission: "patient.write", redirectOnFail: false });
    if (!ctx.tenant || !ctx.db) {
      return { ok: false as const, error: { code: "tenant", message: "Cabinet requis" } };
    }
    const actor = {
      tenantId: ctx.tenant.id,
      userId: ctx.user.id,
      role: ctx.role,
      requestId: ctx.requestId,
      db: ctx.db,
    };

    const parsed = patientCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: { code: "validation", message: "Formulaire invalide." } };
    }

    const result = await createPatient(actor.tenantId, parsed.data, actor.userId);
    if (!result.ok) {
      if (result.code === "duplicate") {
        return {
          ok: false as const,
          error: { code: "duplicate" as const, duplicates: result.duplicates },
        };
      }
      return { ok: false as const, error: { code: "validation", message: result.message } };
    }

    await recordAuditEvent(
      actor.tenantId,
      {
        action: "patient.create",
        entityType: "patient",
        entityId: result.patient.id,
        actorId: actor.userId,
        actorRole: actor.role,
        requestId: actor.requestId,
      },
      actor.db,
    );

    return {
      ok: true as const,
      patientId: result.patient.id,
      dossierNumber: result.patient.dossierNumber,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: {
        code: "server",
        message: err instanceof AccessDeniedError ? err.message : "Création impossible",
      },
    };
  }
}

export async function archivePatientAction(raw: unknown) {
  try {
    const parsed = patientArchiveSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: "Motif d'archivage requis." };
    }

    const ctx = await requireContext({ permission: "patient.archive", redirectOnFail: false });
    if (!ctx.tenant) return { ok: false as const, error: "Cabinet requis" };

    // IDOR : vérifier appartenance tenant
    const existing = await getPatientForTenant(ctx.tenant.id, parsed.data.patientId);
    if (!existing) return { ok: false as const, error: "not_found" };

    await withAudit(
      ctx,
      {
        action: "patient.archive",
        entityType: "patient",
        entityId: parsed.data.patientId,
      },
      async () =>
        archivePatient(ctx.tenant!.id, parsed.data.patientId, parsed.data.reason, ctx.user.id),
    );
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Archivage impossible",
    };
  }
}

export async function restorePatientAction(patientId: string) {
  try {
    const ctx = await requireContext({ permission: "patient.archive", redirectOnFail: false });
    if (!ctx.tenant) return { ok: false as const, error: "Cabinet requis" };
    if (!ctx.db) return { ok: false as const, error: "Cabinet requis" };
    const existing = await getPatientForTenant(ctx.tenant.id, patientId);
    if (!existing) return { ok: false as const, error: "not_found" };
    await restorePatient(ctx.tenant.id, patientId, ctx.user.id);
    await recordAuditEvent(
      ctx.tenant.id,
      {
        action: "patient.restore",
        entityType: "patient",
        entityId: patientId,
        actorId: ctx.user.id,
        actorRole: ctx.role,
        requestId: ctx.requestId,
      },
      ctx.db,
    );
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Restauration impossible",
    };
  }
}

/** Retire un dossier de la liste « Dossiers ouverts » du sidebar (sans clôturer). */
export async function dismissSidebarDossierAction(raw: unknown) {
  try {
    const actor = await tenantActor();
    const { patientId } = z.object({ patientId: z.string().min(1).max(64) }).parse(raw);
    const existing = await getPatientForTenant(actor.tenantId, patientId);
    if (!existing) return { ok: false as const, error: "Patient introuvable" };
    await dismissSidebarDossier(actor.tenantId, actor.userId, patientId);
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Retrait impossible",
    };
  }
}
