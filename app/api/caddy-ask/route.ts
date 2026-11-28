import { NextResponse, type NextRequest } from "next/server";
import { isReservedSlug, isValidTenantSlug, ROOT_DOMAIN } from "@/lib/tenant-host";

/**
 * Endpoint « ask » Caddy on_demand_tls (GET ?domain=).
 * Autorise apex / www / console / slugs tenant valides — jamais de donnée clinique.
 * @see https://caddyserver.com/docs/caddyfile/options#on-demand-tls
 */
export function GET(request: NextRequest) {
  const domain = (request.nextUrl.searchParams.get("domain") ?? "").trim().toLowerCase();
  if (!domain || domain.length > 253) {
    return new NextResponse(null, { status: 400 });
  }

  const apex = ROOT_DOMAIN.toLowerCase();
  if (domain === apex || domain === `www.${apex}` || domain === `console.${apex}`) {
    return new NextResponse(null, { status: 200 });
  }

  const suffix = `.${apex}`;
  if (!domain.endsWith(suffix)) {
    return new NextResponse(null, { status: 400 });
  }

  const sub = domain.slice(0, -suffix.length);
  if (!sub || sub.includes(".") || isReservedSlug(sub) || !isValidTenantSlug(sub)) {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 200 });
}
