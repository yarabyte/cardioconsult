import { describe, expect, it } from "vitest";
import { assertProductionGuards } from "@/env";
import { getOtelStatus } from "@/lib/observability/otel";
import { defaultClinicalFlags } from "@/lib/clinical/feature-flags";

describe("P19 — portes production", () => {
  it("refuse le secret par défaut en production", () => {
    expect(() =>
      assertProductionGuards({
        appEnv: "production",
        appSecret: "dev-only-change-me-32chars-minimum!!",
      }),
    ).toThrow(/APP_SECRET/);
  });

  it("autorise la config prod stricte", () => {
    expect(() =>
      assertProductionGuards({
        appEnv: "production",
        appSecret: "prod-secret-at-least-32-characters!",
      }),
    ).not.toThrow();
  });

  it("laisse passer le développement", () => {
    expect(() =>
      assertProductionGuards({
        appEnv: "development",
        appSecret: "dev-only-change-me-32chars-minimum!!",
      }),
    ).not.toThrow();
  });

  it("garde les flags cliniques off hors démo", () => {
    const flags = defaultClinicalFlags(false);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });

  it("OTel désactivé sans endpoint", () => {
    const prev = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(getOtelStatus().enabled).toBe(false);
    if (prev !== undefined) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = prev;
  });
});
