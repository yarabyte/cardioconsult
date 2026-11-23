export type NurseAgendaRow = {
  id: string;
  time: string;
  patientId: string | null;
  patientLabel: string;
  meta: string;
  motif: string;
  prepStatus: string;
  prepTone: "success" | "warning" | "muted";
  ready: boolean;
};

export const nurseAgendaToday: NurseAgendaRow[] = [
  {
    id: "n1",
    time: "08:30",
    patientId: "CC-000184",
    patientLabel: "J. Dupont",
    meta: "67 ans · F",
    motif: "Suivi IC",
    prepStatus: "Constantes + ECG prêts",
    prepTone: "success",
    ready: true,
  },
  {
    id: "n2",
    time: "09:00",
    patientId: "CC-000231",
    patientLabel: "R. Lefèvre",
    meta: "71 ans · H",
    motif: "ETT",
    prepStatus: "Constantes prêtes",
    prepTone: "success",
    ready: true,
  },
  {
    id: "n3",
    time: "09:30",
    patientId: "CC-000412",
    patientLabel: "M. Benali",
    meta: "58 ans · H",
    motif: "Préop",
    prepStatus: "Arrivé · constantes en cours",
    prepTone: "warning",
    ready: false,
  },
  {
    id: "n4",
    time: "10:00",
    patientId: "CC-000097",
    patientLabel: "A. Girard",
    meta: "74 ans · F",
    motif: "FA",
    prepStatus: "—",
    prepTone: "muted",
    ready: false,
  },
  {
    id: "n5",
    time: "11:30",
    patientId: "hosp-arnaud",
    patientLabel: "M. Arnaud",
    meta: "Hospitalisation · IC",
    motif: "Surveillance",
    prepStatus: "Constantes à saisir",
    prepTone: "warning",
    ready: false,
  },
];

export const STATS_MOCK = {
  fevgDistribution: [
    { label: "< 40 %", value: 9 },
    { label: "40–49 %", value: 18 },
    { label: "≥ 50 %", value: 71 },
  ],
  cha2ds2: [
    { label: "0", value: 12 },
    { label: "1", value: 28 },
    { label: "2", value: 34 },
    { label: "≥ 3", value: 19 },
  ],
  icCohort: [
    { label: "ARNI", pct: 62 },
    { label: "iSGLT2", pct: 48 },
    { label: "BB", pct: 91 },
    { label: "MRA", pct: 36 },
  ],
};