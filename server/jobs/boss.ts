import { PgBoss } from "pg-boss";
import { env } from "@/env";
import { logger } from "@/lib/logging/logger";
import {
  TENANT_PROVISION_QUEUE,
  provisionTenant,
  type TenantProvisionPayload,
} from "./tenant-provision";
import {
  TRIAL_REMINDER_QUEUE,
  TRIAL_SCAN_QUEUE,
  runTrialScan,
  sendTrialReminder,
  type TrialReminderPayload,
} from "./trial-reminders";

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    application_name: "cardioconsult-jobs",
  });
  boss.on("error", (err) => {
    logger.error({ err: err.message, event: "pgboss.error" }, "Erreur pg-boss");
  });
  await boss.start();
  return boss;
}

export async function registerJobHandlers(): Promise<void> {
  const b = await getBoss();

  await b.createQueue(TENANT_PROVISION_QUEUE);
  await b.work<TenantProvisionPayload>(TENANT_PROVISION_QUEUE, async ([job]) => {
    if (!job) return;
    await provisionTenant(job.data);
  });

  await b.createQueue(TRIAL_REMINDER_QUEUE);
  await b.work<TrialReminderPayload>(TRIAL_REMINDER_QUEUE, async ([job]) => {
    if (!job) return;
    await sendTrialReminder(job.data);
  });

  await b.createQueue(TRIAL_SCAN_QUEUE);
  await b.work(TRIAL_SCAN_QUEUE, async () => {
    await runTrialScan();
  });
  try {
    await b.schedule(TRIAL_SCAN_QUEUE, "0 6 * * *", {}, { tz: "Europe/Paris" });
  } catch (err) {
    logger.warn(
      {
        event: "pgboss.schedule_fail",
        err: err instanceof Error ? err.message : "x",
      },
      "Planification trial_scan échouée",
    );
  }

  logger.info({ event: "pgboss.handlers" }, "Handlers pg-boss enregistrés");
}

export async function enqueueTenantProvision(
  payload: TenantProvisionPayload,
): Promise<string | null> {
  const b = await getBoss();
  await b.createQueue(TENANT_PROVISION_QUEUE);
  return b.send(TENANT_PROVISION_QUEUE, payload, {
    singletonKey: payload.tenantId,
    retryLimit: 3,
    retryDelay: 30,
  });
}

export async function stopBoss(): Promise<void> {
  if (!boss) return;
  await boss.stop({ graceful: true, timeout: 10_000 });
  boss = null;
}
