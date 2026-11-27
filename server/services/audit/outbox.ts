import { eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { auditOutbox } from "@/db/tenant/schema";
import type { TenantDb } from "@/server/db/tenant-db";
import { withTenantDb } from "@/server/db/tenant-db";
import { recordAuditEvent } from "./record";
import type { AuditEventInput } from "./types";

/**
 * Lectures (ex. patient.open) : écriture outbox, flush asynchrone garanti.
 */
export async function enqueueAuditRead(
  tenantId: string,
  input: AuditEventInput,
  db?: TenantDb,
): Promise<string> {
  const id = uuidv7();
  if (!db) {
    await withTenantDb(tenantId, async (d) => {
      await d.insert(auditOutbox).values({ id, payload: input });
    });
    return id;
  }
  await db.insert(auditOutbox).values({
    id,
    payload: input,
  });
  return id;
}

/** Traite l'outbox → audit_event (même chaîne de hash). */
export async function flushAuditOutbox(tenantId: string, db?: TenantDb): Promise<number> {
  if (!db) {
    return withTenantDb(tenantId, (d) => flushAuditOutbox(tenantId, d));
  }

  const rows = await db
    .select()
    .from(auditOutbox)
    .where(isNull(auditOutbox.processedAt))
    .limit(100);

  let n = 0;
  for (const row of rows) {
    const payload = row.payload as AuditEventInput;
    await recordAuditEvent(tenantId, payload, db);
    await db.update(auditOutbox).set({ processedAt: new Date() }).where(eq(auditOutbox.id, row.id));
    n++;
  }
  return n;
}
