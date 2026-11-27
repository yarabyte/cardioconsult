export interface SecurityHeadersOptions {
  nonce: string;
  isProduction: boolean;
}

/**
 * En-têtes de sécurité (règle 02). CSP stricte avec nonce ; pas de `unsafe-inline` scripts.
 * `style-src` autorise `'unsafe-inline'` pour le CSS runtime Tailwind / next/font (ADR P01).
 * `'unsafe-eval'` uniquement hors production : React / Next.js (Turbopack) en ont besoin
 * pour les callstacks de debug ; jamais en production (ADR-010).
 */
export function buildContentSecurityPolicy(
  nonce: string,
  options: { isProduction?: boolean } = {},
): string {
  const isProduction = options.isProduction ?? true;
  const scriptSrc = isProduction
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  // En local HTTP : pas d'upgrade-insecure-requests (sinon le navigateur force HTTPS
  // et casse Turbopack / HMR). connect-src élargi pour le websocket de hot-reload.
  const connectSrc = isProduction
    ? "connect-src 'self'"
    : "connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:*";
  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    connectSrc,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

export function buildSecurityHeaders(options: SecurityHeadersOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy(options.nonce, {
      isProduction: options.isProduction,
    }),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };

  if (options.isProduction) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

/** En-têtes internes que le client ne doit jamais pouvoir forger. */
export const INTERNAL_REQUEST_HEADERS = [
  "x-cc-tenant",
  "x-tenant-slug",
  "x-host-kind",
  "x-pathname",
  "x-nonce",
  "x-request-id",
] as const;

export function stripInternalRequestHeaders(headers: Headers): void {
  for (const name of INTERNAL_REQUEST_HEADERS) {
    headers.delete(name);
  }
}

export function createRequestNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function createRequestId(): string {
  return crypto.randomUUID();
}
