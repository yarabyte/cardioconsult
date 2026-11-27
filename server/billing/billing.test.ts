import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./repository";
import { canMutateWhile, nextSubscriptionStatus, READ_ONLY_ALLOWED } from "./lifecycle";
import { getPlanCatalog } from "./plans";

function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

describe("P16 — abonnements", () => {
  it("catalogue : prix issus de l'env, pas en dur dans le code métier Clinique", () => {
    const cat = getPlanCatalog();
    expect(cat.map((p) => p.key)).toEqual(["solo", "cabinet", "clinique"]);
    expect(cat.find((p) => p.key === "clinique")?.priceHtEur).toBeNull();
    expect(cat.find((p) => p.key === "solo")?.seats).toBe(2);
  });

  it("webhook signature invalide → rejet", () => {
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
    const valid = verifyWebhookSignature({
      signature: "deadbeef",
      timestamp: "123",
      rawBody: body,
      secret: "whsec_test",
    });
    expect(valid).toBe(false);
  });

  it("webhook signature valide", () => {
    const body = JSON.stringify({ id: "evt_dup", type: "invoice.payment_failed" });
    const ts = "1700000000";
    const secret = "whsec_test";
    const signature = sign(secret, ts, body);
    expect(verifyWebhookSignature({ signature, timestamp: ts, rawBody: body, secret })).toBe(true);
  });

  it("impayé → grâce écoulée → suspendu : lecture seule, export OK", () => {
    expect(canMutateWhile("suspended", "patient.write")).toBe(false);
    expect(canMutateWhile("suspended", "patient.read")).toBe(true);
    expect(canMutateWhile("suspended", "export.data")).toBe(true);
    expect(canMutateWhile("suspended", "billing.manage")).toBe(true);
    expect(READ_ONLY_ALLOWED).toContain("export.data");
  });

  it("transitions cycle de vie", () => {
    expect(nextSubscriptionStatus("trialing", "checkout.completed")).toBe("active");
    expect(nextSubscriptionStatus("active", "invoice.payment_failed")).toBe("past_due");
    expect(nextSubscriptionStatus("past_due", "grace.elapsed")).toBe("suspended");
    expect(nextSubscriptionStatus("suspended", "subscription.canceled")).toBe("canceled");
    expect(nextSubscriptionStatus("past_due", "invoice.paid")).toBe("active");
  });

  it("fin d’essai sans paiement → past_due (puis grâce)", () => {
    expect(nextSubscriptionStatus("trialing", "trial.elapsed")).toBe("past_due");
    expect(nextSubscriptionStatus("active", "trial.elapsed")).toBe("active");
    expect(nextSubscriptionStatus("past_due", "grace.elapsed")).toBe("suspended");
  });
});
