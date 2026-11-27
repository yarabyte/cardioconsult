import { describe, expect, it } from "vitest";
import { emptyEcg, validateEcg } from "./ecg";
import { emptyAortaDraft, evaluateAortaDraft, normalizeAortaSegment } from "./aorta-measure";
import { checkLabRange } from "./lab";

describe("ECG — QTc avec méthode", () => {
  it("refuse un QTc sans méthode", () => {
    const r = validateEcg({ ...emptyEcg(), qtcMs: 420, qtcMethod: null });
    expect(r.success).toBe(false);
  });

  it("accepte QTc + Fridericia", () => {
    const r = validateEcg({ ...emptyEcg(), qtcMs: 420, qtcMethod: "Fridericia" });
    expect(r.success).toBe(true);
  });
});

describe("Aorte — non visualisé ≠ 0", () => {
  it("normalise non visualisé en diamètre null", () => {
    const n = normalizeAortaSegment({
      segment: "ascendante",
      diameterMm: 0,
      notVisualized: true,
      method: "ETT",
      quality: null,
      datedAt: "2026-11-23",
    });
    expect(n.diameterMm).toBeNull();
  });

  it("n'évalue pas un segment non visualisé comme 0 mm", () => {
    const draft = emptyAortaDraft();
    draft.datedAt = "2026-11-23";
    draft.segments = draft.segments.map((s) =>
      s.segment === "ascendante" ? { ...s, notVisualized: true, diameterMm: 0 } : s,
    );
    const results = evaluateAortaDraft(draft);
    const asc = results.find((r) => r.segment === "ascendante")!;
    expect(asc.diameterMm).toBeNull();
    expect(asc.score.status).toBe("incomplet");
    expect(asc.level).not.toBe("potentiellement_urgent");
    expect(asc.score.rationale.some((x) => /non visualisé/i.test(x))).toBe(true);
  });
});

describe("Biologie — plages larges", () => {
  it("signale une kaliémie absurde", () => {
    const r = checkLabRange("kaliemie_mmol_l", 99);
    expect(r.ok).toBe(false);
  });
});
