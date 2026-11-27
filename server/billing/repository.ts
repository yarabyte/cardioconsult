import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { billingInvoices, processedEvents, subscriptions, tenants } from "@/db/control/schema";
import type { Subscription, SubscriptionStatus, TenantPlan } from "@/types/domain";
import { normalizePlanKey, seatLimitForPlan, type PlanKey } from "@/lib/rbac";
import { getControlDb } from "@/server/db/control-db";
import {
  graceEndsAtFrom,
  nextSubscriptionStatus,
  tenantStatusLabel,
  toControlStatus,
  type LifecycleEvent,
} from "./lifecycle";
import { getPlanEntry } from "./plans";
import type { BillingInvoice } from "./types";

function planLabel(key: PlanKey | "solo" | "cabinet" | "clinique"): TenantPlan {
  const k = typeof key === "string" ? normalizePlanKey(key) : key;
  if (k === "solo") return "Solo";
  if (k === "clinique") return "Clinique";
  return "Cabinet";
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function mapSubscription(
  row: typeof subscriptions.$inferSelect,
  tenant: typeof tenants.$inferSelect,
): Subscription {
  return {
    id: row.id,
    tenantId: row.tenantId,
    plan: planLabel(row.plan),
    status: row.status as SubscriptionStatus,
    seats: row.seats,
    currentPeriodEnd: iso(row.currentPeriodEnd),
    trialEndsAt: iso(row.trialEndsAt),
    graceEndsAt: iso(row.graceEndsAt),
    stripeCustomerId: row.stripeCustomerId ?? tenant.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    billingLegalName: tenant.billingLegalName ?? null,
    billingEmail: tenant.billingEmail ?? null,
    billingAddress: tenant.billingAddress ?? null,
  };
}

function mapInvoice(row: typeof billingInvoices.$inferSelect): BillingInvoice {
  return {
    id: row.id,
    tenantId: row.tenantId,
    number: row.number,
    issuedAt: row.issuedAt.toISOString(),
    amountHtEur: row.amountHtCents / 100,
    vatRate: row.vatRateBps / 10_000,
    status: row.status,
    pdfUrl: row.pdfUrl ?? null,
  };
}

async function loadTenantBundle(tenantId: string) {
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new Error("Tenant introuvable");
  const [sub] = await control
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);
  return { tenant, sub };
}

export async function ensureSubscription(tenantId: string): Promise<Subscription> {
  const control = getControlDb();
  const { tenant, sub } = await loadTenantBundle(tenantId);
  if (sub) return mapSubscription(sub, tenant);

  const trialEnd = tenant.trialEndsAt ?? new Date(Date.now() + 30 * 86_400_000);
  const planKey = normalizePlanKey(tenant.plan);
  const id = uuidv7();
  const status: SubscriptionStatus =
    tenant.status === "trial" || tenant.trialEndsAt ? "trialing" : "trialing";

  await control.insert(subscriptions).values({
    id,
    tenantId,
    plan: planKey,
    status,
    seats: seatLimitForPlan(planKey),
    trialEndsAt: trialEnd,
    currentPeriodEnd: trialEnd,
    stripeCustomerId: tenant.stripeCustomerId,
  });

  const [created] = await control
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  return mapSubscription(created!, tenant);
}

export async function getSubscription(tenantId: string): Promise<Subscription> {
  const { tenant, sub } = await loadTenantBundle(tenantId);
  if (!sub) return ensureSubscription(tenantId);
  return mapSubscription(sub, tenant);
}

export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  const sub = await getSubscription(tenantId);
  return sub.status;
}

export async function listInvoices(tenantId: string): Promise<BillingInvoice[]> {
  await ensureSubscription(tenantId);
  const control = getControlDb();
  const rows = await control
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.tenantId, tenantId))
    .orderBy(desc(billingInvoices.issuedAt));
  return rows.map(mapInvoice);
}

