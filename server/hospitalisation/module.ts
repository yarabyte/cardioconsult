/**
 * Module hospitalisation : offre Clinique + case « contrat établissement signé » (super admin).
 */

import { eq } from "drizzle-orm";
import { featureFlags, settings } from "@/db/tenant/schema";
import { withTenantDb } from "@/server/db/tenant-db";
import type { TenantDb } from "@/server/db/tenant-db";
import {
  HOSPITALISATION_FLAG_KEY,
  HOSPITALISATION_MODULE_SETTING,
} from "@/server/hospitalisation/types";

export type HospitalisationModuleState = {
  enabled: boolean;
  plan: "solo" | "cabinet" | "clinique";
  establishmentContractSigned: boolean;
  signedAt: string | null;
  signedBy: string | null;
};

type ModuleSettingPayload = {
  plan: "solo" | "cabinet" | "clinique";
  establishmentContractSigned: boolean;
  signedAt: string | null;
  signedBy: string | null;
};

function parseModuleSetting(raw: unknown): ModuleSettingPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const plan = o.plan;
  if (plan !== "solo" && plan !== "cabinet" && plan !== "clinique") return null;
  return {
    plan,
    establishmentContractSigned: Boolean(o.establishmentContractSigned),
    signedAt: typeof o.signedAt === "string" ? o.signedAt : null,
    signedBy: typeof o.signedBy === "string" ? o.signedBy : null,
  };
}

function defaultDisabled(): HospitalisationModuleState {
  return {
    enabled: false,
    plan: "cabinet",
    establishmentContractSigned: false,
    signedAt: null,
    signedBy: null,
  };
}

export async function getHospitalisationModuleOnDb(
  db: TenantDb,
): Promise<HospitalisationModuleState> {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, HOSPITALISATION_FLAG_KEY))
    .limit(1);
  const [settingRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HOSPITALISATION_MODULE_SETTING))
    .limit(1);

  const moduleSetting = parseModuleSetting(settingRow?.value);
  if (!flag?.enabled || !moduleSetting) {
    return defaultDisabled();
  }

  return {
    enabled: true,
    plan: moduleSetting.plan,
    establishmentContractSigned: moduleSetting.establishmentContractSigned,
    signedAt: moduleSetting.signedAt,
    signedBy: moduleSetting.signedBy,
  };
}

export async function getHospitalisationModule(
  tenantId: string,
): Promise<HospitalisationModuleState> {
  return withTenantDb(tenantId, (db) => getHospitalisationModuleOnDb(db));
}

export async function isHospitalisationEnabled(tenantId: string): Promise<boolean> {
  const s = await getHospitalisationModule(tenantId);
  return s.enabled && s.plan === "clinique" && s.establishmentContractSigned;
}

export async function isHospitalisationEnabledOnDb(db: TenantDb): Promise<boolean> {
  const s = await getHospitalisationModuleOnDb(db);
  return s.enabled && s.plan === "clinique" && s.establishmentContractSigned;
}

/**
 * Activation réservée SUPERADMIN après case contrat établissement.
 * Tracée côté action.
 */
export async function activateHospitalisationModule(
  tenantId: string,
  input: {
    actorId: string;
    actorRole: string;
    establishmentContractSigned: boolean;
    plan: "clinique";
  },
): Promise<{ ok: true; state: HospitalisationModuleState } | { ok: false; error: string }> {
  if (input.actorRole !== "SUPERADMIN") {
    return { ok: false, error: "Réservé au super administrateur plateforme" };
  }
  if (!input.establishmentContractSigned) {
    return {
      ok: false,
      error:
        "Case « contrat établissement signé » obligatoire (responsable du traitement = établissement)",
    };
  }

  const signedAt = new Date().toISOString();
  const payload: ModuleSettingPayload = {
    plan: input.plan,
    establishmentContractSigned: true,
    signedAt,
    signedBy: input.actorId,
  };

  await withTenantDb(tenantId, async (db) => {
    await db
      .insert(featureFlags)
      .values({
        key: HOSPITALISATION_FLAG_KEY,
        enabled: true,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: {
          enabled: true,
          updatedAt: new Date(),
          updatedBy: input.actorId,
        },
      });

    await db
      .insert(settings)
      .values({
        key: HOSPITALISATION_MODULE_SETTING,
        value: payload,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: payload,
          updatedAt: new Date(),
          updatedBy: input.actorId,
        },
      });
  });

  const state: HospitalisationModuleState = {
    enabled: true,
    plan: "clinique",
    establishmentContractSigned: true,
    signedAt,
    signedBy: input.actorId,
  };
  return { ok: true, state };
}
