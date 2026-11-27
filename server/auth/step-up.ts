import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { auth } from "@/server/auth/auth";
import { account, session as sessionTable } from "@/db/control/auth-schema";
import { getControlDb } from "@/server/db/control-db";
import { AccessDeniedError } from "./require-context";

const STEP_UP_MS = 5 * 60 * 1000;

/** Vérifie qu'une ré-authentification récente (< 5 min) a eu lieu. */
export async function requireStepUp(): Promise<void> {
  const h = await headers();
  const sess = await auth.api.getSession({ headers: h });
  if (!sess) throw new AccessDeniedError("Session requise");
  const stepUpAt = (sess.session as { stepUpAt?: Date | string | null }).stepUpAt;
  if (!stepUpAt || Date.now() - new Date(stepUpAt).getTime() >= STEP_UP_MS) {
    throw new AccessDeniedError("Ré-authentification requise");
  }
}

/** Marque le step-up après vérification du mot de passe. */
export async function markStepUp(): Promise<void> {
  const h = await headers();
  const sess = await auth.api.getSession({ headers: h });
  if (!sess) throw new AccessDeniedError("Session requise");
  const control = getControlDb();
  await control
    .update(sessionTable)
    .set({ stepUpAt: new Date(), updatedAt: new Date() })
    .where(eq(sessionTable.id, sess.session.id));
}

/**
 * Ré-authentifie avec le mot de passe du compte courant puis marque le step-up.
 * Messages d'erreur génériques (pas d'indication compte/mot de passe).
 */
export async function confirmStepUpWithPassword(password: string): Promise<void> {
  const trimmed = password.trim();
  if (trimmed.length < 12) {
    throw new AccessDeniedError("Identifiants invalides");
  }
  const h = await headers();
  const sess = await auth.api.getSession({ headers: h });
  if (!sess) throw new AccessDeniedError("Session requise");

  const control = getControlDb();
  const [acc] = await control
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, sess.user.id), eq(account.providerId, "credential")))
    .limit(1);
  if (!acc?.password) {
    throw new AccessDeniedError("Identifiants invalides");
  }
  const ok = await verifyPassword({ hash: acc.password, password: trimmed });
  if (!ok) {
    throw new AccessDeniedError("Identifiants invalides");
  }
  await control
    .update(sessionTable)
    .set({ stepUpAt: new Date(), updatedAt: new Date() })
    .where(eq(sessionTable.id, sess.session.id));
}
