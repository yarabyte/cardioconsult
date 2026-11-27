import type { TimeSeriesPoint } from "@/types/domain";

export type SeriesPeriod = "6m" | "1a" | "all";

export type SeriesPointWithSource = TimeSeriesPoint & {
  source?: string;
  unit?: string;
};

/** Référence « aujourd'hui » injectable pour les tests / démo locale. */
export const SERIES_TODAY_DEFAULT = "2026-11-24";

/** Bornes inclusives de la période (null si `all`). */
export function periodBounds(
  period: SeriesPeriod,
  today: string = SERIES_TODAY_DEFAULT,
): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const end = new Date(today);
  const start = new Date(today);
  if (period === "6m") start.setMonth(start.getMonth() - 6);
  else start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

export function isDateInPeriod(
  date: string,
  period: SeriesPeriod,
  today: string = SERIES_TODAY_DEFAULT,
): boolean {
  const bounds = periodBounds(period, today);
  if (!bounds) return true;
  const d = new Date(date);
  return d >= bounds.start && d <= bounds.end;
}

/** Filtre réel par période (référence « aujourd'hui » injectable pour les tests). */
export function filterSeriesByPeriod(
  series: SeriesPointWithSource[],
  period: SeriesPeriod,
  today: string = SERIES_TODAY_DEFAULT,
): SeriesPointWithSource[] {
  if (period === "all") return [...series];
  return series.filter((p) => isDateInPeriod(p.date, period, today));
}

/** Filtre une liste d’événements datés (`at` = YYYY-MM-DD). */
export function filterDatedByPeriod<T extends { at: string }>(
  items: T[],
  period: SeriesPeriod,
  today: string = SERIES_TODAY_DEFAULT,
): T[] {
  if (period === "all") return [...items];
  return items.filter((e) => isDateInPeriod(e.at, period, today));
}

export type ComparisonRow = {
  metric: string;
  unit: string;
  d1: number | null;
  d2: number | null;
  d3: number | null;
  dates: [string | null, string | null, string | null];
  delta: number | null;
};

/** Tableau de comparaison : 3 dernières dates non nulles + évolution d3−d1. */
export function buildComparisonTable(
  metrics: { key: string; label: string; unit: string; series: SeriesPointWithSource[] }[],
): ComparisonRow[] {
  return metrics.map((m) => {
    const filled = m.series
      .filter((p) => p.value != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    const last3 = filled.slice(-3);
    const d1 = last3[0]?.value ?? null;
    const d2 = last3[1]?.value ?? null;
    const d3 = last3[2]?.value ?? null;
    const delta = d1 != null && d3 != null ? Math.round((d3 - d1) * 100) / 100 : null;
    return {
      metric: m.label,
      unit: m.unit,
      d1,
      d2,
      d3,
      dates: [last3[0]?.date ?? null, last3[1]?.date ?? null, last3[2]?.date ?? null],
      delta,
    };
  });
}

export function withSource(
  series: TimeSeriesPoint[],
  source: string,
  unit: string,
): SeriesPointWithSource[] {
  return series.map((p) => ({ ...p, source, unit }));
}
