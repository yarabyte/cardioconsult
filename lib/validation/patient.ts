import { z } from "zod";

export const allergySchema = z.object({
  substance: z.string().trim().min(1).max(120),
  reaction: z.string().trim().max(200).optional().nullable(),
  severity: z.enum(["legere", "moderee", "severe", "non_renseignee"]).default("non_renseignee"),
  source: z.string().trim().max(120).optional().nullable(),
});

export const deviceSchema = z.object({
  kind: z.string().trim().min(1).max(80),
  label: z.string().trim().max(120).optional().nullable(),
  implantedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const patientCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    birthName: z.string().trim().max(80).optional().nullable(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sex: z.enum(["F", "H", "Autre", "NonRenseigne"]),
    email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
    phone: z.string().trim().max(40).optional().nullable(),
    addressLine: z.string().trim().max(200).optional().nullable(),
    postalCode: z.string().trim().max(12).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    treatingPhysician: z.string().trim().max(120).optional().nullable(),
    allergies: z.array(allergySchema).default([]),
    devices: z.array(deviceSchema).default([]),
    /** Confirmation explicite après détection de doublon. */
    confirmDuplicate: z.boolean().optional(),
  })
  .strict();

export const patientArchiveSchema = z.object({
  patientId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
