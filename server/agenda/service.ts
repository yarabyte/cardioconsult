import { and, eq, gte, lte, ne, notInArray, or, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { assertTransition, type AppointmentStatus } from "@/lib/agenda/status";
import type { AgendaSlot, AppointmentKind } from "@/lib/agenda/types";
import { appointmentKinds, appointments, patientIdentityEnc, patients } from "@/db/tenant/schema";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";
import { mapAppointmentToSlot, mapKindRow } from "./mappers";
import { emitAgendaUpdate } from "./notify";

export type CreateAppointmentInput = {
  physicianId: string;
  patientId?: string | null;
  patientLabel: string;
  kindId: string;
  motif: string;
  startsAt: string;
  endsAt: string;
  waitlist?: boolean;
  adminBlock?: boolean;
};

const INACTIVE_STATUSES = ["annule", "absent"] as const;

async function loadIdentityMap(
  db: TenantDb,
  patientIds: (string | null)[],
): Promise<Map<string, typeof patientIdentityEnc.$inferSelect>> {
  const ids = [...new Set(patientIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(patientIdentityEnc)
    .where(or(...ids.map((id) => eq(patientIdentityEnc.patientId, id))));
  return new Map(rows.map((r) => [r.patientId, r]));
}

async function slotById(db: TenantDb, tenantId: string, id: string): Promise<AgendaSlot | null> {
  const [row] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!row) return null;
  const identity = row.patientId
    ? ((
        await db
          .select()
          .from(patientIdentityEnc)
          .where(eq(patientIdentityEnc.patientId, row.patientId))
          .limit(1)
      )[0] ?? null)
    : null;
  return mapAppointmentToSlot(tenantId, row, identity);
}

async function listSlots(
  db: TenantDb,
  tenantId: string,
  opts?: { physicianId?: string; from?: Date; to?: Date; waitlist?: boolean },
): Promise<AgendaSlot[]> {
  const conditions = [];
  if (opts?.physicianId) {
    conditions.push(eq(appointments.physicianId, opts.physicianId));
  }
  if (opts?.waitlist != null) {
    conditions.push(eq(appointments.waitlist, opts.waitlist));
  }
  if (opts?.from) {
    conditions.push(gte(appointments.endsAt, opts.from));
  }
  if (opts?.to) {
    conditions.push(lte(appointments.startsAt, opts.to));
  }

  const rows = await db
    .select()
    .from(appointments)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const identityMap = await loadIdentityMap(
    db,
    rows.map((r) => r.patientId),
  );
  return rows.map((row) =>
    mapAppointmentToSlot(
      tenantId,
      row,
      row.patientId ? (identityMap.get(row.patientId) ?? null) : null,
    ),
  );
}

export function hasTimeOverlap(
  existing: {
    id: string;
    physicianId: string | null;
    startsAt: Date;
    endsAt: Date | null;
    status: string | null;
    waitlist: boolean;
  }[],
  tenantPhysicianId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): boolean {
  return existing.some((s) => {
    if (s.physicianId !== tenantPhysicianId) return false;
    if (s.id === excludeId) return false;
    if (s.status && (INACTIVE_STATUSES as readonly string[]).includes(s.status)) return false;
    if (s.waitlist) return false;
    const a = s.startsAt.getTime();
    const b = (s.endsAt ?? s.startsAt).getTime();
    return startsAt.getTime() < b && endsAt.getTime() > a;
  });
}

async function overlaps(
  db: TenantDb,
  physicianId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({
      id: appointments.id,
      physicianId: appointments.physicianId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      waitlist: appointments.waitlist,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.physicianId, physicianId),
        or(isNull(appointments.status), notInArray(appointments.status, [...INACTIVE_STATUSES])),
        eq(appointments.waitlist, false),
        isNull(appointments.archivedAt),
        excludeId ? ne(appointments.id, excludeId) : undefined,
        lte(appointments.startsAt, endsAt),
        or(gte(appointments.endsAt, startsAt), isNull(appointments.endsAt)),
      ),
    );
  return hasTimeOverlap(rows, physicianId, startsAt, endsAt, excludeId);
}

export async function listAppointmentKinds(tenantId: string): Promise<AppointmentKind[]> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db.select().from(appointmentKinds);
    return rows.map(mapKindRow);
  });
}

export async function listAgenda(
  tenantId: string,
  opts?: { physicianId?: string; view?: "day" | "week" | "month"; anchor?: string },
): Promise<AgendaSlot[]> {
  return withTenantDb(tenantId, async (db) => {
    const anchor = opts?.anchor ? new Date(opts.anchor) : new Date("2026-11-23T00:00:00+01:00");
    let from: Date;
    let to: Date;
    if (opts?.view === "month") {
      from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);
    } else if (opts?.view === "week") {
      const day = anchor.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      from = new Date(anchor);
      from.setDate(anchor.getDate() + mondayOffset);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else {
      from = new Date(anchor);
      from.setHours(0, 0, 0, 0);
      to = new Date(anchor);
      to.setHours(23, 59, 59, 999);
    }
    const items = await listSlots(db, tenantId, {
      physicianId: opts?.physicianId,
      from,
      to,
      waitlist: false,
    });
    return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });
}

export async function listWaitlist(tenantId: string, physicianId?: string): Promise<AgendaSlot[]> {
  return withTenantDb(tenantId, async (db) =>
    listSlots(db, tenantId, { physicianId, waitlist: true }),
  );
}

