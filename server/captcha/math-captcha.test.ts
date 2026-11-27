import { describe, expect, it } from "vitest";
import { createMathCaptcha, verifyMathCaptcha } from "./math-captcha";

describe("math captcha", () => {
  it("accepte la bonne réponse", () => {
    const { token, question } = createMathCaptcha();
    const m = question.match(/Combien font (\d+) \+ (\d+)/);
    expect(m).toBeTruthy();
    const answer = String(Number(m![1]) + Number(m![2]));
    expect(verifyMathCaptcha(token, answer)).toBe(true);
  });

  it("refuse une mauvaise réponse", () => {
    const { token } = createMathCaptcha();
    expect(verifyMathCaptcha(token, "0")).toBe(false);
  });

  it("refuse un jeton falsifié", () => {
    const { token } = createMathCaptcha();
    const [body] = token.split(".");
    expect(verifyMathCaptcha(`${body}.fakesig`, "5")).toBe(false);
  });
});
