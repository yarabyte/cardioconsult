import type { Role } from "@/types/domain";

/** Plans normalisés (UI « Cabinet » / DB « cabinet »). */
export type PlanKey = "solo" | "cabinet" | "clinique";

/** Source unique des permissions (règle 05). */
export const PERMISSIONS = [
  "patient.read",
  "patient.write",
  "patient.archive",
  "appointment.read",
  "appointment.write",
  "vitals.write",
  "ecg.write",
  "nursing.note.write",
  "encounter.write",
  "exam.write",
  "score.write",
  "alert.acknowledge",
  "document.write",
  "document.validate",
  "document.sign",
  "prescription.write",
  "prescription.validate",
  "stats.read",
  "export.data",
  "team.manage",
  "settings.manage",
  "billing.manage",
  "audit.read",
  // Compat UI démo (alias → can() mappe)
  "agenda.manage",
  "transmission.write",
  "clinical.write",
  "tenant.admin",
  "console.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const REGULATORY_LOCKED: readonly Permission[] = [
  "document.sign",
  "document.validate",
  "prescription.write",
  "prescription.validate",
] as const;

/** Permissions que l'admin peut ajouter à l'infirmière (règle 05). */
export const NURSE_GRANTABLE: readonly Permission[] = [
  "exam.write",
  "stats.read",
  "encounter.write",
  "score.write",
  "alert.acknowledge",
  "document.write",
  "patient.write",
] as const;

export const PERMISSION_LABELS: Partial<Record<Permission, string>> = {
  "patient.read": "Voir les dossiers des patients du cabinet",
  "patient.write": "Créer et modifier des dossiers patients",
  "patient.archive": "Archiver un dossier patient",
  "appointment.read": "Consulter l’agenda",
  "appointment.write": "Gérer l’agenda et l’accueil",
  "vitals.write": "Saisir constantes et surveillance",
  "ecg.write": "Saisir un ECG",
  "nursing.note.write": "Rédiger des transmissions",
  "encounter.write": "Saisir une consultation",
  "exam.write": "Saisir ETT et examens",
  "score.write": "Saisir scores et conclusions",
  "alert.acknowledge": "Reconnaître une alerte de mesure",
  "document.write": "Rédiger un compte rendu",
  "document.validate": "Valider un compte rendu",
  "document.sign": "Valider et signer un compte rendu",
  "prescription.write": "Rédiger une ordonnance",
  "prescription.validate": "Rédiger et valider une ordonnance",
  "stats.read": "Voir les statistiques du cabinet",
  "export.data": "Exporter les données du cabinet",
  "team.manage": "Gérer l’équipe et les rôles",
  "settings.manage": "Paramètres du cabinet",
  "billing.manage": "Abonnement et factures",
  "audit.read": "Consulter le journal d’audit",
  "console.manage": "Console plateforme",
};

export type PermissionSubject = {
  role: Role;
  isTenantAdmin?: boolean;
};

export type RbacOptions = {
  /** Surcharges infirmière du tenant (permissions ajoutées au défaut). */
  nurseExtra?: readonly Permission[];
};

const MEDECIN_ALL: Permission[] = PERMISSIONS.filter((p) => p !== "console.manage");

export const INFIRMIERE_DEFAULT: readonly Permission[] = [
  "patient.read",
  "appointment.read",
  "appointment.write",
  "vitals.write",
  "ecg.write",
  "nursing.note.write",
  "agenda.manage",
  "transmission.write",
] as const;

const DEFAULT_MATRIX: Record<Role, readonly Permission[]> = {
  SUPERADMIN: ["console.manage"],
  MEDECIN: MEDECIN_ALL,
  INFIRMIERE: INFIRMIERE_DEFAULT,
};

const ADMIN_ONLY: readonly Permission[] = [
  "team.manage",
  "settings.manage",
  "billing.manage",
  "audit.read",
  "export.data",
  "tenant.admin",
];

/** Limites de sièges (membres actifs + invitations en cours). */
export const SEAT_LIMITS: Record<PlanKey, number> = {
  solo: 2,
  cabinet: 6,
  clinique: 50,
};

export function normalizePlanKey(plan: string): PlanKey {
  const p = plan.toLowerCase();
  if (p === "solo") return "solo";
  if (p === "clinique") return "clinique";
  return "cabinet";
}

export function seatLimitForPlan(plan: string): number {
  return SEAT_LIMITS[normalizePlanKey(plan)];
}

