import type { TimeSeriesPoint } from "@/types/domain";

export const jeanneFevgSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 32 },
  { date: "2024-09-01", value: 34 },
  { date: "2025-03-01", value: 38 },
  { date: "2025-09-01", value: 41 },
  { date: "2026-02-01", value: 43 },
  { date: "2026-08-01", value: 45 },
  { date: "2026-11-01", value: 47 },
];

export const jeanneTasSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 162 },
  { date: "2024-09-01", value: 154 },
  { date: "2025-03-01", value: 141 },
  { date: "2025-09-01", value: 136 },
  { date: "2026-02-01", value: 132 },
  { date: "2026-08-01", value: 130 },
  { date: "2026-11-01", value: 128 },
];

export const jeanneTadSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 96 },
  { date: "2024-09-01", value: 90 },
  { date: "2025-03-01", value: 86 },
  { date: "2025-09-01", value: 82 },
  { date: "2026-02-01", value: 80 },
  { date: "2026-08-01", value: 78 },
  { date: "2026-11-01", value: 78 },
];

export const jeanneFcSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 88 },
  { date: "2025-03-01", value: 74 },
  { date: "2026-11-01", value: 66 },
];

export const jeanneWeightSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 88.2 },
  { date: "2025-03-01", value: 84.5 },
  { date: "2026-11-01", value: 82.1 },
];

export const jeanneNtProBnpSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 3850 },
  { date: "2025-03-01", value: 1120 },
  { date: "2026-11-01", value: 590 },
];

export const jeanneDfgSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 58 },
  { date: "2025-03-01", value: 56 },
  { date: "2026-11-01", value: 54 },
];

export const jeanneQtcSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 428 },
  { date: "2025-03-01", value: 436 },
  { date: "2026-11-01", value: 443 },
];

export const jeanneLdlSeries: TimeSeriesPoint[] = [
  { date: "2024-03-01", value: 0.92 },
  { date: "2025-03-01", value: 0.68 },
  { date: "2026-11-01", value: 0.53 },
];

export const aorteAscendanteSeries: TimeSeriesPoint[] = [
  { date: "2019-01-01", value: 46 },
  { date: "2020-01-01", value: 48 },
  { date: "2021-01-01", value: 50 },
  { date: "2022-01-01", value: 52 },
  { date: "2023-01-01", value: 54 },
  { date: "2024-01-01", value: 56 },
  { date: "2025-11-01", value: 57 },
  { date: "2026-11-01", value: 60 },
];

export const aorteSinusSeries: TimeSeriesPoint[] = [
  { date: "2019-01-01", value: 41 },
  { date: "2020-01-01", value: 42 },
  { date: "2021-01-01", value: 42 },
  { date: "2022-01-01", value: 43 },
  { date: "2023-01-01", value: 43 },
  { date: "2024-01-01", value: 44 },
  { date: "2025-01-01", value: 44 },
  { date: "2026-11-01", value: 45 },
];

export const consultationsParSemaine: {
  semaine: string;
  consultations: number;
  current: boolean;
}[] = [
  { semaine: "S36", consultations: 62, current: false },
  { semaine: "S37", consultations: 58, current: false },
  { semaine: "S38", consultations: 71, current: false },
  { semaine: "S39", consultations: 66, current: false },
  { semaine: "S40", consultations: 74, current: false },
  { semaine: "S41", consultations: 69, current: false },
  { semaine: "S42", consultations: 52, current: false },
  { semaine: "S43", consultations: 77, current: false },
  { semaine: "S44", consultations: 81, current: false },
  { semaine: "S45", consultations: 73, current: false },
  { semaine: "S46", consultations: 79, current: false },
  { semaine: "S47", consultations: 84, current: true },
];

export const motifs12Mois = [
  { label: "Suivi IC", pct: 28 },
  { label: "FA / rythmologie", pct: 22 },
  { label: "Coronaire", pct: 18 },
  { label: "HTA", pct: 17 },
  { label: "Valvulopathie", pct: 9 },
  { label: "Autres", pct: 6 },
];

export const mrrSeries = [
  { mois: "Déc", k: 24.2 },
  { mois: "Jan", k: 25.1 },
  { mois: "Fév", k: 26.0 },
  { mois: "Mar", k: 27.4 },
  { mois: "Avr", k: 28.1 },
  { mois: "Mai", k: 29.0 },
  { mois: "Juin", k: 29.8 },
  { mois: "Juil", k: 30.2 },
  { mois: "Août", k: 30.5 },
  { mois: "Sep", k: 31.8 },
  { mois: "Oct", k: 32.9 },
  { mois: "Nov", k: 34.1 },
];

export const nouveauxCabinets = [
  { mois: "Déc", n: 5 },
  { mois: "Jan", n: 8 },
  { mois: "Fév", n: 10 },
  { mois: "Mar", n: 9 },
  { mois: "Avr", n: 13 },
  { mois: "Mai", n: 14 },
  { mois: "Juin", n: 12 },
  { mois: "Juil", n: 7 },
  { mois: "Août", n: 8 },
  { mois: "Sep", n: 17 },
  { mois: "Oct", n: 19 },
  { mois: "Nov", n: 22 },
];
