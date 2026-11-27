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

  it("does not treat notVisualized / 0 as a real diameter", () => {
    const result = evaluateAorticSegment({
      segment: "ascendante",
      diameterMm: 0,
      notVisualized: true,
      datedAt: "2026-11-23",
    });
    expect(result.diameterMm).toBeNull();
    expect(result.score.status).toBe("incomplet");
    expect(result.level).toBe("non_renseigne");
  });

  it("T-11 — descendante 60 mm n'alerte pas l'ascendante 38 mm", () => {
    const asc = evaluateAorticSegment({
      segment: "ascendante",
      diameterMm: 38,
      datedAt: "2026-11-23",
    });
    const desc = evaluateAorticSegment({
      segment: "descendante",
      diameterMm: 60,
      datedAt: "2026-11-23",
    });
    expect(asc.level).toBe("sous_seuil");
    expect(desc.level).toBe("potentiellement_urgent");
  });

  it("T-12 — aucune mesure → non_renseigne (pas « normal »)", () => {
    const r = evaluateAorticSegment({
      segment: "sinus",
      diameterMm: null,
      datedAt: "2026-11-23",
    });
    expect(r.level).toBe("non_renseigne");
    expect(r.score.status).toBe("incomplet");
  });
});
