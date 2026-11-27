import { describe, expect, it } from "vitest";

describe("env", () => {
  it("expose une configuration validée avec les défauts locaux", async () => {
    const { env } = await import("./env");
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.S3_BUCKET).toBe("cardioconsult-dev");
    expect(env.APP_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.NEXT_PUBLIC_ROOT_DOMAIN).toBeTruthy();
  });
});
