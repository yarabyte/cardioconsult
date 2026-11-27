import { createHash } from "node:crypto";

export interface AuditHashInput {
  id: string;
  at: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
  prevHash: string | null;
}

export function computeAuditHash(input: AuditHashInput): string {
  const payload = [
    input.id,
    input.at,
    input.actorId ?? "",
    input.action,
    input.entityType,
    input.entityId,
    input.outcome,
    input.prevHash ?? "GENESIS",
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function verifyAuditChain(
  events: Array<AuditHashInput & { hash: string }>,
): { ok: true } | { ok: false; index: number; reason: string } {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if ((ev.prevHash ?? null) !== prev) {
      return { ok: false, index: i, reason: "prevHash rupture" };
    }
    const expected = computeAuditHash({ ...ev, prevHash: prev });
    if (expected !== ev.hash) {
      return { ok: false, index: i, reason: "hash mismatch" };
    }
    prev = ev.hash;
  }
  return { ok: true };
}
