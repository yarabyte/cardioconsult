import { describe, expect, it } from "vitest";
import { computeRcri } from "./rcri";

describe("computeRcri", () => {
  it("scores creatinine criterion", () => {
    const result = computeRcri({
      highRiskSurgery: "non",
      ischemicHeartDisease: "non",
      heartFailure: "non",
      cerebrovascularDisease: "non",
      insulinDependentDiabetes: "non",
      creatinineAbove177: "oui",
    });
    expect(result.status).toBe("calcule");
    expect(result.value).toBe(1);
  });
});
