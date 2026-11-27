import { createHmac } from "node:crypto";
import { env } from "@/env";
import type { AuditEventRow } from "./types";

export function auditEventsToCsv(events: AuditEventRow[]): string {
  const header = [
    "id",
    "at",
    "actorId",
    "actorRole",
    "action",
    "entityType",
    "entityId",
    "outcome",
    "requestId",
    "prevHash",
    "hash",
  ].join(",");
  const lines = events.map((e) =>
    [
      e.id,
      e.at.toISOString(),
      e.actorId ?? "",
      e.actorRole ?? "",
      e.action,
      e.entityType,
      e.entityId,
      e.outcome,
      e.requestId ?? "",
      e.prevHash ?? "",
      e.hash,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Signature HMAC du CSV (horodatée). */
export function signAuditExport(csv: string, exportedAtIso: string): string {
  return createHmac("sha256", env.APP_SECRET)
    .update(`${exportedAtIso}\n${csv}`)
    .digest("base64url");
}

export function verifyAuditExportSignature(
  csv: string,
  exportedAtIso: string,
  signature: string,
): boolean {
  const expected = signAuditExport(csv, exportedAtIso);
  return expected === signature;
}
