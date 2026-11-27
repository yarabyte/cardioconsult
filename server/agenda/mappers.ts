import type { AgendaSlot } from "@/lib/agenda/types";
import type { AppointmentStatus } from "@/lib/agenda/status";
import { appointmentKinds, appointments, patientIdentityEnc } from "@/db/tenant/schema";

type AppointmentRow = typeof appointments.$inferSelect;
type KindRow = typeof appointmentKinds.$inferSelect;

export function patientLabelFromIdentity(
  firstName: string | null,
  lastName: string | null,
): string {
  const fn = firstName?.trim() ?? "";
  const ln = lastName?.trim() ?? "";
  if (!fn && !ln) return "—";
  const initial = fn ? `${fn.charAt(0).toUpperCase()}.` : "";
  return `${initial} ${ln}`.trim();
}

export function mapAppointmentToSlot(
  tenantId: string,
  row: AppointmentRow,
  identity: typeof patientIdentityEnc.$inferSelect | null,
): AgendaSlot {
  const status = (row.status ?? "prevu") as AppointmentStatus;
  return {
    id: row.id,
    tenantId,
    physicianId: row.physicianId ?? "",
    patientId: row.patientId,
    patientLabel: identity
      ? patientLabelFromIdentity(identity.firstNameEnc, identity.lastNameEnc)
      : row.adminBlock
        ? "—"
        : "—",
    kindId: row.kindId ?? "",
    motif: row.motifEnc ?? "",
    startsAt: row.startsAt.toISOString(),
    endsAt: (row.endsAt ?? row.startsAt).toISOString(),
    status,
    prep: {
      vitals: row.prepVitals,
      ecg: row.prepEcg,
      weight: row.prepWeight,
    },
    waitlist: row.waitlist,
    adminBlock: row.adminBlock,
    transmission: row.transmissionEnc ?? null,
    version: row.version,
  };
}

export function mapKindRow(row: KindRow) {
  return {
    id: row.id,
    label: row.label,
    durationMin: row.durationMin,
    color: row.color,
    executorRole: row.executorRole as "MEDECIN" | "INFIRMIERE" | "BOTH",
  };
}
