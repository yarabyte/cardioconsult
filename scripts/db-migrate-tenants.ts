import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { eq, inArray } from "drizzle-orm";
import { tenants } from "@/db/control/schema";
import { getControlDb, closeControlDb } from "@/server/db/control-db";

const BATCH = 10;
const LOCK_KEY = 4202002;

/**
 * Applique les migrations tenant par lots, avec verrou consultatif et reprise.
 */
async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!adminUrl) throw new Error("DATABASE_URL requis");

  const control = getControlDb();
  const admin = new pg.Pool({ connectionString: adminUrl, max: 2 });

  try {
    await admin.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    const rows = await control
      .select()
      .from(tenants)
      .where(inArray(tenants.status, ["active", "trial", "provisioning"]));

    const migrationFiles = [
      "0000_init.sql",
      "0001_audit_outbox.sql",
      "0002_patients.sql",
      "0003_agenda.sql",
      "0004_examens_fichiers.sql",
    ];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      for (const tenant of batch) {
        if (!tenant.dbName) {
          console.warn(`Skip ${tenant.id}: pas de dbName`);
          continue;
        }
        const url = adminUrl.replace(/\/[^/]+$/, `/${tenant.dbName}`);
        const pool = new pg.Pool({ connectionString: url, max: 1 });
        try {
          for (const file of migrationFiles) {
            const sqlPath = path.join(process.cwd(), "db/tenant/migrations", file);
            const migrationSql = await readFile(sqlPath, "utf8");
            await pool.query(migrationSql);
          }

          console.log(`Migré ${tenant.slug} → ${tenant.dbName}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await control
            .update(tenants)
            .set({
              status: "provisioning_failed",
              provisionError: `migrate: ${message}`,
              updatedAt: new Date(),
            })
            .where(eq(tenants.id, tenant.id));

          console.error(`Échec ${tenant.slug}: ${message}`);
        } finally {
          await pool.end();
        }
      }
    }
  } finally {
    await admin.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    await admin.end();
    await closeControlDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
