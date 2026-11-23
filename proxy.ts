import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/lib/tenant-host";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const resolved = resolveHost(host);
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-host-kind", resolved.kind);
  requestHeaders.set("x-pathname", pathname);
  if (resolved.tenantSlug) {
    requestHeaders.set("x-tenant-slug", resolved.tenantSlug);
  }

  const url = request.nextUrl.clone();

  if (resolved.kind === "console") {
    if (!pathname.startsWith("/console")) {
      url.pathname = pathname === "/" ? "/console" : `/console${pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (resolved.kind === "tenant" && resolved.tenantSlug) {
    const prefix = `/t/${resolved.tenantSlug}`;
    if (!pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${pathname === "/" ? "/tableau-de-bord" : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (resolved.kind === "reserved") {
    return new NextResponse("Sous-domaine réservé", { status: 404 });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
