import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/control-db", () => ({
  getControlDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
  }),
}));

import { findTenantBySlug } from "./by-slug";

describe("findTenantBySlug", () => {
  it("refuse un slug invalide sans lecture base", async () => {
    expect(await findTenantBySlug("A")).toBeNull();
    expect(await findTenantBySlug("-bad")).toBeNull();
    expect(await findTenantBySlug("www")).toBeNull();
  });

  it("renvoie null si le slug est absent en base", async () => {
    expect(await findTenantBySlug("dr1-martin")).toBeNull();
  });
});
