import { and, eq, isNotNull, lt, lte } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { members, subscriptions, tenants, trialReminderSends, users } from "@/db/control/schema";
import { logger } from "@/lib/logging/logger";
import { applyLifecycle, ensureSubscription, getSubscription } from "@/server/billing/repository";
import { getControlDb } from "@/server/db/control-db";
import { sendMail } from "@/server/mail/send";
import {
  billingSettingsUrl,
  buildTrialReminderMail,
  type TrialReminderKind,
} from "@/server/mail/trial-reminder";
export const TRIAL_REMINDER_QUEUE = "billing.trial_reminder";
export const TRIAL_SCAN_QUEUE = "billing.trial_scan";

export type TrialReminderPayload = {
  tenantId: string;
  kind: TrialReminderKind;
};

const DAY_MS = 86_400_000;

function startAfterFor(trialEndsAt: Date, kind: TrialReminderKind): Date {
  const offset = kind === "d7" ? 7 * DAY_MS : 1 * DAY_MS;
  return new Date(trialEndsAt.getTime() - offset);
}

/** Enqueue J-7 et J-1 d’après `trialEndsAt` (idempotent via singletonKey). */
export async function enqueueTrialReminders(tenantId: string): Promise<void> {
  const sub = await ensureSubscription(tenantId);
  if (!sub.trialEndsAt) return;
  const trialEndsAt = new Date(sub.trialEndsAt);
  // Import dynamique pour éviter le cycle boss ↔ trial-reminders
  const { getBoss } = await import("./boss");
  const b = await getBoss();
  await b.createQueue(TRIAL_REMINDER_QUEUE);

  for (const kind of ["d7", "d1"] as const) {
    const startAfter = startAfterFor(trialEndsAt, kind);
    // Si la date est déjà passée (provision tardive), le scan quotidien rattrape.
    if (startAfter.getTime() <= Date.now()) continue;
    await b.send(TRIAL_REMINDER_QUEUE, { tenantId, kind } satisfies TrialReminderPayload, {
      singletonKey: `${tenantId}:${kind}`,
      startAfter,
      retryLimit: 3,
      retryDelay: 60,
    });
  }
}

async function alreadySent(tenantId: string, kind: TrialReminderKind): Promise<boolean> {
  const control = getControlDb();
  const [row] = await control
    .select()
    .from(trialReminderSends)
    .where(and(eq(trialReminderSends.tenantId, tenantId), eq(trialReminderSends.kind, kind)))
    .limit(1);
  return Boolean(row);
}

async function markSent(tenantId: string, kind: TrialReminderKind): Promise<void> {
  const control = getControlDb();
  await control
    .insert(trialReminderSends)
    .values({ id: uuidv7(), tenantId, kind })
    .onConflictDoNothing({
      target: [trialReminderSends.tenantId, trialReminderSends.kind],
    });
}

async function resolveRecipients(tenantId: string): Promise<{
  emails: string[];
  prenom: string | null;
  cabinetName: string;
  slug: string;
}> {
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new Error("Tenant introuvable");

  const emails = new Set<string>();
  if (tenant.billingEmail) emails.add(tenant.billingEmail);

  const [admin] = await control
    .select({ email: users.email, name: users.name })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.tenantId, tenantId), eq(members.isTenantAdmin, true)))
    .limit(1);

  if (admin?.email) emails.add(admin.email);
  const prenom = admin?.name?.trim().split(/\s+/)[0] ?? null;

  return {
    emails: [...emails],
    prenom,
    cabinetName: tenant.name,
    slug: tenant.slug,
  };
}

/**
 * Envoie un rappel si l’abonnement est encore en essai.
 * Idempotent via `trial_reminder_sends`.
 */
export async function sendTrialReminder(
  payload: TrialReminderPayload,
): Promise<"sent" | "skipped"> {
  const { tenantId, kind } = payload;
  if (await alreadySent(tenantId, kind)) return "skipped";

  const sub = await getSubscription(tenantId);
  if (sub.status !== "trialing" || !sub.trialEndsAt) {
    logger.info(
      { event: "trial_reminder.skip", tenantId, kind, status: sub.status },
      "Rappel essai ignoré (plus en trialing)",
    );
    return "skipped";
  }

  const { emails, prenom, cabinetName, slug } = await resolveRecipients(tenantId);
  if (emails.length === 0) {
    logger.warn({ event: "trial_reminder.no_recipient", tenantId, kind }, "Aucun destinataire");
    return "skipped";
  }

  const mail = buildTrialReminderMail({
    kind,
    cabinetName,
    adminPrenom: prenom,
    trialEndsAt: new Date(sub.trialEndsAt),
    billingUrl: billingSettingsUrl(slug),
  });

  await sendMail({ to: emails, ...mail });
  await markSent(tenantId, kind);
  logger.info({ event: "trial_reminder.sent", tenantId, kind }, "Rappel essai envoyé");
  return "sent";
}

/** Rattrapage rappels + passage trial.elapsed → past_due. */
export async function runTrialScan(now = new Date()): Promise<{
  reminders: number;
  expired: number;
}> {
  const control = getControlDb();
  let reminders = 0;
  let expired = 0;

  const inWindow = await control
    .select({
      tenantId: subscriptions.tenantId,
      trialEndsAt: subscriptions.trialEndsAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        isNotNull(subscriptions.trialEndsAt),
        lte(subscriptions.trialEndsAt, new Date(now.getTime() + 7 * DAY_MS)),
      ),
    );

  for (const row of inWindow) {
    if (!row.trialEndsAt) continue;
    const msLeft = row.trialEndsAt.getTime() - now.getTime();
    const kinds: TrialReminderKind[] = [];
    // Rattrapage : dès que l’on est dans la fenêtre ≤ 7 j, tenter d7 ; ≤ 1 j, tenter d1
    if (msLeft <= 7 * DAY_MS && msLeft > 0) kinds.push("d7");
    if (msLeft <= 1 * DAY_MS && msLeft > 0) kinds.push("d1");

    for (const kind of kinds) {
      const result = await sendTrialReminder({ tenantId: row.tenantId, kind });
      if (result === "sent") reminders += 1;
    }
  }

  const overdue = await control
    .select({ tenantId: subscriptions.tenantId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        isNotNull(subscriptions.trialEndsAt),
        lt(subscriptions.trialEndsAt, now),
      ),
    );

  for (const row of overdue) {
    await applyLifecycle(row.tenantId, "trial.elapsed");
    expired += 1;
  }

  const pastDue = await control
    .select({ tenantId: subscriptions.tenantId, graceEndsAt: subscriptions.graceEndsAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "past_due"), isNotNull(subscriptions.graceEndsAt)));

  for (const row of pastDue) {
    if (row.graceEndsAt && row.graceEndsAt.getTime() <= now.getTime()) {
      await applyLifecycle(row.tenantId, "grace.elapsed");
    }
  }

  logger.info({ event: "trial_scan.done", reminders, expired }, "Scan essai terminé");
  return { reminders, expired };
}
