import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auditEvents } from "@/db/tenant/schema";
import type { TenantDb } from "@/server/db/tenant-db";
import { withTenantDb } from "@/server/db/tenant-db";
import { verifyAuditChain } from "@/server/audit/hash-chain";
import type { AuditEventRow, AuditListFilters } from "./types";

function mapAuditRow(r: typeof auditEvents.$inferSelect): AuditEventRow {
  return {
    id: r.id,
    at: r.at,
    actorId: r.actorId,
    actorRole: r.actorRole,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    outcome: r.outcome as AuditEventRow["outcome"],
    ipTruncated: r.ipTruncated,
    userAgentHash: r.userAgentHash,
    requestId: r.requestId,
    prevHash: r.prevHash,
    hash: r.hash,
  };
}

export async function listAuditEvents(
  tenantId: string,
  filters: AuditListFilters = {},
  db?: TenantDb,
): Promise<AuditEventRow[]> {
  if (!db) {
    return withTenantDb(tenantId, (d) => listAuditEvents(tenantId, filters, d));
  }

  const limit = Math.min(filters.limit ?? 100, 500);

  const conditions = [];
  if (filters.from) conditions.push(gte(auditEvents.at, filters.from));
  if (filters.to) conditions.push(lte(auditEvents.at, filters.to));
  if (filters.actorId) conditions.push(eq(auditEvents.actorId, filters.actorId));
  if (filters.action) conditions.push(eq(auditEvents.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditEvents.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditEvents.entityId, filters.entityId));

  const rows = await db
    .select()
    .from(auditEvents)
    .where(conditions.length ? and(...conditions) : sql`true`)
    .orderBy(desc(auditEvents.at))
    .limit(limit);

  return rows.map(mapAuditRow);
}

export async function checkAuditIntegrity(
  tenantId: string,
  db?: TenantDb,
): Promise<
  { ok: true; count: number } | { ok: false; count: number; reason: string; index: number }
> {
  if (!db) {
    return withTenantDb(tenantId, (d) => checkAuditIntegrity(tenantId, d));
  }

  const rows = await db.select().from(auditEvents).orderBy(auditEvents.at);
  const events = rows.map(mapAuditRow);

  const chain = verifyAuditChain(
    events.map((e) => ({
      id: e.id,
      at: e.at.toISOString(),
      actorId: e.actorId ?? null,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      outcome: e.outcome,
      prevHash: e.prevHash,
      hash: e.hash,
    })),
  );

  if (!chain.ok) {
    return { ok: false, count: events.length, reason: chain.reason, index: chain.index };
  }
  return { ok: true, count: events.length };
}
