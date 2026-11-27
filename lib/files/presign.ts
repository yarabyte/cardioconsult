import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 5 * 60 * 1000; // 5 min max

export type PresignPayload = {
  fileId: string;
  userId: string;
  purpose: "upload" | "download";
  exp: number;
};

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function signRaw(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Jeton HMAC lié à l'utilisateur, TTL 5 min. */
export function createPresignedToken(
  secret: string,
  input: Omit<PresignPayload, "exp"> & { exp?: number },
): string {
  const payload: PresignPayload = {
    ...input,
    exp: input.exp ?? Date.now() + TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = signRaw(secret, body);
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: PresignPayload }
  | { ok: false; reason: "invalid" | "expired" | "user_mismatch" };

export function verifyPresignedToken(
  secret: string,
  token: string,
  opts?: { userId?: string; now?: number },
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };
  const [body, sig] = parts;
  if (!body || !sig) return { ok: false, reason: "invalid" };
  const expected = signRaw(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "invalid" };
  }
  let payload: PresignPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PresignPayload;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const now = opts?.now ?? Date.now();
  if (!payload.exp || payload.exp < now) return { ok: false, reason: "expired" };
  if (opts?.userId && payload.userId !== opts.userId) {
    return { ok: false, reason: "user_mismatch" };
  }
  return { ok: true, payload };
}
