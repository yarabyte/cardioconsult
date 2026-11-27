import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/lib/tenant-host";
import {
  buildSecurityHeaders,
  createRequestId,
  createRequestNonce,
  stripInternalRequestHeaders,
} from "@/lib/security/headers";

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";
  const headers = buildSecurityHeaders({ nonce, isProduction });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const resolved = resolveHost(host);
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  // Ne jamais faire confiance aux en-têtes internes fournis par le client (tous les chemins).
  stripInternalRequestHeaders(requestHeaders);

  if (pathname.startsWith("/_next") || pathname.startsWith("/brand") || pathname.includes(".")) {
    const passthrough = NextResponse.next({ request: { headers: requestHeaders } });
    const nonce = createRequestNonce();
    return withSecurityHeaders(passthrough, nonce);
  }

  const nonce = createRequestNonce();
  const requestId = createRequestId();
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-host-kind", resolved.kind);
  if (resolved.tenantSlug) {
    requestHeaders.set("x-tenant-slug", resolved.tenantSlug);
    // Identifiant logique résolu côté serveur uniquement (slug tant que P02 n'injecte pas l'UUID).
    requestHeaders.set("x-cc-tenant", resolved.tenantSlug);
  }

  // Routes API globales (Better Auth, webhooks…) : pas de rewrite /t/<slug> ni /console.
  if (pathname.startsWith("/api")) {
    requestHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return withSecurityHeaders(response, nonce);
  }

  const url = request.nextUrl.clone();

  if (resolved.kind === "console") {
    if (!pathname.startsWith("/console")) {
      url.pathname = pathname === "/" ? "/console" : `/console${pathname}`;
      requestHeaders.set("x-pathname", url.pathname);
      const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      return withSecurityHeaders(response, nonce);
    }
    requestHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return withSecurityHeaders(response, nonce);
  }

  if (resolved.kind === "tenant" && resolved.tenantSlug) {
    const prefix = `/t/${resolved.tenantSlug}`;
    if (!pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${pathname === "/" ? "/tableau-de-bord" : pathname}`;
      requestHeaders.set("x-pathname", url.pathname);
      const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      return withSecurityHeaders(response, nonce);
    }
    requestHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return withSecurityHeaders(response, nonce);
  }

  if (resolved.kind === "reserved") {
    const response = new NextResponse("Sous-domaine réservé", { status: 404 });
    return withSecurityHeaders(response, nonce);
  }

  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return withSecurityHeaders(response, nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
