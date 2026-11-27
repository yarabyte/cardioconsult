/** Seuil de petits effectifs — cellules < N masquées à l'export. */
export const SMALL_CELL_THRESHOLD = 5;

export type DistBucket = { label: string; value: number };

export type MaskedCell = {
  label: string;
  /** null si masqué. */
  value: number | null;
  masked: boolean;
};

export function maskSmallCells(
  buckets: DistBucket[],
  threshold = SMALL_CELL_THRESHOLD,
): MaskedCell[] {
  return buckets.map((b) => {
    if (b.value > 0 && b.value < threshold) {
      return { label: b.label, value: null, masked: true };
    }
    return { label: b.label, value: b.value, masked: false };
  });
}

export function toCsvMasked(rows: MaskedCell[], colName: string): string {
  const header = `${colName};effectif`;
  const lines = rows.map((r) =>
    r.masked
      ? `${csvEscape(r.label)};<${SMALL_CELL_THRESHOLD}`
      : `${csvEscape(r.label)};${r.value}`,
  );
  return [header, ...lines].join("\n");
}

function csvEscape(s: string) {
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type ScoreDistResult = {
  complete: DistBucket[];
  incompleteCount: number;
};

/** Ne compte que les scores complets dans la distribution. */
export function distributeCompleteScores(
  values: (number | null)[],
  bucketFn: (v: number) => string,
  labels: string[],
): ScoreDistResult {
  let incompleteCount = 0;
  const counts = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) {
      incompleteCount += 1;
      continue;
    }
    const label = bucketFn(v);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return {
    complete: labels.map((label) => ({ label, value: counts.get(label) ?? 0 })),
    incompleteCount,
  };
}

export function fevgBucket(v: number): string {
  if (v < 40) return "< 40 %";
  if (v < 50) return "40–49 %";
  return "≥ 50 %";
}

export function cha2Bucket(v: number): string {
  if (v <= 0) return "0";
  if (v === 1) return "1";
  if (v === 2) return "2";
  return "≥ 3";
}
