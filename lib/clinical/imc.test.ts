import { describe, expect, it } from "vitest";
import { computeImc } from "./imc";

describe("computeImc", () => {
  it("cas nominal", () => {
    const r = computeImc(1.75, 70);
    expect(r.status).toBe("calcule");
    expect(r.value).toBe(22.9);
  });

  it("incomplet si manquant", () => {
    expect(computeImc(null, 70).status).toBe("incomplet");
  });
});
