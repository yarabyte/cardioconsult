import { desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { auditEvents } from "@/db/tenant/schema";
import { computeAuditHash } from "@/server/audit/hash-chain";
import type { TenantDb } from "@/server/db/tenant-db";
import { withTenantDb } from "@/server/db/tenant-db";
import type { AuditEventInput, AuditEventRow } from "./types";

function buildRow(input: AuditEventInput, prevHash: string | null): AuditEventRow {
  const id = uuidv7();
  const at = new Date();
  const outcome = input.outcome ?? "success";
  const hash = computeAuditHash({
    id,
    at: at.toISOString(),
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    outcome,
    prevHash,
  });
  return {
    id,
    at,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    outcome,
    ipTruncated: input.ipTruncated ?? null,
    userAgentHash: input.userAgentHash ?? null,
    requestId: input.requestId ?? null,
    prevHash,
    hash,
  };
}

async function recordAuditEventOnDb(
  tenantId: string,
  input: AuditEventInput,
  db: TenantDb,
): Promise<AuditEventRow> {
  const [last] = await db
    .select({ hash: auditEvents.hash })
    .from(auditEvents)
    .orderBy(desc(auditEvents.at))
    .limit(1);
  const prevHash = last?.hash ?? null;
  const row = buildRow(input, prevHash);
  await db.insert(auditEvents).values({
    id: row.id,
    at: row.at,
    actorId: row.actorId,
    actorRole: row.actorRole ? String(row.actorRole) : null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    outcome: row.outcome,
    ipTruncated: row.ipTruncated,
    userAgentHash: row.userAgentHash,
    requestId: row.requestId,
    prevHash: row.prevHash,
    hash: row.hash,
  });
  return row;
}

/** Enregistre un événement dans la transaction / client Drizzle courant. */
export async function recordAuditEvent(
  tenantId: string,
  input: AuditEventInput,
  db?: TenantDb,
): Promise<AuditEventRow> {
  if (!db) {
    return withTenantDb(tenantId, (d) => recordAuditEventOnDb(tenantId, input, d));
  }
  return recordAuditEventOnDb(tenantId, input, db);
}

export async function getLastAuditHash(tenantId: string, db: TenantDb): Promise<string | null> {
  const [last] = await db
    .select({ hash: auditEvents.hash })
    .from(auditEvents)
    .orderBy(desc(auditEvents.at))
    .limit(1);
  return last?.hash ?? null;
}

export { eq };