async function syncTenantBillingStatus(tenantId: string, status: SubscriptionStatus) {
  const control = getControlDb();
  await control
    .update(tenants)
    .set({ status: toControlStatus(status), updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
}

export async function applyLifecycle(
  tenantId: string,
  event: LifecycleEvent,
): Promise<{ previous: SubscriptionStatus; next: SubscriptionStatus; subscription: Subscription }> {
  const control = getControlDb();
  const sub = await getSubscription(tenantId);
  const previous = sub.status;
  const next = nextSubscriptionStatus(previous, event);

  const patch: Partial<typeof subscriptions.$inferInsert> = {
    status: next,
    updatedAt: new Date(),
  };
  if ((event === "invoice.payment_failed" || event === "trial.elapsed") && next === "past_due") {
    patch.graceEndsAt = new Date(graceEndsAtFrom());
  }
  if (event === "invoice.paid" || event === "checkout.completed") {
    patch.graceEndsAt = null;
    const period = new Date();
    period.setUTCMonth(period.getUTCMonth() + 1);
    patch.currentPeriodEnd = period;
  }
  if (event === "subscription.canceled") {
    patch.currentPeriodEnd = new Date();
  }

  await control.update(subscriptions).set(patch).where(eq(subscriptions.tenantId, tenantId));
  await syncTenantBillingStatus(tenantId, next);

  return { previous, next, subscription: await getSubscription(tenantId) };
}

export async function changePlan(tenantId: string, planKey: PlanKey): Promise<Subscription> {
  const entry = getPlanEntry(planKey);
  const control = getControlDb();
  await control
    .update(subscriptions)
    .set({
      plan: planKey,
      seats: entry.seats,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.tenantId, tenantId));
  await control
    .update(tenants)
    .set({ plan: planKey, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  return getSubscription(tenantId);
}

export async function setBillingIdentity(
  tenantId: string,
  input: { legalName: string; email: string; address: string },
): Promise<Subscription> {
  const control = getControlDb();
  await control
    .update(tenants)
    .set({
      billingLegalName: input.legalName,
      billingEmail: input.email,
      billingAddress: input.address,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  await ensureSubscription(tenantId);
  return getSubscription(tenantId);
}

export async function stripeSafeCustomerPayload(tenantId: string) {
  const sub = await getSubscription(tenantId);
  return {
    name: sub.billingLegalName,
    email: sub.billingEmail,
    address: sub.billingAddress,
    metadata: { tenantId },
  };
}

export async function recordPaidInvoice(tenantId: string, planKey: PlanKey) {
  const entry = getPlanEntry(planKey);
  if (entry.priceHtEur == null) return;
  const control = getControlDb();
  const existing = await control
    .select({ n: billingInvoices.number })
    .from(billingInvoices)
    .where(eq(billingInvoices.tenantId, tenantId));
  const number = `FAC-${existing.length + 1}`.padStart(8, "0");
  await control.insert(billingInvoices).values({
    id: uuidv7(),
    tenantId,
    number,
    issuedAt: new Date(),
    amountHtCents: Math.round(entry.priceHtEur * 100),
    vatRateBps: 2000,
    status: "paid",
  });
}

export function verifyWebhookSignature(input: {
  signature: string;
  timestamp: string;
  rawBody: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function processWebhook(input: {
  eventId: string;
  type: string;
  tenantId: string;
  planKey?: PlanKey;
  signature: string;
  timestamp: string;
  rawBody: string;
  secret: string;
}): Promise<
  | { ok: true; duplicate: boolean; status?: SubscriptionStatus }
  | { ok: false; error: string; httpStatus: 400 }
> {
  if (
    !verifyWebhookSignature({
      signature: input.signature,
      timestamp: input.timestamp,
      rawBody: input.rawBody,
      secret: input.secret,
    })
  ) {
    return { ok: false, error: "Signature webhook invalide", httpStatus: 400 };
  }

  const control = getControlDb();
  const [seen] = await control
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, input.eventId))
    .limit(1);
  if (seen) {
    return { ok: true, duplicate: true };
  }

  await control.insert(processedEvents).values({
    eventId: input.eventId,
    eventType: input.type,
    source: "stripe",
  });

  let event: LifecycleEvent | null = null;
  if (input.type === "checkout.session.completed") event = "checkout.completed";
  else if (input.type === "invoice.paid") event = "invoice.paid";
  else if (input.type === "invoice.payment_failed") event = "invoice.payment_failed";
  else if (input.type === "customer.subscription.deleted") event = "subscription.canceled";
  else if (input.type === "billing.grace_elapsed") event = "grace.elapsed";

  if (event === "checkout.completed" && input.planKey) {
    await changePlan(input.tenantId, normalizePlanKey(input.planKey));
    await recordPaidInvoice(input.tenantId, normalizePlanKey(input.planKey));
  }
  if (event) {
    const r = await applyLifecycle(input.tenantId, event);
    if (event === "invoice.paid" && input.planKey) {
      await recordPaidInvoice(input.tenantId, normalizePlanKey(input.planKey));
    }
    return { ok: true, duplicate: false, status: r.next };
  }
  return { ok: true, duplicate: false };
}

export function uiStatusLabel(status: SubscriptionStatus): string {
  return tenantStatusLabel(status);
}
