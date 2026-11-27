"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { invitations, members, rolePermissionOverrides, users } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { requireStepUp } from "@/server/auth/step-up";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import {
  INFIRMIERE_DEFAULT,
  NURSE_GRANTABLE,
  REGULATORY_LOCKED,
  type Permission,
  setNursePermission,
} from "@/lib/rbac";
import { generateInviteToken, hashInviteToken } from "@/server/team/token";
import { assertSeatAvailable } from "@/server/team/seats";
import { resetMemberMfa, revokeAllSessionsForUser } from "@/server/team/sessions";
import { isDisposableEmail } from "@/lib/disposable-emails";

export type TeamActionResult =
  | { ok: true; message?: string; inviteUrl?: string }
  | { ok: false; error: { code: string; message: string } };

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["MEDECIN", "INFIRMIERE"]),
});

const memberIdSchema = z.object({ memberId: z.string().min(1) });

async function auditTeam(
  ctx: Awaited<ReturnType<typeof requireContext>>,
  action: string,
  entityId: string,
  meta?: Record<string, unknown>,
  outcome: "success" | "failure" | "access_denied" = "success",
) {
  await writePlatformAudit({
    actorId: ctx.user.id,
    action,
    entityType: "member",
    entityId,
    outcome,
    meta,
    requestId: ctx.requestId,
  });
}

export async function inviteMember(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({ permission: "team.manage", redirectOnFail: false });
    if (!ctx.tenant || !ctx.member) {
      return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };
    }
    const parsed = inviteSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: { code: "validation", message: "E-mail ou rôle invalide." } };
    }
    if (isDisposableEmail(parsed.data.email)) {
      return {
        ok: false,
        error: { code: "email", message: "Utilisez une adresse professionnelle." },
      };
    }

    try {
      await assertSeatAvailable(ctx.tenant.id);
    } catch {
      return {
        ok: false,
        error: { code: "seat_limit", message: "Limite de sièges atteinte pour votre offre." },
      };
    }

    const email = parsed.data.email.toLowerCase();
    const { raw: token, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const id = uuidv7();

    const control = getControlDb();
    await control.insert(invitations).values({
      id,
      tenantId: ctx.tenant.id,
      email,
      role: parsed.data.role,
      isTenantAdmin: false,
      tokenHash: hash,
      invitedByUserId: ctx.user.id,
      expiresAt,
    });

    await auditTeam(ctx, "team.invite", id, { role: parsed.data.role });
    // E-mail transactionnel : jamais de donnée clinique ; en mock on renvoie l'URL
    const inviteUrl = `/invitation/${token}`;
    return {
      ok: true,
      message: "Invitation créée (valable 72 h).",
      inviteUrl,
    };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Impossible d'inviter." } };
  }
}

export async function resendInvitation(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({ permission: "team.manage", redirectOnFail: false });
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };
    const { invitationId } = z.object({ invitationId: z.string().min(1) }).parse(raw);
    const { raw: token, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const control = getControlDb();
    const [inv] = await control
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.tenantId, ctx.tenant.id),
          isNull(invitations.acceptedAt),
        ),
      )
      .limit(1);
    if (!inv)
      return { ok: false, error: { code: "not_found", message: "Invitation introuvable." } };
    await control
      .update(invitations)
      .set({ tokenHash: hash, expiresAt, revokedAt: null })
      .where(eq(invitations.id, invitationId));

    await auditTeam(ctx, "team.invite_resend", invitationId);
    return { ok: true, message: "Invitation relancée.", inviteUrl: `/invitation/${token}` };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Relance impossible." } };
  }
}

export async function revokeInvitation(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({ permission: "team.manage", redirectOnFail: false });
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };
    const { invitationId } = z.object({ invitationId: z.string().min(1) }).parse(raw);

    const control = getControlDb();
    await control
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(invitations.id, invitationId), eq(invitations.tenantId, ctx.tenant.id)));

    await auditTeam(ctx, "team.invite_revoke", invitationId);
    return { ok: true, message: "Invitation révoquée." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Révocation impossible." } };
  }
}

