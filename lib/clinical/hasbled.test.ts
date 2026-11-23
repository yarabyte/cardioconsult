import { describe, expect, it } from "vitest";
import { computeHasbled } from "./hasbled";

describe("computeHasbled", () => {
  it("never treats unknown as 0", () => {
    const result = computeHasbled({
      birthDate: "1952-04-08",
      actDate: "2026-11-23",
      criteria: {
        hta: "oui",
        renal: "non",
        liver: "non",
        stroke: "non",
        bleeding: "non",
        labileInr: "inconnu",
        drugsOrAlcohol: "non",
      },
    });
    expect(result.status).toBe("incomplet");
    expect(result.range?.min).toBe(2);
    expect(result.range?.max).toBe(3);
  });
});
