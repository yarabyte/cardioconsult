import { eq } from "drizzle-orm";
import { session, twoFactor, user } from "@/db/control/auth-schema";
import { getControlDb } from "@/server/db/control-db";
import { logger } from "@/lib/logging/logger";

/** Révoque toutes les sessions d'un utilisateur (désactivation / MFA reset). */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  const control = getControlDb();
  await control.delete(session).where(eq(session.userId, userId));
}

/** Force le ré-enrôlement MFA. */
export async function resetMemberMfa(userId: string): Promise<void> {
  const control = getControlDb();
  await control.delete(twoFactor).where(eq(twoFactor.userId, userId));
  await control
    .update(user)
    .set({ twoFactorEnabled: false, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await revokeAllSessionsForUser(userId);
}
