import type { RequestContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "./record";
import type { AuditEventInput, AuditOutcome } from "./types";

type WithAuditOpts = {
  action: string;
  entityType: string;
  entityId: string | ((result: unknown) => string);
  outcome?: AuditOutcome | ((result: unknown) => AuditOutcome);
};

/**
 * Enveloppe une mutation déjà autorisée : un seul événement d'audit après succès.
 */
export async function withAudit<T>(
  ctx: RequestContext,
  opts: WithAuditOpts,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  const entityId = typeof opts.entityId === "function" ? opts.entityId(result) : opts.entityId;
  const outcome =
    typeof opts.outcome === "function" ? opts.outcome(result) : (opts.outcome ?? "success");

  const input: AuditEventInput = {
    action: opts.action,
    entityType: opts.entityType,
    entityId,
    outcome,
    actorId: ctx.user.id,
    actorRole: ctx.role,
    requestId: ctx.requestId,
  };

  if (!ctx.tenant?.id || !ctx.db) {
    throw new Error("Contexte tenant requis pour l'audit");
  }
  await recordAuditEvent(ctx.tenant.id, input, ctx.db);
  return result;
}
