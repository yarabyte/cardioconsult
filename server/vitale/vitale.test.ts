import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-context", () => ({
  requireContext: vi.fn(async () => ({
    tenant: { id: "t1", slug: "dr-martin" },
    user: { id: "u1", name: "Test", email: "t@test.fr" },
    role: "MEDECIN",
    requestId: "req",
    db: null,
    member: null,
    sessionId: null,
    mfaSatisfied: true,
    stepUpValid: false,
  })),
  AccessDeniedError: class extends Error {},
}));

import { readCarteVitaleAction } from "@/server/actions/vitale";

describe("readCarteVitaleAction", () => {
  it("retourne not_available sans connecteur", async () => {
    const r = await readCarteVitaleAction();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_available");
  });
});
