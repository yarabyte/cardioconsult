import { describe, expect, it, vi } from "vitest";
import { verifyAuditChain } from "@/server/audit/hash-chain";
import {
  auditContainsPhi,
  auditEventsToCsv,
  signAuditExport,
  verifyAuditExportSignature,
  withAudit,
} from "./index";
import type { RequestContext } from "@/server/auth/require-context";
import type { AuditEventRow } from "./types";

describe("audit service", () => {
  it("détecte une chaîne altérée", () => {
    const at = new Date();
    const a: AuditEventRow = {
      id: "1",
      at,
      actorId: null,
      actorRole: null,
      action: "a",
      entityType: "e",
      entityId: "1",
      outcome: "success",
      ipTruncated: null,
      userAgentHash: null,
      requestId: null,
      prevHash: null,
      hash: "hash-a",
    };
    const b: AuditEventRow = {
      ...a,
      id: "2",
      action: "b",
      entityId: "2",
      prevHash: a.hash,
      hash: "hash-b",
    };
    const list = [a, b];
    list[1]!.hash = "tampered";
    const chain = verifyAuditChain(
      list.map((e) => ({
        id: e.id,
        at: e.at.toISOString(),
        actorId: e.actorId ?? null,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        outcome: e.outcome,
        prevHash: e.prevHash,
        hash: e.hash,
      })),
    );
    expect(chain.ok).toBe(false);
    expect(a.hash).toBeTruthy();
  });

  it("withAudit produit exactement un événement", async () => {
    const auditRecord = await import("./record");
    const spy = vi.spyOn(auditRecord, "recordAuditEvent").mockResolvedValue({
      id: "e1",
      at: new Date(),
      actorId: "u1",
      actorRole: "MEDECIN",
      action: "document.validate",
      entityType: "document",
      entityId: "doc-1",
      outcome: "success",
      ipTruncated: null,
      userAgentHash: null,
      requestId: "req-1",
      prevHash: null,
      hash: "h",
    });

    const ctx = {
      user: { id: "u1", name: "X", email: "x@y.z", role: "MEDECIN" as const, isTenantAdmin: true },
      member: null,
      role: "MEDECIN" as const,
      tenant: { id: "tenant-a", slug: "t" },
      db: {} as RequestContext["db"],
      requestId: "req-1",
      sessionId: null,
      mfaSatisfied: true,
      stepUpValid: true,
    } satisfies RequestContext;

    await withAudit(
      ctx,
      { action: "document.validate", entityType: "document", entityId: "doc-1" },
      async () => ({ ok: true }),
    );
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("refuse PHI dans les champs audit", () => {
    expect(
      auditContainsPhi({ action: "patient.open", entityId: "CC-000231" }, [
        "Jeanne",
        "Dupont",
        "1959-03-14",
      ]),
    ).toBe(false);
    expect(
      auditContainsPhi({ action: "patient.open", entityId: "Jeanne Dupont" }, ["Jeanne", "Dupont"]),
    ).toBe(true);
  });

  it("export CSV signé vérifiable", () => {
    const e = {
      id: "e1",
      at: new Date(),
      actorId: "u1",
      actorRole: "MEDECIN",
      action: "audit.export",
      entityType: "audit_journal",
      entityId: "tenant-export",
      outcome: "success" as const,
      ipTruncated: null,
      userAgentHash: null,
      requestId: null,
      prevHash: null,
      hash: "h",
    };
    const csv = auditEventsToCsv([e]);
    const at = new Date().toISOString();
    const sig = signAuditExport(csv, at);
    expect(verifyAuditExportSignature(csv, at, sig)).toBe(true);
    expect(verifyAuditExportSignature(csv + "x", at, sig)).toBe(false);
  });
});
