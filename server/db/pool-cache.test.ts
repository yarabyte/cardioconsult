import { describe, expect, it, vi } from "vitest";
import { TenantPoolCache } from "./pool-cache";

vi.mock("pg", () => {
  class Pool {
    connectionString: string;
    ended = false;
    constructor(opts: { connectionString: string }) {
      this.connectionString = opts.connectionString;
    }
    async end() {
      this.ended = true;
    }
  }
  return { default: { Pool }, Pool };
});

describe("TenantPoolCache", () => {
  it("ne réutilise jamais un pool pour un autre tenant", () => {
    const cache = new TenantPoolCache({ maxPools: 2 });
    const a = cache.getOrCreate("t-a", "postgres://a");
    const b = cache.getOrCreate("t-b", "postgres://b");
    expect(a).not.toBe(b);
    const a2 = cache.getOrCreate("t-a", "postgres://a");
    expect(a2).toBe(a);
  });

  it("évince le plus ancien au-delà de maxPools", async () => {
    const cache = new TenantPoolCache({ maxPools: 2 });
    cache.getOrCreate("t1", "postgres://1");
    cache.getOrCreate("t2", "postgres://2");
    cache.getOrCreate("t3", "postgres://3");
    expect(cache.size()).toBe(2);
    await cache.endAll();
  });
});