export async function createAppointment(
  tenantId: string,
  input: CreateAppointmentInput,
): Promise<{ ok: true; slot: AgendaSlot } | { ok: false; code: "overlap" | "validation" }> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt < endsAt)) return { ok: false, code: "validation" };

  return withTenantDb(tenantId, async (db) => {
    if (!input.waitlist && (await overlaps(db, input.physicianId, startsAt, endsAt))) {
      return { ok: false, code: "overlap" as const };
    }
    const id = uuidv7();
    if (input.patientId) {
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1);
      if (!patient) return { ok: false, code: "validation" as const };
    }
    await db.insert(appointments).values({
      id,
      patientId: input.patientId ?? null,
      physicianId: input.physicianId,
      kindId: input.kindId,
      startsAt,
      endsAt,
      motifEnc: input.motif,
      status: "prevu",
      waitlist: Boolean(input.waitlist),
      adminBlock: Boolean(input.adminBlock),
      prepVitals: false,
      prepEcg: false,
      prepWeight: false,
      version: 1,
    });
    const slot = (await slotById(db, tenantId, id))!;
    emitAgendaUpdate(tenantId, { appointmentId: id, status: slot.status });
    return { ok: true, slot };
  });
}

export async function moveAppointment(
  tenantId: string,
  id: string,
  startsAtIso: string,
  endsAtIso: string,
): Promise<
  { ok: true; slot: AgendaSlot } | { ok: false; code: "not_found" | "overlap" | "validation" }
> {
  return withTenantDb(tenantId, async (db) => {
    const current = await slotById(db, tenantId, id);
    if (!current) return { ok: false, code: "not_found" };
    const startsAt = new Date(startsAtIso);
    const endsAt = new Date(endsAtIso);
    if (!(startsAt < endsAt)) return { ok: false, code: "validation" };
    if (!current.waitlist && (await overlaps(db, current.physicianId, startsAt, endsAt, id))) {
      return { ok: false, code: "overlap" };
    }
    const [updated] = await db
      .update(appointments)
      .set({
        startsAt,
        endsAt,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    if (!updated) return { ok: false, code: "not_found" };
    const slot = (await slotById(db, tenantId, id))!;
    emitAgendaUpdate(tenantId, { appointmentId: id, status: slot.status });
    return { ok: true, slot };
  });
}

export async function cancelAppointment(
  tenantId: string,
  id: string,
): Promise<{ ok: true; slot: AgendaSlot } | { ok: false; code: "not_found" | "transition" }> {
  return transitionStatus(tenantId, id, "annule");
}

export async function transitionStatus(
  tenantId: string,
  id: string,
  to: AppointmentStatus,
): Promise<{ ok: true; slot: AgendaSlot } | { ok: false; code: "not_found" | "transition" }> {
  return withTenantDb(tenantId, async (db) => {
    const current = await slotById(db, tenantId, id);
    if (!current) return { ok: false, code: "not_found" };
    try {
      assertTransition(current.status, to);
    } catch {
      return { ok: false, code: "transition" };
    }
    await db
      .update(appointments)
      .set({ status: to, version: current.version + 1, updatedAt: new Date() })
      .where(eq(appointments.id, id));
    const slot = (await slotById(db, tenantId, id))!;
    emitAgendaUpdate(tenantId, { appointmentId: id, status: to });
    return { ok: true, slot };
  });
}

export async function updatePrep(
  tenantId: string,
  id: string,
  prep: Partial<AgendaSlot["prep"]>,
): Promise<{ ok: true; slot: AgendaSlot } | { ok: false; code: "not_found" }> {
  return withTenantDb(tenantId, async (db) => {
    const current = await slotById(db, tenantId, id);
    if (!current) return { ok: false, code: "not_found" };
    const nextPrep = { ...current.prep, ...prep };
    let nextStatus = current.status;
    if (current.status === "arrive" || current.status === "prevu") {
      try {
        assertTransition(current.status, "en_preparation");
        nextStatus = "en_preparation";
      } catch {
        /* déjà au-delà */
      }
    }
    await db
      .update(appointments)
      .set({
        prepVitals: nextPrep.vitals,
        prepEcg: nextPrep.ecg,
        prepWeight: nextPrep.weight,
        status: nextStatus,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id));
    const slot = (await slotById(db, tenantId, id))!;
    emitAgendaUpdate(tenantId, { appointmentId: id, status: slot.status });
    return { ok: true, slot };
  });
}

export async function markReady(
  tenantId: string,
  id: string,
): Promise<
  | { ok: true; slot: AgendaSlot }
  | { ok: false; code: "not_found" | "transition" | "prep_incomplete" }
> {
  const current = await withTenantDb(tenantId, (db) => slotById(db, tenantId, id));
  if (!current) return { ok: false, code: "not_found" };
  if (!(current.prep.vitals && current.prep.weight)) {
    return { ok: false, code: "prep_incomplete" };
  }
  if (current.status === "en_preparation" || current.status === "arrive") {
    if (current.status === "arrive") {
      const mid = await transitionStatus(tenantId, id, "en_preparation");
      if (!mid.ok) return mid;
    }
    return transitionStatus(tenantId, id, "pret");
  }
  if (current.status === "pret") return { ok: true, slot: current };
  return { ok: false, code: "transition" };
}

export async function setTransmission(
  tenantId: string,
  id: string,
  text: string,
): Promise<{ ok: true; slot: AgendaSlot } | { ok: false; code: "not_found" }> {
  return withTenantDb(tenantId, async (db) => {
    const current = await slotById(db, tenantId, id);
    if (!current) return { ok: false, code: "not_found" };
    await db
      .update(appointments)
      .set({
        transmissionEnc: text.slice(0, 500),
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id));
    const slot = (await slotById(db, tenantId, id))!;
    emitAgendaUpdate(tenantId, { appointmentId: id, status: slot.status });
    return { ok: true, slot };
  });
}