/** Mémoire démo / tests — ne pas utiliser en multi-tenant prod (préférer nurseExtra). */
let nurseOverrides: Permission[] = [...INFIRMIERE_DEFAULT];

export function resolveNursePermissions(extra?: readonly Permission[]): readonly Permission[] {
  if (extra === undefined) return nurseOverrides;
  const set = new Set<Permission>([...INFIRMIERE_DEFAULT, ...extra]);
  for (const locked of REGULATORY_LOCKED) set.delete(locked);
  return [...set];
}

export function getDefaultPermissions(role: Role, opts?: RbacOptions): readonly Permission[] {
  if (role === "INFIRMIERE") return resolveNursePermissions(opts?.nurseExtra);
  return DEFAULT_MATRIX[role];
}

/**
 * Seule fonction autorisée à décider d'une permission.
 * Les verrous réglementaires l'emportent toujours sur les surcharges.
 */
export function can(user: PermissionSubject, permission: Permission, opts?: RbacOptions): boolean {
  if (user.role === "SUPERADMIN") {
    return permission === "console.manage";
  }
  if (REGULATORY_LOCKED.includes(permission) && user.role !== "MEDECIN") {
    return false;
  }
  if (ADMIN_ONLY.includes(permission)) {
    return user.role === "MEDECIN" && Boolean(user.isTenantAdmin);
  }
  const granted = getDefaultPermissions(user.role, opts);
  if (granted.includes(permission)) return true;
  if (permission === "clinical.write") {
    return (
      granted.includes("encounter.write") ||
      granted.includes("exam.write") ||
      granted.includes("score.write") ||
      granted.includes("clinical.write")
    );
  }
  if (permission === "agenda.manage") {
    return granted.includes("appointment.write") || granted.includes("agenda.manage");
  }
  if (permission === "transmission.write") {
    return granted.includes("nursing.note.write") || granted.includes("transmission.write");
  }
  return false;
}

/** @deprecated Préférer persistance tenant + nurseExtra ; conservé pour démo UI. */
export function setNursePermission(permission: Permission, enabled: boolean): void {
  if (REGULATORY_LOCKED.includes(permission)) return;
  const set = new Set(nurseOverrides);
  if (enabled) set.add(permission);
  else set.delete(permission);
  nurseOverrides = [...set];
}

export function resetNursePermissions(): void {
  nurseOverrides = [...INFIRMIERE_DEFAULT];
}

export function isRegulatoryLocked(permission: Permission): boolean {
  return REGULATORY_LOCKED.includes(permission);
}

export type NavItem = {
  href: string;
  label: string;
  /** Permission requise (si absente : rôles seuls). */
  permission?: Permission;
  roles: Role[];
};

export const TENANT_NAV: NavItem[] = [
  {
    href: "/tableau-de-bord",
    label: "Tableau de bord",
    roles: ["MEDECIN"],
    permission: "patient.read",
  },
  {
    href: "/agenda",
    label: "Agenda",
    roles: ["MEDECIN", "INFIRMIERE"],
    permission: "appointment.read",
  },
  { href: "/patients", label: "Patients", roles: ["MEDECIN"], permission: "patient.read" },
  {
    href: "/hospitalisation",
    label: "Hospitalisation",
    roles: ["MEDECIN"],
    permission: "patient.read",
  },
  { href: "/statistiques", label: "Statistiques", roles: ["MEDECIN"], permission: "stats.read" },
  {
    href: "/infirmiere",
    label: "Accueil cabinet",
    roles: ["INFIRMIERE"],
    permission: "vitals.write",
  },
  {
    href: "/parametres/equipe",
    label: "Paramètres",
    roles: ["MEDECIN"],
    permission: "team.manage",
  },
];

/** Lien paramètres → journal (audit.read) ; inclus si admin même sans team.manage. */
export const SETTINGS_AUDIT_NAV: NavItem = {
  href: "/parametres/securite",
  label: "Sécurité & audit",
  roles: ["MEDECIN"],
  permission: "audit.read",
};

export function navForSubject(user: PermissionSubject, opts?: RbacOptions): NavItem[] {
  if (user.role === "SUPERADMIN") {
    return [{ href: "/", label: "Console", roles: ["SUPERADMIN"], permission: "console.manage" }];
  }
  return TENANT_NAV.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if (item.permission && !can(user, item.permission, opts)) return false;
    return true;
  });
}

/** @deprecated Utiliser navForSubject avec isTenantAdmin. */
export function navForRole(role: Role): NavItem[] {
  return navForSubject({ role, isTenantAdmin: role === "MEDECIN" });
}
