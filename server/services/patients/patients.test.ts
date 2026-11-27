import { describe, expect, it } from "vitest";
import { NotAvailableInsProvider } from "@/server/ins/not-available";

describe("patients service", () => {
  it("InsProvider NotAvailable ne qualifie jamais", async () => {
    const r = await new NotAvailableInsProvider().lookup({
      firstName: "A",
      lastName: "B",
      birthDate: "2000-01-01",
      sex: "F",
    });
    expect(r.status).toBe("unavailable");
  });
});
