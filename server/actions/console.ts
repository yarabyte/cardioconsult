"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import * as consoleRepo from "@/server/console/repository";
import {
  platformCan,
  resolvePlatformRole,
  type PlatformPermission,
} from "@/server/console/platform-rbac";
import * as supportRepo from "@/server/support/repository";
import { activateHospitalisationModule } from "@/server/hospitalisation/module";

async function requirePlatform(permission: PlatformPermission) {
  const ctx = await requireContext({ permission: "console.manage", redirectOnFail: false });
  const role = resolvePlatformRole(ctx.role);
  if (!role || !platformCan(role, permission)) {
    throw new AccessDeniedError();
  }
  return {
    userId: ctx.user.id,
    name: ctx.user.name,
    role,
  };
}

export async function loadConsoleOverviewAction() {
  try {
    await requirePlatform("console.view");
    return {
      ok: true as const,
      tenants: await consoleRepo.listTenants(),
      supervision: await consoleRepo.supervisionSnapshot(),
      supportSessions: (await supportRepo.listAll()).slice(0, 20),
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function consoleTenantAction(raw: unknown) {
  try {
    const parsed = z
      .object({
        tenantId: z.string().min(1),
        action: z.enum([
          "suspend",
          "reactivate",
          "retry_provision",
          "rpps_verify",
          "rpps_reject",
          "export",
          "flag",
          "hospitalisation_activate",
        ]),
        justification: z.string().min(10).max(2000),
        flag: z
          .enum(["clinical.scores", "clinical.alerts", "clinical.aorta", "clinical.examOrders"])
          .optional(),
        flagEnabled: z.boolean().optional(),
      })
      .parse(raw);

    const permMap = {
      suspend: "tenant.suspend",
      reactivate: "tenant.suspend",
      retry_provision: "tenant.provision",
      rpps_verify: "tenant.rpps_review",
      rpps_reject: "tenant.rpps_review",
      export: "tenant.export_trigger",
      flag: "tenant.feature_flag",
      hospitalisation_activate: "tenant.feature_flag",
    } as const satisfies Record<typeof parsed.action, PlatformPermission>;

    const actor = await requirePlatform(permMap[parsed.action]);
    let result: unknown;

    switch (parsed.action) {
      case "suspend":
        result = await consoleRepo.suspend(parsed.tenantId, parsed.justification);
        break;
      case "reactivate":
        result = await consoleRepo.reactivate(parsed.tenantId, parsed.justification);
        break;
      case "retry_provision":
        result = await consoleRepo.retryProvision(parsed.tenantId, parsed.justification);
        break;
      case "rpps_verify":
        result = await consoleRepo.setRpps(parsed.tenantId, "verified", parsed.justification);
        break;
      case "rpps_reject":
        result = await consoleRepo.setRpps(parsed.tenantId, "rejected", parsed.justification);
        break;
      case "export":
        result = await consoleRepo.triggerReversibilityExport(
          parsed.tenantId,
          parsed.justification,
        );
        break;
      case "flag":
        if (!parsed.flag || parsed.flagEnabled === undefined) {
          return { ok: false as const, error: "Flag requis" };
        }
        result = await consoleRepo.setFlag(
          parsed.tenantId,
          parsed.flag,
          parsed.flagEnabled,
          parsed.justification,
        );
        break;
      case "hospitalisation_activate": {
        const r = await activateHospitalisationModule(parsed.tenantId, {
          actorId: actor.userId,
          actorRole: "SUPERADMIN",
          establishmentContractSigned: true,
          plan: "clinique",
        });
        result = r;
        break;
      }
    }

    if (result && typeof result === "object" && "ok" in result && result.ok === false) {
      return result as { ok: false; error: string };
    }

    await writePlatformAudit({
      actorId: actor.userId,
      action: `console.${parsed.action}`,
      entityType: "tenant",
      entityId: parsed.tenantId,
      meta: {
        justification: parsed.justification,
        platformRole: actor.role,
        flag: parsed.flag,
      },
    });

    return {
      ok: true as const,
      result,
      tenants: await consoleRepo.listTenants(),
      ops: await consoleRepo.getOps(parsed.tenantId),
      flags: await consoleRepo.getFlags(parsed.tenantId),
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Action impossible",
    };
  }
}

export async function requestSupportSessionAction(raw: unknown) {
  try {
    const actor = await requirePlatform("support.request");
    const parsed = z
      .object({
        tenantId: z.string().min(1),
        reason: z.string().min(10).max(2000),
      })
      .parse(raw);

    const r = await supportRepo.request({
      tenantId: parsed.tenantId,
      platformActorId: actor.userId,
      platformActorLabel: actor.name,
      reason: parsed.reason,
    });
    if ("error" in r) return { ok: false as const, error: r.error };

    await writePlatformAudit({
      actorId: actor.userId,
      action: "support.session_requested",
      entityType: "support_session",
      entityId: r.id,
      meta: { tenantId: parsed.tenantId, justification: parsed.reason },
    });

    return { ok: true as const, session: r };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Demande impossible",
    };
  }
}

export async function consentSupportSessionAction(raw: unknown) {
  try {
    const parsed = z.object({ sessionId: z.string().min(1) }).parse(raw);
    const ctx = await requireContext({ permission: "team.manage", redirectOnFail: false });
    if (ctx.role !== "MEDECIN" || !ctx.user.isTenantAdmin) {
      throw new AccessDeniedError("Réservé à l'administrateur du cabinet");
    }
    const r = await supportRepo.consent(parsed.sessionId, {
      memberId: ctx.member?.id ?? ctx.user.id,
      label: ctx.user.name,
    });
    if ("error" in r) return { ok: false as const, error: r.error };
    return { ok: true as const, session: r };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Consentement impossible",
    };
  }
}

export async function revokeSupportSessionAction(raw: unknown) {
  try {
    const parsed = z.object({ sessionId: z.string().min(1) }).parse(raw);
    const ctx = await requireContext({ permission: "team.manage", redirectOnFail: false });
    const platform = resolvePlatformRole(ctx.role);
    if (ctx.role !== "MEDECIN" && !platform) throw new AccessDeniedError();
    const r = await supportRepo.revoke(parsed.sessionId, ctx.user.id);
    if ("error" in r) return { ok: false as const, error: r.error };
    await writePlatformAudit({
      actorId: ctx.user.id,
      action: "support.session_revoked",
      entityType: "support_session",
      entityId: r.id,
    });
    return { ok: true as const, session: r };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Révocation impossible",
    };
  }
}

export async function loadTenantSupportBannerAction(tenantId: string) {
  return {
    ok: true as const,
    session: await supportRepo.listActiveBanner(tenantId),
    pending: (await supportRepo.listForTenant(tenantId)).filter((s) => s.status === "requested"),
  };
}
