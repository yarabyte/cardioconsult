import type {
  ExternalAgendaSync,
  OnlineBookingProvider,
  SmsReminderProvider,
} from "@/lib/agenda/types";

/** Intégrations futures — jamais simulées comme fonctionnelles. */
export function getExternalAgendaSync(): ExternalAgendaSync {
  return { available: false, message: "Synchronisation agenda externe non disponible." };
}

export function getOnlineBookingProvider(): OnlineBookingProvider {
  return { available: false, message: "Prise de RDV en ligne non disponible." };
}

export function getSmsReminderProvider(): SmsReminderProvider {
  return { available: false, message: "Rappels SMS non disponibles." };
}
