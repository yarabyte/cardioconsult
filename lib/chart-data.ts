import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TimeSeriesPoint } from "@/types/domain";

export function chartLabel(date: string): string {
  return format(new Date(date), "MM/yy", { locale: fr });
}

export function toSingleSeries(points: TimeSeriesPoint[], valueKey = "value") {
  return points.map((p) => ({
    date: chartLabel(p.date),
    [valueKey]: p.value,
  }));
}

export function mergeTaSeries(tas: TimeSeriesPoint[], tad: TimeSeriesPoint[]) {
  return tas.map((p, i) => ({
    date: chartLabel(p.date),
    tas: p.value,
    tad: tad[i]?.value ?? null,
  }));
}
