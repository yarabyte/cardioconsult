import type { Permission } from "@/lib/rbac";
import type { SubscriptionStatus } from "@/types/domain";
import { env } from "@/env";

/** Permissions encore autorisées en lecture seule (tenant suspendu / résilié en grâce d'export). */
export const READ_ONLY_ALLOWED: readonly Permission[] = [
  "patient.read",
  "appointment.read",
  "audit.read",
  "stats.read",
  "export.data",
  "billing.manage",
  "settings.manage",
] as const;

export function isReadOnlyStatus(status: SubscriptionStatus | string): boolean {
  return status === "suspended" || status === "canceled";
}

export function canMutateWhile(
  status: SubscriptionStatus | string,
  permission: Permission,
): boolean {
  if (!isReadOnlyStatus(status)) return true;
  return (READ_ONLY_ALLOWED as readonly string[]).includes(permission);
}

export type LifecycleEvent =
  | "checkout.completed"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "grace.elapsed"
  | "subscription.canceled"
  | "trial.started"
  | "trial.elapsed";

/**
 * Transitions d'abonnement (essai → actif → impayé → suspendu → résilié).
 * Période de grâce après impayé / fin d’essai sans paiement avant suspension.
 */
export function nextSubscriptionStatus(
  current: SubscriptionStatus,
  event: LifecycleEvent,
): SubscriptionStatus {
  switch (event) {
    case "trial.started":
      return "trialing";
    case "checkout.completed":
    case "invoice.paid":
      return "active";
    case "trial.elapsed":
      if (current === "trialing") return "past_due";
      return current;
    case "invoice.payment_failed":
      if (current === "suspended" || current === "canceled") return current;
      return "past_due";
    case "grace.elapsed":
      return current === "past_due" ? "suspended" : current;
    case "subscription.canceled":
      return "canceled";
    default:
      return current;
  }
}

export function graceEndsAtFrom(now = new Date(), days = env.BILLING_GRACE_DAYS): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** Projection statut tenant UI (FR) depuis statut abonnement. */
export function tenantStatusLabel(
  status: SubscriptionStatus,
): "Essai" | "Actif" | "Paiement en échec" | "Suspendu" | "deleted" {
  switch (status) {
    case "trialing":
      return "Essai";
    case "active":
      return "Actif";
    case "past_due":
      return "Paiement en échec";
    case "suspended":
    case "canceled":
      return "Suspendu";
    default:
      return "Actif";
  }
}

/** Mapping vers enum control-plane. */
export function toControlStatus(
  status: SubscriptionStatus,
): "trial" | "active" | "past_due" | "suspended" | "deleted" {
  switch (status) {
    case "trialing":
      return "trial";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "suspended":
      return "suspended";
    case "canceled":
      return "suspended";
    default:
      return "active";
  }
}
