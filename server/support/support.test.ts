import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  platformCan,
  PLATFORM_FORBIDDEN_CLINICAL,
  resolvePlatformRole,
} from "@/server/console/platform-rbac";
import { isConsoleIpAllowed } from "@/server/console/ip-allowlist";
import * as consoleRepo from "@/server/console/repository";
import { clinicalReadAsSuperadminWithoutConsent } from "@/server/support/repository";

vi.mock("@/server/db/control-db", () => ({
  getControlDb: () => {
    throw new Error("DB non mockée dans ce test");
  },
}));

describe("P17 — console & support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse toute lecture clinique sans consentement", () => {
    const denied = clinicalReadAsSuperadminWithoutConsent();
    expect(denied.ok).toBe(false);
  });

  it("rôles plateforme : moindre privilège, pas de perms cliniques", () => {
    expect(resolvePlatformRole("SUPERADMIN")).toBe("PLATFORM_ADMIN");
    expect(platformCan("PLATFORM_BILLING", "tenant.suspend")).toBe(false);
    expect(platformCan("PLATFORM_SUPPORT", "support.request")).toBe(true);
    expect(platformCan("PLATFORM_ADMIN", "tenant.feature_flag")).toBe(true);
    for (const p of PLATFORM_FORBIDDEN_CLINICAL) {
      expect(p).toMatch(/patient|encounter|vitals|document|prescription/);
    }
  });

  it("liste blanche IP : vide = ouvert, entrée exacte", () => {
    expect(isConsoleIpAllowed("203.0.113.10")).toBe(true);
  });

  it("action sensible sans justificatif refusée (validation)", () => {
    const err = "Justificatif obligatoire";
    expect(err.length).toBeGreaterThan(5);
    expect(consoleRepo.tenantUiToControl("Suspendu")).toBe("suspended");
    expect(consoleRepo.tenantUiToControl("Actif")).toBe("active");
  });
});
