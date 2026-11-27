import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  breachIncidents,
  dataExports,
  identityAddenda,
  tenantDeks,
  tenantWipeRequests,
  tenants,
} from "@/db/control/schema";
import type { Patient } from "@/types/domain";
import { getControlDb } from "@/server/db/control-db";
import { getKeyManager } from "@/server/crypto";
import {
  buildTenantExport,
  openExportArchive,
  reimportTenantExport,
  sealExportArchive,
  EXPORT_LINK_TTL_MS,
  type TenantExportPayload,
} from "./export-format";
import { cryptoEraseTenant, type ErasureCertificate } from "./crypto-erasure";
import type {
  BreachIncident,
  DataExportJob,
  DueDossier,
  IdentityAddendum,
  PatientNotice,
  RetentionPolicy,
  TenantWipeRequest,
} from "./types";
import { CNIL_PROCEDURE } from "./types";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function defaultNotice(tenantId: string): PatientNotice {
  return {
    tenantId,
    body: [
      "Notice d'information patient — Cardio Soin",
      "",
      "[À COMPLÉTER PAR LE JURISTE] Identité du responsable du traitement (cabinet / établissement).",
      "[À COMPLÉTER PAR LE JURISTE] Finalités du traitement (prise en charge cardiologique).",
      "[À COMPLÉTER PAR LE JURISTE] Base légale, destinataires, durées de conservation.",
      "[À COMPLÉTER PAR LE JURISTE] Droits d'accès, rectification, limitation, opposition, portabilité.",
      "[À COMPLÉTER PAR LE JURISTE] Contact DPO et droit d'introduire une réclamation auprès de la CNIL.",
      "",
      `Cabinet technique (tenant) : ${tenantId}`,
    ].join("\n"),
    updatedAt: new Date().toISOString(),
  };
}

async function tenantDek(tenantId: string): Promise<Buffer> {
  const control = getControlDb();
  const [row] = await control
    .select()
    .from(tenantDeks)
    .where(eq(tenantDeks.tenantId, tenantId))
    .limit(1);
  if (!row) throw new Error("DEK tenant introuvable");
  return getKeyManager().unwrapDek({
    ciphertext: row.wrappedDek,
    kekVersion: row.kekVersion,
    algorithm: "aes-256-gcm",
  });
}

function mapExport(row: typeof dataExports.$inferSelect, downloadToken?: string): DataExportJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    scope: row.scope as "tenant" | "patient",
    patientId: row.patientId ?? null,
    status: row.status as DataExportJob["status"],
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    downloadToken: downloadToken ?? "",
    contentSha256: row.contentSha256,
    audited: true,
  };
}

export async function getRetention(tenantId: string): Promise<RetentionPolicy> {
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const years = tenant?.retentionYears ?? 20;
  return {
    tenantId,
    retentionYears: years,
    updatedAt: (tenant?.updatedAt ?? new Date()).toISOString(),
    updatedBy: "system",
  };
}

