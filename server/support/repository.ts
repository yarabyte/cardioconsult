import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { supportSessions, users } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import type { SupportSessionRecord, SupportSessionStatus } from "./types";

const TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function mapSession(
  row: typeof supportSessions.$inferSelect,
  opts?: { accessToken?: string | null; actorLabel?: string },
): Promise<SupportSessionRecord> {
  const control = getControlDb();
  let label = opts?.actorLabel ?? row.platformActorId;
  const [user] = await control
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, row.platformActorId))
    .limit(1);
  if (user) label = user.name;
  return {
    id: row.id,
    tenantId: row.tenantId,
    platformActorId: row.platformActorId,
    platformActorLabel: label,
    reason: row.reason,
    readOnly: true,
    status: row.status as SupportSessionStatus,
    requestedAt: row.requestedAt.toISOString(),
    consentedAt: row.consentedAt?.toISOString() ?? null,
    consentedByMemberId: row.consentedByMemberId ?? null,
    consentedByLabel: row.consentedByMemberId ? (opts?.actorLabel ?? null) : null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    ephemeralRoRole: row.ephemeralRoRole ?? null,
    accessToken: opts?.accessToken ?? null,
  };
}

async function expireIfNeeded(row: typeof supportSessions.$inferSelect) {
  if (row.status === "active" && row.endsAt && row.endsAt.getTime() <= Date.now()) {
    const control = getControlDb();
    await control
      .update(supportSessions)
      .set({
        status: "expired",
        ephemeralRoRole: null,
        accessTokenHash: null,
      })
      .where(eq(supportSessions.id, row.id));
    row.status = "expired";
    row.ephemeralRoRole = null;
    await writePlatformAudit({
      actorId: row.platformActorId,
      action: "support.session_expired",
      entityType: "support_session",
      entityId: row.id,
      meta: { tenantId: row.tenantId },
    });
  }
  return row;
}

export async function request(input: {
  tenantId: string;
  platformActorId: string;
  platformActorLabel: string;
  reason: string;
}): Promise<SupportSessionRecord | { error: string }> {
  if (input.reason.trim().length < 10) {
    return { error: "Justificatif obligatoire (≥ 10 caractères)" };
  }
  const id = uuidv7();
  const control = getControlDb();
  await control.insert(supportSessions).values({
    id,
    tenantId: input.tenantId,
    platformActorId: input.platformActorId,
    reason: input.reason.trim(),
    status: "requested",
    readOnly: true,
  });
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, id))
    .limit(1);
  await writePlatformAudit({
    actorId: input.platformActorId,
    action: "support.session_requested",
    entityType: "support_session",
    entityId: id,
    meta: { tenantId: input.tenantId, justification: input.reason.trim() },
  });
  return mapSession(row!, { actorLabel: input.platformActorLabel });
}

export async function consent(
  sessionId: string,
  actor: { memberId: string; label: string },
): Promise<SupportSessionRecord | { error: string }> {
  const control = getControlDb();
  const [s] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  if (!s) return { error: "Session introuvable" };
  if (s.status !== "requested") return { error: "Session non en attente de consentement" };
  const starts = new Date();
  const ends = new Date(starts.getTime() + TTL_MS);
  const accessToken = `sup_${uuidv7()}`;
  await control
    .update(supportSessions)
    .set({
      status: "active",
      consentedAt: starts,
      consentedByMemberId: actor.memberId,
      startsAt: starts,
      endsAt: ends,
      ephemeralRoRole: `ro_support_${s.id.slice(0, 8)}`,
      accessTokenHash: hashToken(accessToken),
    })
    .where(eq(supportSessions.id, sessionId));
  await writePlatformAudit({
    actorId: actor.memberId,
    action: "support.session_consented",
    entityType: "support_session",
    entityId: sessionId,
    meta: { tenantId: s.tenantId },
  });
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  return mapSession(row!, { accessToken, actorLabel: actor.label });
}

