import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export interface MathCaptchaChallenge {
  /** Question accessible (texte, pas image seule). */
  question: string;
  /** Jeton signé à renvoyer avec la réponse. */
  token: string;
}

function sign(payload: string): string {
  return createHmac("sha256", env.APP_SECRET).update(payload).digest("base64url");
}

/** Génère un défi arithmétique simple (WCAG : texte + champ). */
export function createMathCaptcha(): MathCaptchaChallenge {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 9);
  const answer = a + b;
  const exp = Date.now() + 10 * 60 * 1000;
  const body = `${answer}|${exp}`;
  const token = `${body}.${sign(body)}`;
  return {
    question: `Combien font ${a} + ${b} ? (anti-abus)`,
    token,
  };
}

export function verifyMathCaptcha(token: string, answerRaw: string): boolean {
  const answer = Number.parseInt(answerRaw.trim(), 10);
  if (!Number.isFinite(answer)) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expectedSig = sign(body);
  try {
    const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
    if (!ok) return false;
  } catch {
    return false;
  }
  const [ansStr, expStr] = body.split("|");
  if (Number(ansStr) !== answer) return false;
  if (Date.now() > Number(expStr)) return false;
  return true;
}
