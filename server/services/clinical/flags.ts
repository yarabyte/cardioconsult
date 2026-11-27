import { eq, inArray } from "drizzle-orm";
import { featureFlags } from "@/db/tenant/schema";
import {
  CLINICAL_FEATURE_FLAGS,
  defaultClinicalFlags,
  type ClinicalFeatureFlag,
  type FeatureFlagState,
} from "@/lib/clinical/feature-flags";
import { withTenantDb } from "@/server/db/tenant-db";

function mergeFlags(rows: { key: string; enabled: boolean }[]): FeatureFlagState {
  const state = defaultClinicalFlags(false);
  for (const row of rows) {
    if (CLINICAL_FEATURE_FLAGS.includes(row.key as ClinicalFeatureFlag)) {
      state[row.key as ClinicalFeatureFlag] = row.enabled;
    }
  }
  return state;
}

export async function getClinicalFlags(tenantId: string): Promise<FeatureFlagState> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(featureFlags)
      .where(inArray(featureFlags.key, [...CLINICAL_FEATURE_FLAGS, "demo_data"]));
    const clinicalRows = rows.filter((r) =>
      CLINICAL_FEATURE_FLAGS.includes(r.key as ClinicalFeatureFlag),
    );
    const demo = rows.find((r) => r.key === "demo_data");
    const hasExplicitClinical = clinicalRows.length > 0;
    if (!hasExplicitClinical && demo?.enabled) {
      return defaultClinicalFlags(true);
    }
    if (!hasExplicitClinical) {
      return defaultClinicalFlags(false);
    }
    return mergeFlags(clinicalRows);
  });
}

export async function isClinicalFlagEnabled(
  tenantId: string,
  flag: ClinicalFeatureFlag,
): Promise<boolean> {
  const flags = await getClinicalFlags(tenantId);
  return flags[flag] === true;
}

/**
 * Activation réservée super-admin après accord documenté (P11 / P17).
 */
export async function setClinicalFlag(
  tenantId: string,
  flag: ClinicalFeatureFlag,
  enabled: boolean,
  actor: { role: string; userId?: string },
): Promise<{ ok: true; flags: FeatureFlagState } | { ok: false; error: string }> {
  if (actor.role !== "SUPERADMIN") {
    return { ok: false, error: "Réservé au super administrateur plateforme" };
  }
  if (!CLINICAL_FEATURE_FLAGS.includes(flag)) {
    return { ok: false, error: "Flag inconnu" };
  }
  await withTenantDb(tenantId, async (db) => {
    await db
      .insert(featureFlags)
      .values({
        key: flag,
        enabled,
        updatedAt: new Date(),
        updatedBy: actor.userId ?? "superadmin",
      })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: {
          enabled,
          updatedAt: new Date(),
          updatedBy: actor.userId ?? "superadmin",
        },
      });
  });
  const flags = await getClinicalFlags(tenantId);
  return { ok: true, flags: { ...flags } };
}
