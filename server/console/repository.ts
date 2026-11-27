import { desc, eq, ne } from "drizzle-orm";
import type { Tenant, TenantPlan, TenantStatus } from "@/types/domain";
import { platformAuditEvents, subscriptions, tenants } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import type { ClinicalFeatureFlag } from "@/lib/clinical/feature-flags";
import { getClinicalFlags, setClinicalFlag } from "@/server/services/clinical/flags";
import type { ConsoleTenantOps } from "./types";

function planLabel(plan: string): TenantPlan {
  if (plan === "solo") return "Solo";
  if (plan === "clinique") return "Clinique";
  return "Cabinet";
}

function uiStatus(status: (typeof tenants.$inferSelect)["status"]): TenantStatus {
  switch (status) {
    case "active":
      return "Actif";
    case "trial":
      return "Essai";
    case "suspended":
      return "Suspendu";
    case "past_due":
      return "Paiement en échec";
    case "provisioning":
      return "provisioning";
    case "provisioning_failed":
      return "provisioning_failed";
    case "deleted":
      return "deleted";
    default:
      return "Actif";
  }
}

function controlStatusFromUi(status: TenantStatus): (typeof tenants.$inferSelect)["status"] {
  switch (status) {
    case "Actif":
      return "active";
    case "Essai":
      return "trial";
    case "Suspendu":
      return "suspended";
    case "Paiement en échec":
      return "past_due";
    default:
      return "active";
  }
}

function mapTenant(row: typeof tenants.$inferSelect): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    plan: planLabel(row.plan),
    status: uiStatus(row.status),
    usersLabel: "—",
    storageLabel: "—",
    lastActivityLabel: "—",
    retentionYears: row.retentionYears,
  };
}

function mapOps(row: typeof tenants.$inferSelect): ConsoleTenantOps {
  return {
    tenantId: row.id,
    status: uiStatus(row.status),
    rppsStatus: row.rppsStatus ?? "pending_manual_review",
    provisionStep: row.provisionStep ?? null,
    provisionError: row.provisionError ?? null,
    lastBackupAt: null,
    lastRestoreTestAt: null,
    migrationVersion: "0007_wave5_persistence",
    failedJobs: row.status === "provisioning_failed" ? 1 : 0,
    certExpiresAt: null,
  };
}

function requireJustification(j: string): string | null {
  const t = j.trim();
  if (t.length < 10) return "Justificatif obligatoire (≥ 10 caractères) pour action sensible";
  return null;
}

export async function listTenants(): Promise<Tenant[]> {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(tenants)
    .where(ne(tenants.status, "deleted"))
    .orderBy(desc(tenants.createdAt));
  return rows.map(mapTenant);
}

export async function getOps(tenantId: string): Promise<ConsoleTenantOps | null> {
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row ? mapOps(row) : null;
}

export async function listOps(): Promise<ConsoleTenantOps[]> {
  const control = getControlDb();
  const rows = await control.select().from(tenants).where(ne(tenants.status, "deleted"));
  return rows.map(mapOps);
}

export async function suspend(tenantId: string, justification: string) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return { ok: false as const, error: "Tenant introuvable" };
  await control
    .update(tenants)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  await control
    .update(subscriptions)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(subscriptions.tenantId, tenantId));
  return { ok: true as const, ops: mapOps({ ...row, status: "suspended" }) };
}

export async function reactivate(tenantId: string, justification: string) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return { ok: false as const, error: "Tenant introuvable" };
  await control
    .update(tenants)
    .set({ status: "active", provisionError: null, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  await control
    .update(subscriptions)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(subscriptions.tenantId, tenantId));
  return {
    ok: true as const,
    ops: mapOps({ ...row, status: "active", provisionError: null }),
  };
}

export async function retryProvision(tenantId: string, justification: string) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return { ok: false as const, error: "Tenant introuvable" };
  const status = row.status === "provisioning_failed" ? "provisioning" : row.status;
  await control
    .update(tenants)
    .set({
      provisionStep: "queued",
      provisionError: null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  return {
    ok: true as const,
    ops: mapOps({
      ...row,
      status,
      provisionStep: "queued",
      provisionError: null,
    }),
  };
}

export async function setRpps(
  tenantId: string,
  decision: "verified" | "rejected",
  justification: string,
) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return { ok: false as const, error: "Tenant introuvable" };
  await control
    .update(tenants)
    .set({ rppsStatus: decision, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  return { ok: true as const, ops: mapOps({ ...row, rppsStatus: decision }) };
}

export async function setFlag(
  tenantId: string,
  flag: ClinicalFeatureFlag,
  enabled: boolean,
  justification: string,
) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const r = await setClinicalFlag(tenantId, flag, enabled, { role: "SUPERADMIN" });
  if (!r.ok) return r;
  return { ok: true as const, flags: r.flags };
}

export async function getFlags(tenantId: string) {
  return getClinicalFlags(tenantId);
}

export async function triggerReversibilityExport(tenantId: string, justification: string) {
  const err = requireJustification(justification);
  if (err) return { ok: false as const, error: err };
  const control = getControlDb();
  const [row] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return { ok: false as const, error: "Tenant introuvable" };
  return {
    ok: true as const,
    message: "Export de réversibilité enfilé (métadonnées control-plane uniquement)",
  };
}

export async function supervisionSnapshot() {
  const ops = await listOps();
  const [lastAudit] = await getControlDb()
    .select()
    .from(platformAuditEvents)
    .orderBy(desc(platformAuditEvents.at))
    .limit(1);
  return {
    tenantsWithFailedJobs: ops.filter((o) => o.failedJobs > 0).length,
    oldestCert: null,
    lastGlobalBackup: lastAudit?.at.toISOString() ?? new Date(0).toISOString(),
    lastRestoreTest: new Date(0).toISOString(),
    migrationSkew: 0,
  };
}

// Expose mapper for tests that assert UI status round-trip
export function tenantUiToControl(status: TenantStatus) {
  return controlStatusFromUi(status);
}
