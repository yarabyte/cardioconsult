import { describe, expect, it, beforeEach } from "vitest";
import {
  PERMISSIONS,
  REGULATORY_LOCKED,
  can,
  navForSubject,
  resetNursePermissions,
  resolveNursePermissions,
  seatLimitForPlan,
  setNursePermission,
  type Permission,
} from "./rbac";

const ALL = PERMISSIONS;

function truth(
  role: "MEDECIN" | "INFIRMIERE" | "SUPERADMIN",
  isTenantAdmin: boolean,
  nurseExtra?: Permission[],
): Record<Permission, boolean> {
  const user = { role, isTenantAdmin };
  const out = {} as Record<Permission, boolean>;
  for (const p of ALL) {
    out[p] = can(user, p, nurseExtra ? { nurseExtra } : undefined);
  }
  return out;
}

describe("matrice RBAC — table de vérité", () => {
  beforeEach(() => {
    resetNursePermissions();
  });

  it("MEDECIN admin : tout sauf console", () => {
    const t = truth("MEDECIN", true);
    for (const p of ALL) {
      if (p === "console.manage") expect(t[p]).toBe(false);
      else expect(t[p]).toBe(true);
    }
  });

  it("MEDECIN non-admin : pas d'admin-only", () => {
    const t = truth("MEDECIN", false);
    expect(t["patient.read"]).toBe(true);
    expect(t["document.sign"]).toBe(true);
    expect(t["team.manage"]).toBe(false);
    expect(t["settings.manage"]).toBe(false);
    expect(t["billing.manage"]).toBe(false);
    expect(t["audit.read"]).toBe(false);
    expect(t["export.data"]).toBe(false);
    expect(t["tenant.admin"]).toBe(false);
  });

  it("INFIRMIERE défaut", () => {
    const t = truth("INFIRMIERE", false);
    expect(t["patient.read"]).toBe(true);
    expect(t["appointment.write"]).toBe(true);
    expect(t["vitals.write"]).toBe(true);
    expect(t["ecg.write"]).toBe(true);
    expect(t["nursing.note.write"]).toBe(true);
    expect(t["exam.write"]).toBe(false);
    expect(t["stats.read"]).toBe(false);
    expect(t["team.manage"]).toBe(false);
    for (const p of REGULATORY_LOCKED) {
      expect(t[p]).toBe(false);
    }
  });

  it("INFIRMIERE + surcharges exam/stats ; verrous intacts", () => {
    const t = truth("INFIRMIERE", false, ["exam.write", "stats.read", "document.sign"]);
    expect(t["exam.write"]).toBe(true);
    expect(t["stats.read"]).toBe(true);
    expect(t["document.sign"]).toBe(false);
    expect(t["prescription.validate"]).toBe(false);
  });

  it("setNursePermission ne peut pas lever un verrou", () => {
    setNursePermission("document.sign", true);
    expect(can({ role: "INFIRMIERE" }, "document.sign")).toBe(false);
  });

  it("SUPERADMIN uniquement console", () => {
    const t = truth("SUPERADMIN", false);
    for (const p of ALL) {
      expect(t[p]).toBe(p === "console.manage");
    }
  });

  it("nav filtrée par can() — infirmière sans paramètres", () => {
    const items = navForSubject({ role: "INFIRMIERE" });
    expect(items.some((i) => i.href === "/parametres/equipe")).toBe(false);
    expect(items.some((i) => i.href === "/infirmiere")).toBe(true);
  });

  it("nav médecin non-admin sans paramètres", () => {
    const items = navForSubject({ role: "MEDECIN", isTenantAdmin: false });
    expect(items.some((i) => i.href === "/parametres/equipe")).toBe(false);
  });

  it("sièges par offre", () => {
    expect(seatLimitForPlan("solo")).toBe(2);
    expect(seatLimitForPlan("cabinet")).toBe(6);
    expect(seatLimitForPlan("clinique")).toBe(50);
  });

  it("resolveNursePermissions retire les verrous", () => {
    const perms = resolveNursePermissions(["document.sign", "exam.write"]);
    expect(perms).toContain("exam.write");
    expect(perms).not.toContain("document.sign");
  });
});
