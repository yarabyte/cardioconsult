import { eq } from "drizzle-orm";
import { tenants } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { isReservedSlug, isValidTenantSlug } from "@/lib/tenant-host";

export type TenantBySlug = {
  id: string;
  slug: string;
  name: string;
  status: (typeof tenants.$inferSelect)["status"];
};

/** Retourne le cabinet si le slug est valide et présent (hors `deleted`). */
export async function findTenantBySlug(slug: string): Promise<TenantBySlug | null> {
  if (!isValidTenantSlug(slug) || isReservedSlug(slug)) return null;

  const control = getControlDb();
  const [row] = await control
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!row || row.status === "deleted") return null;
  return row;
}
