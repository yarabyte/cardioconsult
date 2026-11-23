import type { Role } from "@/types/domain";

export const PERMISSIONS = [
  "patient.read",
  "vitals.write",
  "agenda.manage",
  "transmission.write",
  "clinical.write",
  "stats.read",
  "document.sign",
  "prescription.validate",
  "team.manage",
  "tenant.admin",
  "console.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Regulatory locks: cannot be granted to INFIRMIERE. */
export const REGULATORY_LOCKED: readonly Permission[] = [
  "document.sign",
  "prescription.validate",
] as const;

export const PERMISSION_LABELS: Record<Permission, string> = {
  "patient.read": "Voir les dossiers des patients du cabinet",
  "vitals.write": "Saisir constantes, ECG et surveillance",
  "agenda.manage": "Gérer l’agenda et l’accueil",
  "transmission.write": "Rédiger des transmissions",
  "clinical.write": "Saisir ETT, scores et conclusions",
  "stats.read": "Voir les statistiques du cabinet",
  "document.sign": "Valider et signer un compte rendu",
  "prescription.validate": "Rédiger et valider une ordonnance",
  "team.manage": "Gérer l’équipe et les rôles",
  "tenant.admin": "Administrer le cabinet",
  "console.manage": "Console plateforme",
};

export type PermissionSubject = {
  role: Role;
  isTenantAdmin?: boolean;
};

const DEFAULT_MATRIX: Record<Role, readonly Permission[]> = {
  SUPERADMIN: ["console.manage"],
  MEDECIN: [
    "patient.read",
    "vitals.write",
    "agenda.manage",
    "transmission.write",
    "clinical.write",
    "stats.read",
    "document.sign",
    "prescription.validate",
    "team.manage",
    "tenant.admin",
  ],
  INFIRMIERE: [
    "patient.read",
    "vitals.write",
    "agenda.manage",
    "transmission.write",
    "clinical.write",
    "stats.read",
  ],
};

/** Mutable nurse matrix for demo (screen 17). Locked perms stay false. */
let nurseOverrides: Permission[] = [...DEFAULT_MATRIX.INFIRMIERE];

export function getDefaultPermissions(role: Role): readonly Permission[] {
  if (role === "INFIRMIERE") return nurseOverrides;
  return DEFAULT_MATRIX[role];
}

export function can(user: PermissionSubject, permission: Permission): boolean {
  if (user.role === "SUPERADMIN") {
    return permission === "console.manage";
  }
  if (REGULATORY_LOCKED.includes(permission) && user.role !== "MEDECIN") {
    return false;
  }
  const perms = getDefaultPermissions(user.role);
  if (permission === "team.manage" || permission === "tenant.admin") {
    return user.role === "MEDECIN" && Boolean(user.isTenantAdmin);
  }
  return perms.includes(permission);
}

export function setNursePermission(permission: Permission, enabled: boolean): void {
  if (REGULATORY_LOCKED.includes(permission)) return;
  const set = new Set(nurseOverrides);
  if (enabled) set.add(permission);
  else set.delete(permission);
  nurseOverrides = [...set];
}

export function resetNursePermissions(): void {
  nurseOverrides = [...DEFAULT_MATRIX.INFIRMIERE];
}

export function isRegulatoryLocked(permission: Permission): boolean {
  return REGULATORY_LOCKED.includes(permission);
}

/** Nav items filtered by role — mirrors HTML sidebars. */
export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const TENANT_NAV: NavItem[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", roles: ["MEDECIN"] },
  { href: "/agenda", label: "Agenda", roles: ["MEDECIN", "INFIRMIERE"] },
  { href: "/patients", label: "Patients", roles: ["MEDECIN"] },
  { href: "/hospitalisation", label: "Hospitalisation", roles: ["MEDECIN"] },
  { href: "/statistiques", label: "Statistiques", roles: ["MEDECIN"] },
  { href: "/infirmiere", label: "Accueil cabinet", roles: ["INFIRMIERE"] },
  { href: "/parametres/equipe", label: "Paramètres", roles: ["MEDECIN"] },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "SUPERADMIN") {
    return [{ href: "/", label: "Console", roles: ["SUPERADMIN"] }];
  }
  return TENANT_NAV.filter((item) => item.roles.includes(role));
}
