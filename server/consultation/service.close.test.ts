import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/tenant-db", () => ({
  withTenantDb: vi.fn(),
}));

describe("saveEncounterDraft après clôture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("renvoie code closed lorsque le statut DB est termine", async () => {
    const { withTenantDb } = await import("@/server/db/tenant-db");
    vi.mocked(withTenantDb).mockImplementation(async (_tenantId, fn) => {
      const db = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: "enc-1",
                  patientId: "p1",
                  status: "termine",
                  version: 3,
                  datedAt: new Date("2026-11-23T10:00:00.000Z"),
                  updatedAt: new Date("2026-11-23T11:00:00.000Z"),
                  updatedBy: "u1",
                  motifEnc: null,
                  type: "consultation",
                  stayId: null,
                  authorId: "u1",
                  historySummaryEnc: null,
                  antecedentsTextEnc: null,
                  treatmentsTextEnc: null,
                },
              ],
            }),
          }),
        }),
      };
      return fn(db as never);
    });

    const { saveEncounterDraft } = await import("./service");
    const r = await saveEncounterDraft("tenant-x", "enc-1", 3, { motif: "x" }, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("closed");
  });
});
