import { describe, expect, it } from "vitest";
import pg from "pg";

/**
 * Tests d'intégration P02 — nécessitent Postgres (docker compose).
 * Sautés automatiquement si DATABASE_URL est injoignable.
 */
async function canReachPostgres(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 1500, max: 1 });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

const reachable = await canReachPostgres();

describe.skipIf(!reachable)("provisioning multi-tenant (intégration)", () => {
  it("le rôle du tenant A ne peut pas se connecter à la base B", async () => {
    const { uuidv7 } = await import("uuidv7");
    const { getControlDb, closeControlDb } = await import("./control-db");
    const { provisionTenant } = await import("@/server/jobs/tenant-provision");
    const { tenants } = await import("@/db/control/schema");
    const { closeTenantPools } = await import("./tenant-db");
    const { eq } = await import("drizzle-orm");

    const control = getControlDb();
    const idA = uuidv7();
    const idB = uuidv7();
    await control.insert(tenants).values([
      { id: idA, slug: `t-a-${idA.slice(0, 8)}`, name: "Tenant A", status: "provisioning" },
      { id: idB, slug: `t-b-${idB.slice(0, 8)}`, name: "Tenant B", status: "provisioning" },
    ]);

    await provisionTenant({ tenantId: idA });
    await provisionTenant({ tenantId: idB });

    const [a] = await control.select().from(tenants).where(eq(tenants.id, idA)).limit(1);
    const [b] = await control.select().from(tenants).where(eq(tenants.id, idB)).limit(1);
    expect(a?.status).toBe("active");
    expect(b?.status).toBe("active");
    expect(a?.dbName).not.toBe(b?.dbName);

    // Mot de passe A vers base B doit échouer
    const { tenantDbSecrets } = await import("@/db/control/schema");
    const { decryptDbPassword } = await import("@/server/crypto/db-password");
    const { env } = await import("@/env");
    const [secretA] = await control
      .select()
      .from(tenantDbSecrets)
      .where(eq(tenantDbSecrets.tenantId, idA))
      .limit(1);
    const passwordA = decryptDbPassword(env.APP_SECRET, secretA!.passwordEnc);
    const badUrl = `postgresql://${a!.dbRole}:${encodeURIComponent(passwordA)}@127.0.0.1:5432/${b!.dbName}`;
    const badPool = new pg.Pool({
      connectionString: badUrl,
      max: 1,
      connectionTimeoutMillis: 2000,
    });
    await expect(badPool.query("SELECT 1")).rejects.toThrow();
    await badPool.end().catch(() => undefined);

    await closeTenantPools();
    await closeControlDb();
  }, 120_000);

  it("refuse UPDATE sur audit_event", async () => {
    const { uuidv7 } = await import("uuidv7");
    const { getControlDb, closeControlDb } = await import("./control-db");
    const { provisionTenant } = await import("@/server/jobs/tenant-provision");
    const { withTenantDb, closeTenantPools } = await import("./tenant-db");
    const { tenants } = await import("@/db/control/schema");
    const { auditEvents } = await import("@/db/tenant/schema");
    const { computeAuditHash } = await import("@/server/audit/hash-chain");
    const { eq } = await import("drizzle-orm");

    const control = getControlDb();
    const id = uuidv7();
    await control.insert(tenants).values({
      id,
      slug: `t-aud-${id.slice(0, 8)}`,
      name: "Tenant Audit",
      status: "provisioning",
    });
    await provisionTenant({ tenantId: id });

    await withTenantDb(id, async (db) => {
      const event = {
        id: uuidv7(),
        at: new Date(),
        actorId: null,
        actorRole: null,
        action: "test.insert",
        entityType: "patient",
        entityId: "p1",
        outcome: "success",
        ipTruncated: null,
        userAgentHash: null,
        requestId: null,
        prevHash: null,
        hash: "",
      };
      event.hash = computeAuditHash({
        id: event.id,
        at: event.at.toISOString(),
        actorId: null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        outcome: event.outcome,
        prevHash: null,
      });
      await db.insert(auditEvents).values(event);
      await expect(
        db.update(auditEvents).set({ action: "tamper" }).where(eq(auditEvents.id, event.id)),
      ).rejects.toThrow(/append-only/i);
    });

    await closeTenantPools();
    await closeControlDb();
  }, 120_000);
});
