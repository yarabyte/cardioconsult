"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { requireStepUp } from "@/server/auth/step-up";
import {
  auditEventsToCsv,
  checkAuditIntegrity,
  listAuditEvents,
  recordAuditEvent,
  signAuditExport,
  type AuditEventRow,
} from "@/server/services/audit";
import { writePlatformAudit } from "@/server/audit/platform-audit";

export type AuditJournalRow = {
  id: string;
  atLabel: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
};

function toRow(e: AuditEventRow): AuditJournalRow {
  return {
    id: e.id,
    atLabel: e.at.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    actorId: e.actorId ?? "—",
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    outcome: e.outcome,
  };
}

async function resolveTenantCtx() {
  const ctx = await requireContext({ permission: "audit.read", redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    role: ctx.role,
    requestId: ctx.requestId,
    db: ctx.db,
  };
}

export async function fetchAuditJournal(raw: unknown): Promise<
  | {
      ok: true;
      rows: AuditJournalRow[];
      integrity: { ok: boolean; count: number; reason?: string };
    }
  | { ok: false; error: string }
> {
  try {
    const filters = z
      .object({
        action: z.string().optional(),
        actorId: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
      })
      .parse(raw ?? {});

    const ctx = await resolveTenantCtx();
    const events = await listAuditEvents(
      ctx.tenantId,
      {
        action: filters.action || undefined,
        actorId: filters.actorId || undefined,
        entityType: filters.entityType || undefined,
        entityId: filters.entityId || undefined,
        limit: 100,
      },
      ctx.db ?? undefined,
    );
    const integrity = await checkAuditIntegrity(ctx.tenantId, ctx.db ?? undefined);
    return {
      ok: true,
      rows: events.map(toRow),
      integrity: integrity.ok
        ? { ok: true, count: integrity.count }
        : { ok: false, count: integrity.count, reason: integrity.reason },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof AccessDeniedError ? err.message : "Impossible de charger le journal",
    };
  }
}

export async function exportAuditJournalCsv(
  raw: unknown,
): Promise<
  { ok: true; csv: string; signature: string; exportedAt: string } | { ok: false; error: string }
> {
  try {
    await requireContext({ permission: "audit.read", stepUp: true, redirectOnFail: false });
    await requireStepUp();

    const filters = z
      .object({
        action: z.string().optional(),
        actorId: z.string().optional(),
      })
      .parse(raw ?? {});

    const ctx = await resolveTenantCtx();
    const events = await listAuditEvents(
      ctx.tenantId,
      {
        action: filters.action || undefined,
        actorId: filters.actorId || undefined,
        limit: 500,
      },
      ctx.db ?? undefined,
    );
    const csv = auditEventsToCsv(events);
    const exportedAt = new Date().toISOString();
    const signature = signAuditExport(csv, exportedAt);

    await recordAuditEvent(ctx.tenantId, {
      action: "audit.export",
      entityType: "audit_log",
      entityId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
    });

    await writePlatformAudit({
      actorId: ctx.userId,
      action: "audit.journal_export",
      entityType: "tenant",
      entityId: ctx.tenantId,
      requestId: ctx.requestId,
    });

    return { ok: true, csv, signature, exportedAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof AccessDeniedError ? err.message : "Export impossible",
    };
  }
}
