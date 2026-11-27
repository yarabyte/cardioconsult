/**
 * BillingProvider — Stripe Checkout / Portal lorsque les clés sont présentes.
 * Sans STRIPE_SECRET_KEY : opérations de paiement indisponibles ; lecture depuis la base control-plane.
 */

import { env } from "@/env";
import type { PlanKey } from "@/lib/rbac";
import { setBillingIdentity } from "./repository";

export type CheckoutInput = {
  tenantId: string;
  planKey: PlanKey;
  /** Identité cabinet uniquement. */
  legalName: string;
  billingEmail: string;
  billingAddress: string;
  successUrl: string;
  cancelUrl: string;
};

export type PortalInput = {
  tenantId: string;
  returnUrl: string;
};

export interface BillingProvider {
  readonly id: string;
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string; sessionId: string }>;
  createPortalSession(input: PortalInput): Promise<{ url: string }>;
}

export class BillingUnavailableError extends Error {
  constructor(
    message = "Paiement en ligne indisponible — clé Stripe absente ou intégration non finalisée",
  ) {
    super(message);
    this.name = "BillingUnavailableError";
  }
}

export class StripeBillingProvider implements BillingProvider {
  readonly id = "Stripe";

  async createCheckoutSession(input: CheckoutInput): Promise<{ url: string; sessionId: string }> {
    if (!env.STRIPE_SECRET_KEY) {
      throw new BillingUnavailableError("STRIPE_SECRET_KEY manquant");
    }
    await setBillingIdentity(input.tenantId, {
      legalName: input.legalName,
      email: input.billingEmail,
      address: input.billingAddress,
    });
    const safe = {
      name: input.legalName,
      email: input.billingEmail,
      address: input.billingAddress,
      metadata: { tenantId: input.tenantId },
    };
    void safe;
    throw new BillingUnavailableError(
      "Stripe Checkout non branché dans cet environnement — finaliser l'intégration P16/P19",
    );
  }

  async createPortalSession(_input: PortalInput): Promise<{ url: string }> {
    if (!env.STRIPE_SECRET_KEY) {
      throw new BillingUnavailableError("STRIPE_SECRET_KEY manquant");
    }
    throw new BillingUnavailableError("Stripe Customer Portal non branché dans cet environnement");
  }
}

export function getBillingProvider(): BillingProvider | null {
  if (env.STRIPE_SECRET_KEY) {
    return new StripeBillingProvider();
  }
  return null;
}
