import { z } from "zod";

export const QTC_METHODS = ["Fridericia", "Bazett"] as const;
export type QtcMethod = (typeof QTC_METHODS)[number];

export const CONDUCTION_OPTIONS = [
  "aucun",
  "BAV1",
  "BAV2",
  "BAV3",
  "BBD",
  "BBG",
  "hemibloc_ant",
  "hemibloc_post",
] as const;

export type EcgDraft = {
  rythme: string | null;
  fcBpm: number | null;
  prMs: number | null;
  qrsMs: number | null;
  qtcMs: number | null;
  /** Obligatoire dès qu'un QTc est saisi. */
  qtcMethod: QtcMethod | null;
  axis: string | null;
  conductions: string[];
  stElevation: boolean;
  stDepression: boolean;
  tNegative: boolean;
  pacing: boolean;
  device: string | null;
  interpretation: string | null;
};

export function emptyEcg(): EcgDraft {
  return {
    rythme: null,
    fcBpm: null,
    prMs: null,
    qrsMs: null,
    qtcMs: null,
    qtcMethod: null,
    axis: null,
    conductions: [],
    stElevation: false,
    stDepression: false,
    tNegative: false,
    pacing: false,
    device: null,
    interpretation: null,
  };
}

/** QTc sans méthode → refuse. */
export const ecgDraftSchema = z
  .object({
    rythme: z.string().nullable(),
    fcBpm: z.number().finite().nullable(),
    prMs: z.number().finite().nullable(),
    qrsMs: z.number().finite().nullable(),
    qtcMs: z.number().finite().nullable(),
    qtcMethod: z.enum(QTC_METHODS).nullable(),
    axis: z.string().nullable(),
    conductions: z.array(z.string()).max(8),
    stElevation: z.boolean(),
    stDepression: z.boolean(),
    tNegative: z.boolean(),
    pacing: z.boolean(),
    device: z.string().nullable(),
    interpretation: z.string().max(4000).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.qtcMs != null && v.qtcMethod == null) {
      ctx.addIssue({
        code: "custom",
        path: ["qtcMethod"],
        message: "Méthode QTc obligatoire (Fridericia ou Bazett) lorsque QTc est renseigné.",
      });
    }
  });

export function validateEcg(raw: unknown) {
  return ecgDraftSchema.safeParse(raw);
}
