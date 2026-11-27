/** Parcours RDV / accueil (P08). */
export const APPOINTMENT_STATUSES = [
  "prevu",
  "arrive",
  "en_preparation",
  "pret",
  "en_consultation",
  "termine",
  "absent",
  "annule",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  prevu: "Prévu",
  arrive: "Arrivé",
  en_preparation: "En préparation",
  pret: "Prêt",
  en_consultation: "En consultation",
  termine: "Terminé",
  absent: "Absent",
  annule: "Annulé",
};

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  prevu: ["arrive", "annule", "absent"],
  arrive: ["en_preparation", "annule", "absent"],
  en_preparation: ["pret", "annule"],
  pret: ["en_consultation", "annule"],
  en_consultation: ["termine"],
  termine: [],
  absent: [],
  annule: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`TRANSITION_INVALID:${from}->${to}`);
  }
}
