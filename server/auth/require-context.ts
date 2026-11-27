import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getControlDb } from "@/server/db/control-db";
import { getTenantDb, type TenantDb } from "@/server/db/tenant-db";
import { members, tenants } from "@/db/control/schema";
import { getTenant, getHostKind } from "@/lib/tenant";
import { can, type Permission } from "@/lib/rbac";
import { getRequestId } from "@/lib/logging/request-context";
import type { Role } from "@/types/domain";
import { logger } from "@/lib/logging/logger";
import { canMutateWhile } from "@/server/billing/lifecycle";
const IDLE_MS_DEFAULT = 15 * 60 * 1000;
const IDLE_MS_MAX = 30 * 60 * 1000;
const STEP_UP_MS = 5 * 60 * 1000;

export class AccessDeniedError extends Error {
  constructor(
    message = "Accès refusé",
    public readonly code = "access_denied",
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export interface RequestContext {
  user: { id: string; name: string; email: string; role: Role; isTenantAdmin?: boolean };
  member: { id: string; tenantId: string; role: Role; isTenantAdmin: boolean } | null;
  role: Role;
  tenant: { id: string; slug: string; accessMode?: "full" | "read_only" } | null;
  db: TenantDb | null;
  requestId: string;
  sessionId: string | null;
  mfaSatisfied: boolean;
  stepUpValid: boolean;
}

export interface RequireContextOptions {
  permission: Permission;
  /** Si true, exige une ré-auth récente (< 5 min). */
  stepUp?: boolean;
  /** Si false, ne redirige pas (jette AccessDeniedError). */
  redirectOnFail?: boolean;
}

function mapRole(role: string): Role {
  if (role === "INFIRMIERE" || role === "MEDECIN" || role === "SUPERADMIN") return role;
  return "MEDECIN";
}

async function auditDenied(action: string, entityId: string) {
  logger.warn(
    { event: "access_denied", action, entityId, requestId: getRequestId() },
    "Accès refusé",
  );
}

/**
 * Point d'entrée autorisation : session + MFA + appartenance tenant hôte + permission.
 */
export async function requireContext(opts: RequireContextOptions): Promise<RequestContext> {
  const requestId = getRequestId() ?? crypto.randomUUID();
  const redirectOnFail = opts.redirectOnFail !== false;

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    await auditDenied(opts.permission, "anonymous");
    if (redirectOnFail) redirect("/connexion");
    throw new AccessDeniedError("Session requise");
  }

  const userRecord = session.user as {
    id: string;
    name: string;
    email: string;
    twoFactorEnabled?: boolean;
  };
  if (!userRecord.twoFactorEnabled) {
    if (redirectOnFail) redirect("/connexion/mfa-enroll");
    throw new AccessDeniedError("MFA obligatoire");
  }

  // Idle timeout
  const lastActive = (session.session as { lastActiveAt?: Date | string | null }).lastActiveAt;
  const lastMs = lastActive
    ? new Date(lastActive).getTime()
    : new Date(session.session.updatedAt).getTime();
  const idleLimit = IDLE_MS_DEFAULT; // TODO: réglage tenant (cap IDLE_MS_MAX)
  if (Date.now() - lastMs > Math.min(idleLimit, IDLE_MS_MAX)) {
    await auditDenied("session.idle", userRecord.id);
    if (redirectOnFail) redirect("/connexion?reason=idle");
    throw new AccessDeniedError("Session expirée (inactivité)");
  }

  const hostKind = await getHostKind();
  const slug = await getTenant();
  const control = getControlDb();

  let memberRow: {
    id: string;
    tenantId: string;
    role: "MEDECIN" | "INFIRMIERE";
    isTenantAdmin: boolean;
  } | null = null;
  let tenantInfo: { id: string; slug: string } | null = null;

  let tenantAccessMode: "full" | "read_only" = "full";

  if (hostKind === "tenant" && slug) {
    const [tenant] = await control.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tenant || tenant.status === "deleted") {
      await auditDenied("tenant.lookup", slug);
      if (redirectOnFail) redirect("/connexion");
      throw new AccessDeniedError("Cabinet indisponible");
    }
    // Suspendu / past_due : accès lecture + export + billing (continuité des soins)
    if (tenant.status === "suspended") {
      tenantAccessMode = "read_only";
    }
    const [m] = await control
      .select()
      .from(members)
      .where(
        and(
          eq(members.userId, userRecord.id),
          eq(members.tenantId, tenant.id),
          eq(members.status, "active"),
        ),
      )
      .limit(1);
    if (!m) {
      await auditDenied("member.missing", userRecord.id);
      if (redirectOnFail) redirect("/connexion");
      throw new AccessDeniedError("Pas membre de ce cabinet");
    }
    memberRow = {
      id: m.id,
      tenantId: m.tenantId,
      role: m.role,
      isTenantAdmin: m.isTenantAdmin,
    };
    tenantInfo = { id: tenant.id, slug: tenant.slug };
  }

  const role: Role = memberRow ? mapRole(memberRow.role) : "SUPERADMIN";
  const subject = {
    role,
    isTenantAdmin: memberRow?.isTenantAdmin,
  };

  if (!can(subject, opts.permission)) {
    await auditDenied(opts.permission, userRecord.id);
    if (redirectOnFail) redirect("/connexion");
    throw new AccessDeniedError();
  }

  if (tenantAccessMode === "read_only" && !canMutateWhile("suspended", opts.permission)) {
    await auditDenied(`read_only.${opts.permission}`, userRecord.id);
    if (redirectOnFail) redirect("/parametres/abonnement");
    throw new AccessDeniedError(
      "Cabinet en lecture seule (abonnement suspendu) — export et facturation disponibles",
    );
  }

  const stepUpAt = (session.session as { stepUpAt?: Date | string | null }).stepUpAt;
  const stepUpValid = stepUpAt ? Date.now() - new Date(stepUpAt).getTime() < STEP_UP_MS : false;
  if (opts.stepUp && !stepUpValid) {
    await auditDenied("step_up.required", userRecord.id);
    throw new AccessDeniedError("Ré-authentification requise");
  }

  let db: TenantDb | null = null;
  if (tenantInfo) {
    db = await getTenantDb(tenantInfo.id);
  }

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role,
      isTenantAdmin: memberRow?.isTenantAdmin,
    },
    member: memberRow,
    role,
    tenant: tenantInfo ? { ...tenantInfo, accessMode: tenantAccessMode } : null,
    db,
    requestId,
    sessionId: session.session.id,
    mfaSatisfied: true,
    stepUpValid,
  };
}
