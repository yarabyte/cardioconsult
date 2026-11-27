"use server";

import { z } from "zod";
import { normalizePlanKey } from "@/lib/rbac";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { requireStepUp } from "@/server/auth/step-up";
import { recordAuditEvent } from "@/server/services/audit";
import {
  changePlan,
  getSubscriptionStatus,
  listInvoices,
  getSubscription,
  uiStatusLabel,
} from "@/server/billing/repository";
import { BillingUnavailableError, getBillingProvider } from "@/server/billing/provider";
import { getPlanCatalog } from "@/server/billing/plans";
import { canMutateWhile } from "@/server/billing/lifecycle";

async function actorBilling() {
  const ctx = await requireContext({
    permission: "billing.manage",
    stepUp: true,
    redirectOnFail: false,
  });
  await requireStepUp();
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    email: ctx.user.email,
    name: ctx.user.name,
  };
}

export async function loadBillingAction() {
  try {
    const a = await actorBilling();
    const status = await getSubscriptionStatus(a.tenantId);
    return {
      ok: true as const,
      subscription: await getSubscription(a.tenantId),
      invoices: await listInvoices(a.tenantId),
      catalog: getPlanCatalog().map((p) => ({
        key: p.key,
        label: p.label,
        seats: p.seats,
        modules: p.modules,
        priceHtEur: p.priceHtEur,
      })),
      statusLabel: uiStatusLabel(status),
      readOnly: !canMutateWhile(status, "patient.write"),
      providerId: getBillingProvider()?.id ?? "Indisponible",
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function startCheckoutAction(raw: unknown) {
  try {
    const a = await actorBilling();
    const parsed = z
      .object({
        planKey: z.enum(["solo", "cabinet", "clinique"]),
        legalName: z.string().min(2).max(200),
        billingEmail: z.string().email(),
        billingAddress: z.string().min(5).max(500),
      })
      .parse(raw);

    const provider = getBillingProvider();
    if (!provider) {
      return {
        ok: false as const,
        error: "Paiement en ligne indisponible : Stripe n'est pas configuré sur cet environnement.",
      };
    }

    const session = await provider.createCheckoutSession({
      tenantId: a.tenantId,
      planKey: parsed.planKey,
      legalName: parsed.legalName,
      billingEmail: parsed.billingEmail,
      billingAddress: parsed.billingAddress,
      successUrl: "/parametres/abonnement?ok=1",
      cancelUrl: "/parametres/abonnement?cancel=1",
    });

    await recordAuditEvent(a.tenantId, {
      action: "billing.checkout_started",
      entityType: "subscription",
      entityId: a.tenantId,
      actorId: a.userId,
      actorRole: a.role,
    });

    return { ok: true as const, url: session.url, sessionId: session.sessionId };
  } catch (err) {
    const message =
      err instanceof AccessDeniedError
        ? err.message
        : err instanceof BillingUnavailableError
          ? err.message
          : "Checkout impossible";
    return { ok: false as const, error: message };
  }
}

export async function openPortalAction() {
  try {
    const a = await actorBilling();
    const provider = getBillingProvider();
    if (!provider) {
      return {
        ok: false as const,
        error: "Portail client indisponible : Stripe n'est pas configuré.",
      };
    }
    const portal = await provider.createPortalSession({
      tenantId: a.tenantId,
      returnUrl: "/parametres/abonnement",
    });
    await recordAuditEvent(a.tenantId, {
      action: "billing.portal_opened",
      entityType: "subscription",
      entityId: a.tenantId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, url: portal.url };
  } catch (err) {
    const message = err instanceof BillingUnavailableError ? err.message : "Portail impossible";
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : message,
    };
  }
}

export async function changePlanAction(raw: unknown) {
  try {
    const a = await actorBilling();
    const parsed = z.object({ planKey: z.enum(["solo", "cabinet", "clinique"]) }).parse(raw);
    const sub = await changePlan(a.tenantId, normalizePlanKey(parsed.planKey));
    await recordAuditEvent(a.tenantId, {
      action: "billing.plan_changed",
      entityType: "subscription",
      entityId: sub.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, subscription: sub };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Changement d'offre impossible",
    };
  }
}

/** Export de réversibilité — délègue au pipeline P18 (chiffré, 24 h, audité). */
export async function requestReversibilityExportAction() {
  try {
    const a = await actorBilling();
    const status = await getSubscriptionStatus(a.tenantId);
    if (!canMutateWhile(status, "export.data")) {
      throw new AccessDeniedError("Export non autorisé");
    }
    const { requestDataExportAction } = await import("@/server/actions/rgpd");
    const exp = await requestDataExportAction({ scope: "tenant" });
    if (!exp.ok) return exp;
    await recordAuditEvent(a.tenantId, {
      action: "billing.reversibility_export_requested",
      entityType: "data_export",
      entityId: exp.exportId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return {
      ok: true as const,
      message: `Export de réversibilité prêt — ${exp.downloadPath} (expire ${exp.expiresAt})`,
      downloadPath: exp.downloadPath,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Export impossible",
    };
  }
}
