import { describe, expect, it } from "vitest";
import { computeAuditHash, verifyAuditChain } from "./hash-chain";

describe("chaîne de hachage audit", () => {
  it("vérifie une chaîne valide", () => {
    const e1 = {
      id: "1",
      at: "2026-11-23T08:00:00.000Z",
      actorId: "u1",
      action: "patient.open",
      entityType: "patient",
      entityId: "p1",
      outcome: "success",
      prevHash: null as string | null,
      hash: "",
    };
    e1.hash = computeAuditHash(e1);
    const e2 = {
      ...e1,
      id: "2",
      action: "patient.write",
      prevHash: e1.hash,
      hash: "",
    };
    e2.hash = computeAuditHash(e2);
    expect(verifyAuditChain([e1, e2])).toEqual({ ok: true });
  });

  it("détecte une rupture", () => {
    const e1 = {
      id: "1",
      at: "t",
      actorId: null,
      action: "a",
      entityType: "e",
      entityId: "i",
      outcome: "success",
      prevHash: null as string | null,
      hash: "",
    };
    e1.hash = computeAuditHash(e1);
    const e2 = {
      ...e1,
      id: "2",
      prevHash: "tampered",
      hash: "x",
    };
    const result = verifyAuditChain([e1, e2]);
    expect(result.ok).toBe(false);
  });
});
