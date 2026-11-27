import { z } from "zod";

export const LAB_CODES = [
  { code: "hb_g_dl", label: "Hb", unit: "g/dL", min: 3, max: 25 },
  { code: "plaquettes_g_l", label: "Plaquettes", unit: "G/L", min: 10, max: 1500 },
  { code: "creatinine_umol_l", label: "Créatinine", unit: "µmol/L", min: 10, max: 2000 },
  { code: "dfg_ml_min", label: "DFG", unit: "ml/min", min: 1, max: 200 },
  { code: "kaliemie_mmol_l", label: "K+", unit: "mmol/L", min: 1, max: 10 },
  { code: "natremie_mmol_l", label: "Na+", unit: "mmol/L", min: 100, max: 180 },
  { code: "ntprobnp_pg_ml", label: "NT-proBNP", unit: "pg/mL", min: 0, max: 100_000 },
  { code: "crp_mg_l", label: "CRP", unit: "mg/L", min: 0, max: 500 },
  { code: "tsh_mui_l", label: "TSH", unit: "mUI/L", min: 0, max: 100 },
  { code: "ldl_g_l", label: "LDL-c", unit: "g/L", min: 0, max: 5 },
  { code: "hba1c_pct", label: "HbA1c", unit: "%", min: 3, max: 20 },
] as const;

export type LabValueKind = "mesure" | "interprete";

export type LabRow = {
  code: string;
  value: number | string | null;
  unit: string;
  kind: LabValueKind;
};

export type LabPanel = {
  id: string;
  /** Date de prélèvement (pas d'interprétation seule). */
  sampledAt: string;
  source: string | null;
  rows: LabRow[];
  comment: string | null;
};

export function emptyLabPanel(id: string, sampledAt: string): LabPanel {
  return {
    id,
    sampledAt,
    source: null,
    rows: LAB_CODES.map((c) => ({
      code: c.code,
      value: null,
      unit: c.unit,
      kind: "mesure" as const,
    })),
    comment: null,
  };
}

const labRowSchema = z.object({
  code: z.string().min(1).max(64),
  value: z.union([z.number().finite(), z.string().max(64), z.null()]),
  unit: z.string().max(32),
  kind: z.enum(["mesure", "interprete"]),
});

export const labPanelSchema = z.object({
  id: z.string().min(1),
  sampledAt: z.string().min(4),
  source: z.string().max(200).nullable(),
  rows: z.array(labRowSchema).max(40),
  comment: z.string().max(4000).nullable(),
});

/** Plages larges — refuse les valeurs absurdes, pas un diagnostic. */
export function checkLabRange(
  code: string,
  value: number | null,
): { ok: true } | { ok: false; message: string } {
  if (value == null) return { ok: true };
  const meta = LAB_CODES.find((c) => c.code === code);
  if (!meta) return { ok: true };
  if (value < meta.min || value > meta.max) {
    return {
      ok: false,
      message: `${meta.label} hors plage large (${meta.min}–${meta.max} ${meta.unit}).`,
    };
  }
  return { ok: true };
}
