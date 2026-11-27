import { describe, expect, it } from "vitest";
import { isValidRppsChecksum, ManualReviewRppsVerifier } from "./manual-review";

describe("isValidRppsChecksum", () => {
  it("accepte un RPPS à clé valide", () => {
    expect(isValidRppsChecksum("10001234567")).toBe(true);
  });

  it("refuse format incorrect", () => {
    expect(isValidRppsChecksum("123")).toBe(false);
    expect(isValidRppsChecksum("abcdefghijk")).toBe(false);
  });

  it("refuse mauvaise clé", () => {
    expect(isValidRppsChecksum("10001234568")).toBe(false);
  });
});

describe("ManualReviewRppsVerifier", () => {
  it("renvoie pending_manual_review si checksum OK", async () => {
    const r = await new ManualReviewRppsVerifier().verify("10001234567");
    expect(r.status).toBe("pending_manual_review");
  });

  it("rejette si checksum KO", async () => {
    const r = await new ManualReviewRppsVerifier().verify("10001234568");
    expect(r.status).toBe("rejected");
  });
});