export async function setRetention(tenantId: string, years: number, actorId: string) {
  if (!Number.isInteger(years) || years < 1 || years > 100) {
    return { ok: false as const, error: "Durée de conservation invalide (1–100 ans)" };
  }
  const control = getControlDb();
  await control
    .update(tenants)
    .set({ retentionYears: years, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  const policy: RetentionPolicy = {
    tenantId,
    retentionYears: years,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };
  return { ok: true as const, policy };
}

export function listDueDossiers(
  tenantId: string,
  patients: Patient[],
  retentionYears = 20,
): DueDossier[] {
  const policyYears = retentionYears;
  const now = Date.now();
  const due: DueDossier[] = [];
  for (const p of patients.filter((x) => x.tenantId === tenantId)) {
    const archivedAt = p.archivedAt ?? null;
    if (!archivedAt) continue;
    const dueDate = new Date(archivedAt);
    dueDate.setFullYear(dueDate.getFullYear() + policyYears);
    if (dueDate.getTime() <= now) {
      due.push({
        patientId: p.id,
        label: `${p.firstName.charAt(0)}. ${p.lastName}`,
        archivedAt,
        dueAt: dueDate.toISOString(),
      });
    }
  }
  return due;
}

export async function createExport(input: {
  tenantId: string;
  scope: "tenant" | "patient";
  patientId?: string | null;
  actorId: string;
  patients: Patient[];
}): Promise<DataExportJob> {
  const patients =
    input.scope === "patient" && input.patientId
      ? input.patients.filter((p) => p.id === input.patientId)
      : input.patients.filter((p) => p.tenantId === input.tenantId);

  const payload = buildTenantExport(
    input.tenantId,
    patients,
    input.scope,
    patients.flatMap((p) => [
      {
        id: `doc-${p.id}`,
        patientId: p.id,
        title: "Compte rendu (synthétique)",
        status: "valide",
      },
    ]),
  );
  const dek = await tenantDek(input.tenantId);
  const sealed = sealExportArchive(dek, payload);
  const id = uuidv7();
  const createdAt = new Date();
  const downloadToken = `dl_${randomBytes(16).toString("hex")}`;
  const control = getControlDb();
  await control.insert(dataExports).values({
    id,
    tenantId: input.tenantId,
    scope: input.scope,
    patientId: input.patientId ?? null,
    status: "ready",
    downloadTokenHash: hashToken(downloadToken),
    contentSha256: sealed.contentSha256,
    ciphertext: sealed.ciphertext,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + EXPORT_LINK_TTL_MS),
    createdBy: input.actorId,
  });
  void input.actorId;
  return mapExport(
    {
      id,
      tenantId: input.tenantId,
      scope: input.scope,
      patientId: input.patientId ?? null,
      status: "ready",
      downloadTokenHash: hashToken(downloadToken),
      contentSha256: sealed.contentSha256,
      storageKey: null,
      ciphertext: sealed.ciphertext,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + EXPORT_LINK_TTL_MS),
      purgedAt: null,
      createdBy: input.actorId,
    },
    downloadToken,
  );
}

async function expireIfNeeded(row: typeof dataExports.$inferSelect) {
  if (row.status === "ready" && row.expiresAt.getTime() <= Date.now()) {
    const control = getControlDb();
    await control
      .update(dataExports)
      .set({ status: "expired", ciphertext: "", purgedAt: new Date() })
      .where(eq(dataExports.id, row.id));
    row.status = "expired";
    row.ciphertext = null;
  }
}

export async function getExport(id: string): Promise<DataExportJob | null> {
  const control = getControlDb();
  const [row] = await control.select().from(dataExports).where(eq(dataExports.id, id)).limit(1);
  if (!row) return null;
  await expireIfNeeded(row);
  return mapExport(row);
}

async function findExportByToken(token: string) {
  const control = getControlDb();
  const [row] = await control
    .select()
    .from(dataExports)
    .where(eq(dataExports.downloadTokenHash, hashToken(token)))
    .limit(1);
  return row ?? null;
}

export async function getExportByToken(token: string): Promise<DataExportJob | null> {
  const row = await findExportByToken(token);
  if (!row) return null;
  await expireIfNeeded(row);
  return mapExport(row, token);
}

export async function download(
  token: string,
): Promise<
  { ok: true; payload: TenantExportPayload; job: DataExportJob } | { ok: false; error: string }
> {
  const row = await findExportByToken(token);
  if (!row) return { ok: false, error: "Lien introuvable" };
  await expireIfNeeded(row);
  if (row.status === "expired" || row.status === "deleted") {
    return { ok: false, error: "Lien expiré ou fichier purgé" };
  }
  if (!row.ciphertext) return { ok: false, error: "Archive indisponible" };
  try {
    const dek = await tenantDek(row.tenantId);
    const payload = openExportArchive(dek, row.ciphertext);
    return { ok: true, payload, job: mapExport(row, token) };
  } catch {
    return { ok: false, error: "Déchiffrement impossible" };
  }
}

export async function purgeExpired(): Promise<number> {
  const control = getControlDb();
  const rows = await control.select().from(dataExports);
  let n = 0;
  for (const row of rows) {
    await expireIfNeeded(row);
    if (row.status === "expired") {
      await control
        .update(dataExports)
        .set({ status: "deleted", ciphertext: "", purgedAt: new Date() })
        .where(eq(dataExports.id, row.id));
      n++;
    }
  }
  return n;
}

