/**
 * Vérifie l'intégrité de la chaîne d'audit d'un tenant.
 * Usage : pnpm audit:verify --tenant=dr-martin
 */
import { eq } from "drizzle-orm";
import { tenants } from "@/db/control/schema";
import { getControlDb, closeControlDb } from "@/server/db/control-db";
import { withTenantDb, closeTenantPools } from "@/server/db/tenant-db";
import { checkAuditIntegrity } from "@/server/services/audit";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const slug = arg("tenant");
  if (!slug) {
    console.error("Usage: pnpm audit:verify --tenant=<slug>");
    process.exit(2);
  }

  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tenant) {
    console.error(`Tenant ${slug} introuvable`);
    process.exit(1);
  }

  const result = await withTenantDb(tenant.id, async (db) => checkAuditIntegrity(tenant.id, db));
  if (!result.ok) {
    console.error(`ÉCHEC intégrité index=${result.index} ${result.reason} (n=${result.count})`);
    process.exit(1);
  }
  console.log(`OK — tenant ${slug} — ${result.count} événement(s)`);
  await closeTenantPools();
  await closeControlDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
