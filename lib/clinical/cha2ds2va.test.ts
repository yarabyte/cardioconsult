import { describe, expect, it } from "vitest";
import { computeCha2ds2va } from "./cha2ds2va";

describe("computeCha2ds2va", () => {
  it("returns a range when a criterion is unknown (never 0)", () => {
    const result = computeCha2ds2va({
      birthDate: "1952-04-08",
      actDate: "2026-11-23",
      criteria: {
        insuffisanceCardiaque: "non",
        hta: "oui",
        diabete: "non",
        avc: "inconnu",
        vasculaire: "oui",
      },
    });
    expect(result.status).toBe("incomplet");
    expect(result.value).toBeNull();
    expect(result.range).toEqual({ min: 3, max: 5 });
    expect(result.missingInputs).toContain("AVC / AIT / embolie systémique");
  });

  it("calculates age at act date (≥75 → +2)", () => {
    const result = computeCha2ds2va({
      birthDate: "1940-01-01",
      actDate: "2026-11-23",
      criteria: {
        insuffisanceCardiaque: "non",
        hta: "non",
        diabete: "non",
        avc: "non",
        vasculaire: "non",
      },
    });
    expect(result.status).toBe("calcule");
    expect(result.value).toBe(2);
  });

  it("scores complete Annie-like profile without stroke unknown", () => {
    const result = computeCha2ds2va({
      birthDate: "1952-04-08",
      actDate: "2026-11-23",
      criteria: {
        insuffisanceCardiaque: "non",
        hta: "oui",
        diabete: "non",
        avc: "non",
        vasculaire: "oui",
      },
    });
    expect(result.status).toBe("calcule");
    expect(result.value).toBe(3);
  });
});
