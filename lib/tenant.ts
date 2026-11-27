import { headers } from "next/headers";
import { resolveHost, type HostKind } from "./tenant-host";

export * from "./tenant-host";

/** Server helper: current tenant slug from request headers (set by proxy). */
export async function getTenant(): Promise<string | null> {
  const h = await headers();
  const fromHeader = h.get("x-tenant-slug");
  if (fromHeader) return fromHeader;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return resolveHost(host).tenantSlug;
}

export async function getHostKind(): Promise<HostKind> {
  const h = await headers();
  const fromHeader = h.get("x-host-kind") as HostKind | null;
  if (fromHeader) return fromHeader;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return resolveHost(host).kind;
}