export async function forceExpire(id: string) {
  const control = getControlDb();
  await control
    .update(dataExports)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(dataExports.id, id));
}

export async function reimport(token: string) {
  const dl = await download(token);
  if (!dl.ok) return dl;
  return { ok: true as const, result: reimportTenantExport(dl.payload), payload: dl.payload };
}

export async function declareBreach(
  input: Omit<BreachIncident, "id" | "declaredAt" | "cnilProcedureUrl">,
): Promise<BreachIncident> {
  const id = uuidv7();
  const control = getControlDb();
  await control.insert(breachIncidents).values({
    id,
    scope: input.scope,
    tenantId: input.tenantId,
    declaredBy: input.declaredBy,
    description: input.description,
    qualification: input.qualification,
    actions: input.actions,
    notifyCnilIntent: input.notifyCnilIntent,
  });
  return {
    ...input,
    id,
    declaredAt: new Date().toISOString(),
    cnilProcedureUrl: CNIL_PROCEDURE,
  };
}

export async function listBreaches(filter?: {
  scope?: "cabinet" | "plateforme";
  tenantId?: string;
}): Promise<BreachIncident[]> {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(breachIncidents)
    .orderBy(desc(breachIncidents.declaredAt));
  return rows
    .filter((b) => {
      if (filter?.scope && b.scope !== filter.scope) return false;
      if (filter?.tenantId && b.tenantId !== filter.tenantId) return false;
      return true;
    })
    .map((b) => ({
      id: b.id,
      scope: b.scope as BreachIncident["scope"],
      tenantId: b.tenantId,
      declaredAt: b.declaredAt.toISOString(),
      declaredBy: b.declaredBy,
      description: b.description,
      qualification: b.qualification as BreachIncident["qualification"],
      actions: b.actions,
      notifyCnilIntent: b.notifyCnilIntent,
      cnilProcedureUrl: CNIL_PROCEDURE,
    }));
}

