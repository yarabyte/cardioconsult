import { EventEmitter } from "node:events";
import type { AppointmentStatus } from "@/lib/agenda/status";

export type AgendaNotifyPayload = {
  appointmentId: string;
  status: AppointmentStatus;
};

const bus = new EventEmitter();
bus.setMaxListeners(50);

export function emitAgendaUpdate(tenantId: string, payload: AgendaNotifyPayload): void {
  bus.emit("agenda", tenantId, payload);
}

export function subscribeAgenda(
  tenantId: string,
  fn: (payload: AgendaNotifyPayload) => void,
): () => void {
  const handler = (tid: string, payload: AgendaNotifyPayload) => {
    if (tid === tenantId) fn(payload);
  };
  bus.on("agenda", handler);
  return () => bus.off("agenda", handler);
}
