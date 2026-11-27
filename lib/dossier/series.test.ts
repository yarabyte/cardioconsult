import { describe, expect, it } from "vitest";
import {
  buildComparisonTable,
  filterDatedByPeriod,
  filterSeriesByPeriod,
  withSource,
} from "./series";
import { jeanneFevgSeries } from "@/lib/marketing/chart-fixtures";

describe("filterSeriesByPeriod", () => {
  it("filtre réellement 6 mois / 1 an", () => {
    const src = withSource(jeanneFevgSeries, "ETT", "%");
    const six = filterSeriesByPeriod(src, "6m", "2026-11-23");
    const year = filterSeriesByPeriod(src, "1a", "2026-11-23");
    const all = filterSeriesByPeriod(src, "all", "2026-11-23");
    expect(all.length).toBe(src.length);
    expect(six.length).toBeLessThan(year.length);
    expect(year.length).toBeLessThanOrEqual(all.length);
    expect(six.every((p) => p.date >= "2026-05-23")).toBe(true);
  });

  it("conserve les valeurs sources après filtre", () => {
    const src = withSource(jeanneFevgSeries, "ETT", "%");
    const year = filterSeriesByPeriod(src, "1a", "2026-11-23");
    for (const p of year) {
      const orig = src.find((o) => o.date === p.date);
      expect(p.value).toBe(orig?.value);
      expect(p.source).toBe("ETT");
    }
  });
});

describe("filterDatedByPeriod", () => {
  it("filtre les consultations par période", () => {
    const items = [
      { at: "2026-11-23", id: "a" },
      { at: "2026-05-24", id: "b" },
      { at: "2025-01-10", id: "c" },
    ];
    const six = filterDatedByPeriod(items, "6m", "2026-11-24");
    const year = filterDatedByPeriod(items, "1a", "2026-11-24");
    const all = filterDatedByPeriod(items, "all", "2026-11-24");
    expect(six.map((x) => x.id)).toEqual(["a", "b"]);
    expect(year.map((x) => x.id)).toEqual(["a", "b"]);
    expect(all.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("buildComparisonTable", () => {
  it("calcule delta sur 3 dates", () => {
    const rows = buildComparisonTable([
      {
        key: "fevg",
        label: "FEVG",
        unit: "%",
        series: withSource(jeanneFevgSeries, "ETT", "%"),
      },
    ]);
    expect(rows[0]?.d3).toBe(47);
    expect(rows[0]?.delta).not.toBeNull();
  });
});