export async function changeMemberRole(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({
      permission: "team.manage",
      stepUp: true,
      redirectOnFail: false,
    });
    await requireStepUp();
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };

    const parsed = z
      .object({
        memberId: z.string().min(1),
        role: z.enum(["MEDECIN", "INFIRMIERE"]),
        isTenantAdmin: z.boolean().optional(),
      })
      .parse(raw);

    const control = getControlDb();
    const [target] = await control
      .select()
      .from(members)
      .where(and(eq(members.id, parsed.memberId), eq(members.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!target) return { ok: false, error: { code: "not_found", message: "Membre introuvable." } };

    const nextAdmin = parsed.role === "MEDECIN" && Boolean(parsed.isTenantAdmin);
    if (target.isTenantAdmin && !nextAdmin) {
      const admins = await control
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.tenantId, ctx.tenant.id),
            eq(members.isTenantAdmin, true),
            eq(members.status, "active"),
          ),
        );
      if (admins.length <= 1) {
        return {
          ok: false,
          error: {
            code: "last_admin",
            message: "Impossible de retirer le dernier administrateur.",
          },
        };
      }
    }

    await control
      .update(members)
      .set({
        role: parsed.role,
        isTenantAdmin: nextAdmin,
        updatedAt: new Date(),
      })
      .where(eq(members.id, parsed.memberId));

    await auditTeam(ctx, "team.role_change", parsed.memberId, {
      before: { role: target.role, isTenantAdmin: target.isTenantAdmin },
      after: { role: parsed.role, isTenantAdmin: nextAdmin },
    });
    return { ok: true, message: "Rôle mis à jour." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Changement de rôle impossible." } };
  }
}

export async function disableMember(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({
      permission: "team.manage",
      stepUp: true,
      redirectOnFail: false,
    });
    await requireStepUp();
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };
    const { memberId } = memberIdSchema.parse(raw);

    if (memberId === ctx.member?.id) {
      return { ok: false, error: { code: "self", message: "Vous ne pouvez pas vous désactiver." } };
    }

    const control = getControlDb();
    const [target] = await control
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!target) return { ok: false, error: { code: "not_found", message: "Membre introuvable." } };

    if (target.isTenantAdmin) {
      const admins = await control
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.tenantId, ctx.tenant.id),
            eq(members.isTenantAdmin, true),
            eq(members.status, "active"),
          ),
        );
      if (admins.length <= 1) {
        return {
          ok: false,
          error: {
            code: "last_admin",
            message: "Impossible de désactiver le dernier administrateur.",
          },
        };
      }
    }

    await control
      .update(members)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(eq(members.id, memberId));
    await revokeAllSessionsForUser(target.userId);
    await auditTeam(ctx, "team.disable", memberId, { before: { status: target.status } });
    return { ok: true, message: "Membre désactivé ; sessions révoquées." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Désactivation impossible." } };
  }
}

export async function resetMemberMfaAction(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({
      permission: "team.manage",
      stepUp: true,
      redirectOnFail: false,
    });
    await requireStepUp();
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };
    const { memberId } = memberIdSchema.parse(raw);

    const control = getControlDb();
    const [target] = await control
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!target) return { ok: false, error: { code: "not_found", message: "Membre introuvable." } };

    await resetMemberMfa(target.userId);
    await auditTeam(ctx, "team.mfa_reset", memberId);
    return { ok: true, message: "MFA réinitialisée ; ré-enrôlement requis." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Réinitialisation MFA impossible." } };
  }
}

