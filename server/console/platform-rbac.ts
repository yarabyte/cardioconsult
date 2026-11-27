/**
 * Rôles plateforme distincts (moindre privilège) — jamais d'accès dossiers patients.
 */

export type PlatformRole = "PLATFORM_ADMIN" | "PLATFORM_SUPPORT" | "PLATFORM_BILLING";

export type PlatformPermission =
  | "console.view"
  | "tenant.list"
  | "tenant.suspend"
  | "tenant.provision"
  | "tenant.feature_flag"
  | "tenant.rpps_review"
  | "tenant.export_trigger"
  | "support.request"
  | "support.access"
  | "billing.view"
  | "supervision.view";

const MATRIX: Record<PlatformRole, readonly PlatformPermission[]> = {
  PLATFORM_ADMIN: [
    "console.view",
    "tenant.list",
    "tenant.suspend",
    "tenant.provision",
    "tenant.feature_flag",
    "tenant.rpps_review",
    "tenant.export_trigger",
    "support.request",
    "support.access",
    "billing.view",
    "supervision.view",
  ],
  PLATFORM_SUPPORT: [
    "console.view",
    "tenant.list",
    "tenant.provision",
    "tenant.rpps_review",
    "support.request",
    "support.access",
    "supervision.view",
  ],
  PLATFORM_BILLING: ["console.view", "tenant.list", "billing.view", "tenant.export_trigger"],
};

/** Mapping démo : SUPERADMIN → PLATFORM_ADMIN. */
export function resolvePlatformRole(role: string): PlatformRole | null {
  if (role === "SUPERADMIN" || role === "PLATFORM_ADMIN") return "PLATFORM_ADMIN";
  if (role === "PLATFORM_SUPPORT") return "PLATFORM_SUPPORT";
  if (role === "PLATFORM_BILLING") return "PLATFORM_BILLING";
  return null;
}

export function platformCan(role: PlatformRole, permission: PlatformPermission): boolean {
  return MATRIX[role].includes(permission);
}

/** Interdit absolu : aucune permission clinique pour un acteur plateforme. */
export const PLATFORM_FORBIDDEN_CLINICAL = [
  "patient.read",
  "patient.write",
  "encounter.write",
  "vitals.write",
  "document.write",
  "prescription.write",
] as const;
