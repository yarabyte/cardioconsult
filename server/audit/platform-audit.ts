import { uuidv7 } from "uuidv7";
import { platformAuditEvents } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { logger } from "@/lib/logging/logger";

export type PlatformAuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  outcome?: "success" | "failure" | "access_denied";
  meta?: Record<string, unknown>;
  requestId?: string | null;
};

/** Audit control-plane (équipe, authz) — jamais de contenu clinique. */
export async function writePlatformAudit(input: PlatformAuditInput): Promise<void> {
  const row = {
    id: uuidv7(),
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    outcome: input.outcome ?? "success",
    meta: input.meta ?? null,
    requestId: input.requestId ?? null,
  };

  try {
    const control = getControlDb();
    await control.insert(platformAuditEvents).values(row);
  } catch (err) {
    logger.warn(
      {
        event: "platform_audit_fail",
        action: input.action,
        err: err instanceof Error ? err.message : "x",
      },
      "Écriture audit plateforme échouée",
    );
  }
}