export async function setNursePermissionAction(raw: unknown): Promise<TeamActionResult> {
  try {
    const ctx = await requireContext({
      permission: "team.manage",
      stepUp: true,
      redirectOnFail: false,
    });
    await requireStepUp();
    if (!ctx.tenant) return { ok: false, error: { code: "tenant", message: "Cabinet requis." } };

    const parsed = z
      .object({
        permission: z.string().min(1),
        enabled: z.boolean(),
      })
      .parse(raw);

    const permission = parsed.permission as Permission;
    if (REGULATORY_LOCKED.includes(permission)) {
      return {
        ok: false,
        error: { code: "locked", message: "Permission réglementaire non modifiable." },
      };
    }
    const allowed =
      (NURSE_GRANTABLE as readonly string[]).includes(permission) ||
      (INFIRMIERE_DEFAULT as readonly string[]).includes(permission);
    if (!allowed) {
      return { ok: false, error: { code: "forbidden", message: "Permission non attribuable." } };
    }

    setNursePermission(permission, parsed.enabled);
    const control = getControlDb();
    const [existing] = await control
      .select()
      .from(rolePermissionOverrides)
      .where(
        and(
          eq(rolePermissionOverrides.tenantId, ctx.tenant.id),
          eq(rolePermissionOverrides.role, "INFIRMIERE"),
          eq(rolePermissionOverrides.permission, permission),
        ),
      )
      .limit(1);
    if (existing) {
      await control
        .update(rolePermissionOverrides)
        .set({
          enabled: parsed.enabled,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(rolePermissionOverrides.id, existing.id));
    } else {
      await control.insert(rolePermissionOverrides).values({
        id: uuidv7(),
        tenantId: ctx.tenant.id,
        role: "INFIRMIERE",
        permission,
        enabled: parsed.enabled,
        updatedBy: ctx.user.id,
      });
    }

    await auditTeam(ctx, "team.permission_override", ctx.tenant.id, {
      role: "INFIRMIERE",
      permission,
      enabled: parsed.enabled,
    });
    return { ok: true, message: "Matrice mise à jour." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Mise à jour impossible." } };
  }
}

export async function acceptInvitation(rawToken: string): Promise<TeamActionResult> {
  try {
    // Pas encore membre : session seule (e-mail doit correspondre à l'invitation).
    const { headers } = await import("next/headers");
    const { auth } = await import("@/server/auth/auth");
    const { getRequestId } = await import("@/lib/logging/request-context");
    const requestId = getRequestId() ?? crypto.randomUUID();

    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return { ok: false, error: { code: "auth", message: "Connexion requise pour accepter." } };
    }
    const actor = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };

    const hash = hashInviteToken(rawToken);

    const control = getControlDb();
    const [row] = await control
      .select()
      .from(invitations)
      .where(eq(invitations.tokenHash, hash))
      .limit(1);
    const inv:
      | {
          id: string;
          tenantId: string;
          email: string;
          role: "MEDECIN" | "INFIRMIERE";
          isTenantAdmin: boolean;
          expiresAt: Date;
          acceptedAt: Date | null;
          revokedAt: Date | null;
        }
      | undefined = row;

    if (!inv || inv.revokedAt || inv.acceptedAt) {
      return { ok: false, error: { code: "invalid", message: "Invitation invalide." } };
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: { code: "expired", message: "Invitation expirée." } };
    }
    if (actor.email.toLowerCase() !== inv.email.toLowerCase()) {
      await writePlatformAudit({
        actorId: actor.id,
        action: "team.invite_accept",
        entityType: "invitation",
        entityId: inv.id,
        outcome: "access_denied",
        meta: { reason: "email_mismatch" },
        requestId,
      });
      return {
        ok: false,
        error: {
          code: "email_mismatch",
          message: "Connectez-vous avec l'adresse e-mail invitée.",
        },
      };
    }

    await control
      .insert(users)
      .values({
        id: actor.id,
        email: actor.email,
        name: actor.name,
      })
      .onConflictDoNothing();
    await control
      .insert(members)
      .values({
        id: uuidv7(),
        userId: actor.id,
        tenantId: inv.tenantId,
        role: inv.role,
        isTenantAdmin: inv.isTenantAdmin,
        status: "active",
      })
      .onConflictDoNothing();
    await control
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, inv.id));

    await writePlatformAudit({
      actorId: actor.id,
      action: "team.invite_accept",
      entityType: "invitation",
      entityId: inv.id,
      outcome: "success",
      requestId,
    });
    return { ok: true, message: "Invitation acceptée." };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return { ok: false, error: { code: "access_denied", message: err.message } };
    }
    return { ok: false, error: { code: "server", message: "Acceptation impossible." } };
  }
}

export async function getNurseExtrasForTenant(tenantId: string): Promise<Permission[]> {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(rolePermissionOverrides)
    .where(
      and(
        eq(rolePermissionOverrides.tenantId, tenantId),
        eq(rolePermissionOverrides.role, "INFIRMIERE"),
        eq(rolePermissionOverrides.enabled, true),
      ),
    );
  return rows.map((r) => r.permission as Permission);
}
