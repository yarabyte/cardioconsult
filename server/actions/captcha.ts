"use server";

import { createMathCaptcha } from "@/server/captcha/math-captcha";

export async function getSignupCaptcha() {
  return createMathCaptcha();
}
