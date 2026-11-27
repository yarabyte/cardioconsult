"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import {
  cancelAppointment,
  createAppointment,
  listAgenda,
  listAppointmentKinds,
  listWaitlist,
  markReady,
  moveAppointment,
  setTransmission,
  transitionStatus,
  updatePrep,
} from "@/server/agenda/service";
import { APPOINTMENT_STATUSES } from "@/lib/agenda/status";
import {
  getExternalAgendaSync,
  getOnlineBookingProvider,
  getSmsReminderProvider,
} from "@/server/agenda/external";

async function actor(permission: "appointment.read" | "appointment.write") {
  const ctx = await requireContext({ permission, redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return { tenantId: ctx.tenant.id, userId: ctx.user.id, role: ctx.role };
}

export async function fetchAgendaAction(raw: unknown) {
  try {
    const a = await actor("appointment.read");
    const parsed = z
      .object({
        view: z.enum(["day", "week", "month"]).default("day"),
        anchor: z.string().optional(),
        physicianId: z.string().optional(),
      })
      .parse(raw ?? {});
    const physicianId =
      a.role === "INFIRMIERE" ? (parsed.physicianId ?? "demo-medecin") : parsed.physicianId;
    const [items, waitlist, kinds] = await Promise.all([
      listAgenda(a.tenantId, {
        view: parsed.view,
        anchor: parsed.anchor,
        physicianId,
      }),
      listWaitlist(a.tenantId, physicianId),
      listAppointmentKinds(a.tenantId),
    ]);
    return {
      ok: true as const,
      items,
      waitlist,
      kinds,
      integrations: {
        externalSync: getExternalAgendaSync(),
        onlineBooking: getOnlineBookingProvider(),
        sms: getSmsReminderProvider(),
      },
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function createAppointmentAction(raw: unknown) {
  try {
    const a = await actor("appointment.write");
    const parsed = z
      .object({
        physicianId: z.string().min(1),
        patientId: z.string().nullable().optional(),
        patientLabel: z.string().min(1).max(120),
        kindId: z.string().min(1),
        motif: z.string().min(1).max(200),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
        waitlist: z.boolean().optional(),
        adminBlock: z.boolean().optional(),
      })
      .parse(raw);
    const r = await createAppointment(a.tenantId, parsed);
    if (!r.ok) {
      return {
        ok: false as const,
        error: r.code === "overlap" ? "Créneau en chevauchement." : "Données invalides.",
      };
    }
    await recordAuditEvent(a.tenantId, {
      action: "appointment.create",
      entityType: "appointment",
      entityId: r.slot.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Création impossible",
    };
  }
}

export async function moveAppointmentAction(raw: unknown) {
  try {
    const a = await actor("appointment.write");
    const parsed = z
      .object({
        id: z.string().min(1),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
      })
      .parse(raw);
    const r = await moveAppointment(a.tenantId, parsed.id, parsed.startsAt, parsed.endsAt);
    if (!r.ok) {
      return {
        ok: false as const,
        error:
          r.code === "overlap"
            ? "Créneau en chevauchement."
            : r.code === "not_found"
              ? "RDV introuvable."
              : "Déplacement invalide.",
      };
    }
    await recordAuditEvent(a.tenantId, {
      action: "appointment.move",
      entityType: "appointment",
      entityId: parsed.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Déplacement impossible",
    };
  }
}

export async function cancelAppointmentAction(id: string) {
  try {
    const a = await actor("appointment.write");
    const r = await cancelAppointment(a.tenantId, id);
    if (!r.ok) {
      return {
        ok: false as const,
        error:
          r.code === "transition" ? "Annulation impossible dans cet état." : "RDV introuvable.",
      };
    }
    await recordAuditEvent(a.tenantId, {
      action: "appointment.cancel",
      entityType: "appointment",
      entityId: id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Annulation impossible",
    };
  }
}

export async function transitionAppointmentAction(raw: unknown) {
  try {
    const a = await actor("appointment.write");
    const parsed = z
      .object({
        id: z.string().min(1),
        status: z.enum(APPOINTMENT_STATUSES),
      })
      .parse(raw);
    const r = await transitionStatus(a.tenantId, parsed.id, parsed.status);
    if (!r.ok) {
      return {
        ok: false as const,
        error: r.code === "transition" ? "Transition de statut refusée." : "RDV introuvable.",
      };
    }
    await recordAuditEvent(a.tenantId, {
      action: "appointment.status",
      entityType: "appointment",
      entityId: parsed.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Mise à jour impossible",
    };
  }
}

export async function updatePrepAction(raw: unknown) {
  try {
    const a = await actor("appointment.write");
    const parsed = z
      .object({
        id: z.string().min(1),
        vitals: z.boolean().optional(),
        ecg: z.boolean().optional(),
        weight: z.boolean().optional(),
      })
      .parse(raw);
    const r = await updatePrep(a.tenantId, parsed.id, {
      vitals: parsed.vitals,
      ecg: parsed.ecg,
      weight: parsed.weight,
    });
    if (!r.ok) return { ok: false as const, error: "RDV introuvable." };
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Mise à jour impossible",
    };
  }
}

export async function markReadyAction(id: string) {
  try {
    const a = await actor("appointment.write");
    const r = await markReady(a.tenantId, id);
    if (!r.ok) {
      return {
        ok: false as const,
        error:
          r.code === "prep_incomplete"
            ? "Constantes et poids requis avant « prêt »."
            : r.code === "transition"
              ? "Transition refusée."
              : "RDV introuvable.",
      };
    }
    await recordAuditEvent(a.tenantId, {
      action: "appointment.mark_ready",
      entityType: "appointment",
      entityId: id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Action impossible",
    };
  }
}

export async function sendTransmissionAction(raw: unknown) {
  try {
    const a = await actor("appointment.write");
    const parsed = z
      .object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(500),
      })
      .parse(raw);
    const r = await setTransmission(a.tenantId, parsed.id, parsed.text);
    if (!r.ok) return { ok: false as const, error: "RDV introuvable." };
    await recordAuditEvent(a.tenantId, {
      action: "nursing.transmission",
      entityType: "appointment",
      entityId: parsed.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, slot: r.slot };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Transmission impossible",
    };
  }
}
