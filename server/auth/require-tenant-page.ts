import { redirect } from "next/navigation";
import {
  AccessDeniedError,
  requireContext,
  type RequestContext,
  type RequireContextOptions,
} from "@/server/auth/require-context";
import type { TenantDb } from "@/server/db/tenant-db";

export type TenantPageContext = RequestContext & {
  tenant: NonNullable<RequestContext["tenant"]>;
  db: TenantDb;
};

/**
 * Page protégée cabinet : session + tenant résolu sur l'hôte + base tenant.
 */
export async function requireTenantPage(opts: RequireContextOptions): Promise<TenantPageContext> {
  const ctx = await requireContext(opts);
  if (!ctx.tenant || !ctx.db) {
    if (opts.redirectOnFail !== false) redirect("/connexion");
    throw new AccessDeniedError("Cabinet indisponible");
  }
  return ctx as TenantPageContext;
}
