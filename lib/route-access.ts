import type { Role } from "@/types/domain";

const INFIRMIERE_PREFIXES = ["/agenda", "/infirmiere"] as const;
const MEDECIN_BLOCKED = ["/infirmiere"] as const;

/** Strip `/t/[tenant]` prefix and normalize tenant home. */
export function normalizeTenantPath(pathname: string): string {
  let path = pathname;
  const match = pathname.match(/^\/t\/[^/]+(\/.*)?$/);
  if (match) path = match[1] || "/";
  if (path === "/" || path === "") return "/tableau-de-bord";
  return path;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "INFIRMIERE":
      return "/infirmiere";
    case "SUPERADMIN":
      return "/console";
    default:
      return "/tableau-de-bord";
  }
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
      // Choisir un patient puis « Démarrer une consultation » sur le dossier
      return { label: "Nouvelle consultation", href: "/patients" };
    case "INFIRMIERE":
      return { label: "Accueil IDE", href: "/infirmiere" };
    default:
      return undefined;
  }
}
