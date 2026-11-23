import { describe, expect, it } from "vitest";
import { computeBsa } from "./bsa";

describe("computeBsa", () => {
  it("computes Mosteller for Jeanne Dupont", () => {
    const result = computeBsa(1.64, 82.1);
    expect(result.status).toBe("calcule");
    // Mosteller √((164×82,1)/3600) ≈ 1,934 → 1,93
    expect(result.value).toBe(1.93);
  });

  it("rejects missing values", () => {
    const result = computeBsa(null, 80);
    expect(result.status).toBe("incomplet");
    expect(result.missingInputs).toContain("Taille");
  });

  it("rejects impossible values", () => {
    const result = computeBsa(3.5, 80);
    expect(result.status).toBe("non_applicable");
  });
});
