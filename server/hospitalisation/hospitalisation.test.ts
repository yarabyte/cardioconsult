import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateVitalsAlerts,
  DEFAULT_VITALS_THRESHOLDS,
} from "@/lib/hospitalisation/vitals-alerts";
import {
  activateHospitalisationModule,
  getHospitalisationModuleOnDb,
  isHospitalisationEnabledOnDb,
} from "./module";
import { HOSPITALISATION_FLAG_KEY, HOSPITALISATION_MODULE_SETTING } from "./types";

type MockState = {
  flags: Map<string, boolean>;
  settings: Map<string, unknown>;
};

function createMockDb(state: MockState) {
  return {
    select: () => ({
      from: (table: { _: { name: string } }) => ({
        where: () => ({
          limit: async () => {
            if (table._.name === "feature_flag") {
              const enabled = state.flags.get(HOSPITALISATION_FLAG_KEY);
              return enabled === undefined ? [] : [{ key: HOSPITALISATION_FLAG_KEY, enabled }];
            }
            if (table._.name === "setting") {
              const value = state.settings.get(HOSPITALISATION_MODULE_SETTING);
              return value === undefined ? [] : [{ key: HOSPITALISATION_MODULE_SETTING, value }];
            }
            return [];
          },
        }),
      }),
    }),
    insert: (table: { _: { name: string } }) => ({
      values: (row: Record<string, unknown>) => ({
        onConflictDoUpdate: async (opts: { set: Record<string, unknown> }) => {
          if (table._.name === "feature_flag") {
            state.flags.set(String(row.key), Boolean(opts.set.enabled ?? row.enabled));
          }
          if (table._.name === "setting") {
            state.settings.set(String(row.key), opts.set.value ?? row.value);
          }
        },
        onConflictDoNothing: async () => {},
      }),
    }),
  };
}

vi.mock("@/server/db/tenant-db", () => ({
  withTenantDb: vi.fn(
    async (_tenantId: string, fn: (db: ReturnType<typeof createMockDb>) => Promise<unknown>) => {
      const state: MockState = {
        flags: new Map(),
        settings: new Map(),
      };
      return fn(createMockDb(state));
    },
  ),
}));

vi.mock("@/db/tenant/schema", () => ({
  featureFlags: { _: { name: "feature_flag" } },
  settings: { _: { name: "setting" } },
}));

describe("P15 — hospitalisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persiste l'alerte de borne sur la mesure", () => {
    const alerts = evaluateVitalsAlerts(
      {
        tasMmHg: 188,
        tadMmHg: 95,
        fcBpm: 80,
        spo2Pct: 97,
        temperatureC: 36.8,
        frPerMin: 18,
        weightKg: 71,
        eva: 1,
      },
      DEFAULT_VITALS_THRESHOLDS,
    );
    expect(alerts.some((a) => a.includes("TAS 188"))).toBe(true);
  });

  it("refuse l'activation sans contrat établissement", async () => {
    const r = await activateHospitalisationModule("tenant-x", {
      actorId: "demo-sa",
      actorRole: "SUPERADMIN",
      establishmentContractSigned: false,
      plan: "clinique",
    });
    expect(r.ok).toBe(false);
    const state = { flags: new Map<string, boolean>(), settings: new Map<string, unknown>() };
    const enabled = await isHospitalisationEnabledOnDb(createMockDb(state) as never);
    expect(enabled).toBe(false);
  });

  it("active le module avec contrat signé (SUPERADMIN)", async () => {
    const r = await activateHospitalisationModule("tenant-y", {
      actorId: "demo-sa",
      actorRole: "SUPERADMIN",
      establishmentContractSigned: true,
      plan: "clinique",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.enabled).toBe(true);
    expect(r.state.plan).toBe("clinique");
  });

  it("lit le module activé en base", async () => {
    await activateHospitalisationModule("tenant-z", {
      actorId: "demo-sa",
      actorRole: "SUPERADMIN",
      establishmentContractSigned: true,
      plan: "clinique",
    });
    const state = {
      flags: new Map([[HOSPITALISATION_FLAG_KEY, true]]),
      settings: new Map([
        [
          HOSPITALISATION_MODULE_SETTING,
          {
            plan: "clinique",
            establishmentContractSigned: true,
            signedAt: "2026-01-15T10:00:00+01:00",
            signedBy: "demo-sa",
          },
        ],
      ]),
    };
    const hospitalisationModule = await getHospitalisationModuleOnDb(createMockDb(state) as never);
    expect(hospitalisationModule.enabled).toBe(true);
    expect(await isHospitalisationEnabledOnDb(createMockDb(state) as never)).toBe(true);
  });
});