export async function revoke(
  sessionId: string,
  actorId: string,
): Promise<SupportSessionRecord | { error: string }> {
  const control = getControlDb();
  const [s] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  if (!s) return { error: "Session introuvable" };
  if (s.status !== "active" && s.status !== "requested") {
    return { error: "Session déjà terminée" };
  }
  await control
    .update(supportSessions)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      ephemeralRoRole: null,
      accessTokenHash: null,
    })
    .where(eq(supportSessions.id, sessionId));
  await writePlatformAudit({
    actorId,
    action: "support.session_revoked",
    entityType: "support_session",
    entityId: sessionId,
    meta: { tenantId: s.tenantId },
  });
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  return mapSession(row!);
}

export async function get(sessionId: string): Promise<SupportSessionRecord | null> {
  const control = getControlDb();
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  const next = await expireIfNeeded(row);
  return mapSession(next);
}

export async function listForTenant(tenantId: string): Promise<SupportSessionRecord[]> {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.tenantId, tenantId))
    .orderBy(desc(supportSessions.requestedAt));
  const out: SupportSessionRecord[] = [];
  for (const row of rows) {
    const next = await expireIfNeeded(row);
    out.push(await mapSession(next));
  }
  return out;
}

export async function listActiveBanner(tenantId: string): Promise<SupportSessionRecord | null> {
  const items = await listForTenant(tenantId);
  return items.find((s) => s.status === "active") ?? null;
}

export async function listAll(): Promise<SupportSessionRecord[]> {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(supportSessions)
    .orderBy(desc(supportSessions.requestedAt));
  const out: SupportSessionRecord[] = [];
  for (const row of rows) {
    const next = await expireIfNeeded(row);
    out.push(await mapSession(next));
  }
  return out;
}

export async function tryClinicalRead(input: {
  sessionId: string;
  accessToken: string;
  platformActorId: string;
}): Promise<{ ok: true; note: string; ephemeralRoRole: string } | { ok: false; error: string }> {
  const control = getControlDb();
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, input.sessionId))
    .limit(1);
  if (!row) return { ok: false, error: "Session introuvable" };
  const s = await expireIfNeeded(row);
  if (s.platformActorId !== input.platformActorId) {
    return { ok: false, error: "Acteur non autorisé pour cette session" };
  }
  if (s.status !== "active") {
    return { ok: false, error: `Session ${s.status} — accès clinique refusé` };
  }
  const expected = s.accessTokenHash ?? "";
  const given = hashToken(input.accessToken);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Jeton support invalide" };
  }
  if (!s.ephemeralRoRole) {
    return { ok: false, error: "Rôle lecture seule détruit" };
  }
  return {
    ok: true,
    note: "Accès lecture seule via rôle éphémère (aucune écriture)",
    ephemeralRoRole: s.ephemeralRoRole,
  };
}

export function clinicalReadAsSuperadminWithoutConsent(): { ok: false; error: string } {
  return {
    ok: false,
    error: "Interdit : aucun accès aux données cliniques sans session support consentie",
  };
}

export async function forceExpire(sessionId: string) {
  const control = getControlDb();
  await control
    .update(supportSessions)
    .set({ endsAt: new Date(Date.now() - 1000) })
    .where(eq(supportSessions.id, sessionId));
  const [row] = await control
    .select()
    .from(supportSessions)
    .where(eq(supportSessions.id, sessionId))
    .limit(1);
  if (row) await expireIfNeeded(row);
}

/** Test hook : génère un jeton valide pour une session active en base. */
export async function mintAccessTokenForTest(sessionId: string): Promise<string | null> {
  const token = `sup_test_${randomBytes(8).toString("hex")}`;
  const control = getControlDb();
  await control
    .update(supportSessions)
    .set({ accessTokenHash: hashToken(token) })
    .where(eq(supportSessions.id, sessionId));
  return token;
}
