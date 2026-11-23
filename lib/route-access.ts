import type { Role } from "@/types/domain";

const INFIRMIERE_PREFIXES = ["/agenda", "/infirmiere"] as const;
const MEDECIN_BLOCKED = ["/infirmiere"] as const;

export function normalizeTenantPath(pathname: string): string {
  const match = pathname.match(/^\/t\/[^/]+(\/.*)?$/);
  if (match) return match[1] || "/tableau-de-bord";
  return pathname;
}

export function isRoleAllowedOnPath(role: Role, pathname: string): boolean {
  const path = normalizeTenantPath(pathname);
  if (role === "SUPERADMIN") return false;
  if (role === "INFIRMIERE") {
    return INFIRMIERE_PREFIXES.some((pre) => path === pre || path.startsWith(`${pre}/`));
  }
  if (role === "MEDECIN") {
    return !MEDECIN_BLOCKED.some((pre) => path === pre || path.startsWith(`${pre}/`));
  }
  return false;
}

export function primaryActionForRole(role: Role): { label: string; href: string } | undefined {
  switch (role) {
    case "MEDECIN":
      return {
        label: "Nouvelle consultation",
        href: "/consultations/enc-ett-lefevre/echocardiographie",
      };
    case "INFIRMIERE":
      return { label: "Transmission", href: "/infirmiere/surveillance/hosp-arnaud" };
    default:
      return undefined;
  }
}