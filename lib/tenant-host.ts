export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cardioconsult.fr";

export const RESERVED_SUBDOMAINS = [
  "www",
  "app",
  "api",
  "admin",
  "console",
  "support",
  "demo",
  "cardio",
] as const;

export const TENANT_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export type HostKind = "root" | "console" | "tenant" | "reserved";

export interface ResolvedHost {
  kind: HostKind;
  hostname: string;
  tenantSlug: string | null;
}

function stripPort(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** Resolve host kind from a hostname (with or without port). */
export function resolveHost(hostHeader: string | null | undefined): ResolvedHost {
  const hostname = stripPort(hostHeader ?? "localhost");

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}`
  ) {
    return { kind: "root", hostname, tenantSlug: null };
  }

  const parts = hostname.split(".");

  if (hostname.endsWith(".localhost") && parts.length >= 2) {
    const sub = parts[0]!;
    if (sub === "console") {
      return { kind: "console", hostname, tenantSlug: null };
    }
    if ((RESERVED_SUBDOMAINS as readonly string[]).includes(sub)) {
      return { kind: "reserved", hostname, tenantSlug: null };
    }
    return { kind: "tenant", hostname, tenantSlug: sub };
  }

  if (hostname === `console.${ROOT_DOMAIN}`) {
    return { kind: "console", hostname, tenantSlug: null };
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`) && parts.length >= 3) {
    const sub = parts[0]!;
    if ((RESERVED_SUBDOMAINS as readonly string[]).includes(sub)) {
      return { kind: "reserved", hostname, tenantSlug: null };
    }
    return { kind: "tenant", hostname, tenantSlug: sub };
  }

  return { kind: "root", hostname, tenantSlug: null };
}

export function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_REGEX.test(slug);
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(slug);
}

export type SubdomainAvailability =
  | { status: "available"; preview: string }
  | { status: "too_short"; message: string }
  | { status: "invalid"; message: string }
  | { status: "reserved"; message: string }
  | { status: "taken"; message: string };

const TAKEN_SLUGS = new Set([
  "dr-martin",
  "cardio-lyon-sud",
  "coeur-atlantique",
  "dr-benoit",
  "cardio-provence",
  "dr-lemaire",
]);

export function checkSubdomainAvailability(raw: string): SubdomainAvailability {
  const slug = raw.trim().toLowerCase();
  const preview = `${slug || "…"}.${ROOT_DOMAIN}`;

  if (slug.length < 2) {
    return { status: "too_short", message: "Trop court (2 caractères minimum)." };
  }
  if (!isValidTenantSlug(slug)) {
    return {
      status: "invalid",
      message: "Utilisez uniquement a-z, 0-9 et des tirets (pas en début/fin).",
    };
  }
  if (isReservedSlug(slug)) {
    return { status: "reserved", message: "Ce sous-domaine est réservé." };
  }
  if (TAKEN_SLUGS.has(slug)) {
    return { status: "taken", message: "Ce sous-domaine est déjà pris." };
  }
  return { status: "available", preview };
}