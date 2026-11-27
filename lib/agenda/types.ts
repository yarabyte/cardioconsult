import type { AppointmentStatus } from "./status";

export type AppointmentKind = {
  id: string;
  label: string;
  durationMin: number;
  color: string;
  /** Rôle exécutant principal. */
  executorRole: "MEDECIN" | "INFIRMIERE" | "BOTH";
};

export type AgendaSlot = {
  id: string;
  tenantId: string;
  physicianId: string;
  patientId: string | null;
  patientLabel: string;
  kindId: string;
  motif: string;
  startsAt: string; // ISO
  endsAt: string;
  status: AppointmentStatus;
  /** Checklist préparation IDE */
  prep: {
    vitals: boolean;
    ecg: boolean;
    weight: boolean;
  };
  waitlist: boolean;
  adminBlock: boolean;
  transmission?: string | null;
  version: number;
};

export type ExternalAgendaSync = {
  available: false;
  message: string;
};

export type OnlineBookingProvider = {
  available: false;
  message: string;
};

export type SmsReminderProvider = {
  available: false;
  message: string;
};
