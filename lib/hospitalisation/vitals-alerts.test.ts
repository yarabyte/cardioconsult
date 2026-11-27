import { describe, expect, it } from "vitest";
import { DEFAULT_VITALS_THRESHOLDS, evaluateVitalsAlerts } from "./vitals-alerts";

describe("P15 — alertes de bornes", () => {
  it("signale TAS < 90 et > 180", () => {
    expect(
      evaluateVitalsAlerts(
        {
          tasMmHg: 88,
          tadMmHg: 60,
          fcBpm: null,
          spo2Pct: null,
          temperatureC: null,
          frPerMin: null,
          weightKg: null,
          eva: null,
        },
        DEFAULT_VITALS_THRESHOLDS,
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/TAS 88 < 90/)]));

    expect(
      evaluateVitalsAlerts({
        tasMmHg: 188,
        tadMmHg: 90,
        fcBpm: null,
        spo2Pct: null,
        temperatureC: null,
        frPerMin: null,
        weightKg: null,
        eva: null,
      }),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/TAS 188 > 180/)]));
  });

  it("n'émet pas de libellé décisionnel", () => {
    const alerts = evaluateVitalsAlerts({
      tasMmHg: 200,
      tadMmHg: 120,
      fcBpm: 150,
      spo2Pct: 85,
      temperatureC: 39,
      frPerMin: null,
      weightKg: null,
      eva: null,
    });
    const blob = alerts.join(" ");
    expect(blob).toMatch(/alerte de mesure/i);
    expect(blob).not.toMatch(/\b(indication|diagnostic|traitement recommandé)\b/i);
  });
});