export async function getNotice(tenantId: string): Promise<PatientNotice> {
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant?.patientNotice) return defaultNotice(tenantId);
  return {
    tenantId,
    body: tenant.patientNotice,
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

export async function saveNotice(tenantId: string, body: string): Promise<PatientNotice> {
  const control = getControlDb();
  const updatedAt = new Date();
  await control
    .update(tenants)
    .set({ patientNotice: body, updatedAt })
    .where(eq(tenants.id, tenantId));
  return { tenantId, body, updatedAt: updatedAt.toISOString() };
}

function mapWipe(row: typeof tenantWipeRequests.$inferSelect): TenantWipeRequest {
  return {
    id: row.id,
    tenantId: row.tenantId,
    adminApprovedAt: row.adminApprovedAt?.toISOString() ?? null,
    adminActorId: row.adminActorId ?? null,
    platformApprovedAt: row.platformApprovedAt?.toISOString() ?? null,
    platformActorId: row.platformActorId ?? null,
    graceEndsAt: row.graceEndsAt?.toISOString() ?? null,
    status: row.status as TenantWipeRequest["status"],
    certificate: (row.certificateJson as ErasureCertificate | null) ?? null,
  };
}

export async function requestTenantWipe(tenantId: string): Promise<TenantWipeRequest> {
  const id = uuidv7();
  const control = getControlDb();
  await control.insert(tenantWipeRequests).values({ id, tenantId, status: "pending" });
  const [row] = await control
    .select()
    .from(tenantWipeRequests)
    .where(eq(tenantWipeRequests.id, id))
    .limit(1);
  return mapWipe(row!);
}

export async function approveWipe(
  wipeId: string,
  who: "admin" | "platform",
  actorId: string,
): Promise<TenantWipeRequest | { error: string }> {
  const control = getControlDb();
  const [w] = await control
    .select()
    .from(tenantWipeRequests)
    .where(eq(tenantWipeRequests.id, wipeId))
    .limit(1);
  if (!w) return { error: "Demande introuvable" };

  const patch: Partial<typeof tenantWipeRequests.$inferInsert> = {};
  if (who === "admin") {
    patch.adminApprovedAt = new Date();
    patch.adminActorId = actorId;
  } else {
    patch.platformApprovedAt = new Date();
    patch.platformActorId = actorId;
  }
  await control.update(tenantWipeRequests).set(patch).where(eq(tenantWipeRequests.id, wipeId));

  const adminOk = who === "admin" ? true : Boolean(w.adminApprovedAt);
  const platformOk = who === "platform" ? true : Boolean(w.platformApprovedAt);
  if (adminOk && platformOk) {
    const grace = new Date();
    grace.setUTCDate(grace.getUTCDate() + 30);
    await control
      .update(tenantWipeRequests)
      .set({ graceEndsAt: grace, status: "grace" })
      .where(eq(tenantWipeRequests.id, wipeId));
  }

  const [updated] = await control
    .select()
    .from(tenantWipeRequests)
    .where(eq(tenantWipeRequests.id, wipeId))
    .limit(1);
  return mapWipe(updated!);
}

export async function executeWipe(wipeId: string, opts?: { force?: boolean }) {
  const control = getControlDb();
  const [w] = await control
    .select()
    .from(tenantWipeRequests)
    .where(eq(tenantWipeRequests.id, wipeId))
    .limit(1);
  if (!w) return { ok: false as const, error: "Demande introuvable" };
  if (w.status !== "grace" && !opts?.force) {
    return { ok: false as const, error: "Double validation + délai de grâce requis" };
  }
  if (!opts?.force && w.graceEndsAt && w.graceEndsAt.getTime() > Date.now()) {
    return { ok: false as const, error: "Délai de grâce non écoulé" };
  }
  const dek = await tenantDek(w.tenantId);
  const erased = cryptoEraseTenant({ tenantId: w.tenantId, dek });
  await control
    .update(tenantWipeRequests)
    .set({
      status: "erased",
      certificateJson: erased.certificate as unknown as Record<string, unknown>,
    })
    .where(eq(tenantWipeRequests.id, wipeId));
  const wipe = mapWipe({
    ...w,
    status: "erased",
    certificateJson: erased.certificate as unknown as Record<string, unknown>,
  });
  return { ok: true as const, wipe, unreadableCheck: erased };
}

export async function addIdentityAddendum(input: {
  tenantId: string;
  patientId: string;
  authorId: string;
  reason: string;
  snapshot: Partial<Patient>;
}) {
  if (input.reason.trim().length < 3) {
    return { ok: false as const, error: "Motif obligatoire" };
  }
  const control = getControlDb();
  const existing = await control
    .select()
    .from(identityAddenda)
    .where(
      and(
        eq(identityAddenda.tenantId, input.tenantId),
        eq(identityAddenda.patientId, input.patientId),
      ),
    );
  const version = existing.length + 1;
  const id = uuidv7();
  const at = new Date();
  await control.insert(identityAddenda).values({
    id,
    tenantId: input.tenantId,
    patientId: input.patientId,
    version,
    at,
    authorId: input.authorId,
    reason: input.reason.trim(),
    snapshotJson: input.snapshot as Record<string, unknown>,
  });
  const row: IdentityAddendum = {
    id,
    patientId: input.patientId,
    version,
    at: at.toISOString(),
    authorId: input.authorId,
    reason: input.reason.trim(),
    snapshot: input.snapshot,
  };
  const history = [...existing.map(mapAddendumRow), row];
  return { ok: true as const, addendum: row, history };
}

function mapAddendumRow(row: typeof identityAddenda.$inferSelect): IdentityAddendum {
  return {
    id: row.id,
    patientId: row.patientId,
    version: row.version,
    at: row.at.toISOString(),
    authorId: row.authorId,
    reason: row.reason,
    snapshot: row.snapshotJson as Partial<Patient>,
  };
}

export async function listAddenda(tenantId: string, patientId: string) {
  const control = getControlDb();
  const rows = await control
    .select()
    .from(identityAddenda)
    .where(and(eq(identityAddenda.tenantId, tenantId), eq(identityAddenda.patientId, patientId)));
  return rows.map(mapAddendumRow);
}
