"use server";

import { eq } from "drizzle-orm";
import { tenants } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { checkSubdomainAvailability, type SubdomainAvailability } from "@/lib/tenant-host";
import { containsHomoglyphs, sanitizeSlugInput } from "@/lib/slug-homoglyphs";

/** Vérifie format + réservé + unicité en base. */
export async function checkSubdomainServer(raw: string): Promise<SubdomainAvailability> {
  if (containsHomoglyphs(raw)) {
    return { status: "invalid", message: "Caractères non autorisés (homoglyphes)." };
  }
  const slug = sanitizeSlugInput(raw);
  const local = checkSubdomainAvailability(slug);
  if (local.status !== "available") return local;

  try {
    const control = getControlDb();
    const rows = await control
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (rows.length > 0) {
      return { status: "taken", message: "Ce sous-domaine est déjà pris." };
    }
  } catch {
    // DB indisponible : on s'appuie sur la liste locale TAKEN_SLUGS
  }
  return local;
}
