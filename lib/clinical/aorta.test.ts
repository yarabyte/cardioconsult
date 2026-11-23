import { describe, expect, it } from "vitest";
import { evaluateAorticSegment } from "./aorta";

describe("evaluateAorticSegment", () => {
  it("flags ascendante 60 mm as potentially urgent (≥55)", () => {
    const result = evaluateAorticSegment({
      segment: "ascendante",
      diameterMm: 60,
      datedAt: "2026-11-23",
      priorDiameterMm: 57,
      priorDatedAt: "2025-11-01",
    });
    expect(result.level).toBe("potentiellement_urgent");
    expect(result.score.status).toBe("calcule");
    expect(result.growthMmPerYear).not.toBeNull();
  });

  it("does not compute growth without prior dated measure", () => {
    const result = evaluateAorticSegment({
      segment: "sinus",
      diameterMm: 45,
      datedAt: "2026-11-23",
    });
    expect(result.growthMmPerYear).toBeNull();
    expect(result.level).toBe("alerte_mesure");
  });

  it("marks missing diameter as incomplet", () => {
    const result = evaluateAorticSegment({
      segment: "descendante",
      diameterMm: null,
      datedAt: "2026-11-23",
    });
    expect(result.score.status).toBe("incomplet");
  });
});
