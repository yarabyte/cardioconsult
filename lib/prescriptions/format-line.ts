/** Champs stockés en JSON dans `prescription_line.duration`. */
export type PrescriptionLineExtras = {
  dosage: string | null;
  form: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  renewals: number | null;
  remarks: string | null;
  ald: boolean;
};

export const emptyLineExtras = (): PrescriptionLineExtras => ({
  dosage: null,
  form: null,
  route: null,
  frequency: null,
  duration: null,
  quantity: null,
  renewals: null,
  remarks: null,
  ald: false,
});

export function parsePrescriptionLineExtras(
  raw: string | null | undefined,
): PrescriptionLineExtras | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as Partial<PrescriptionLineExtras>;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return {
      dosage: typeof v.dosage === "string" ? v.dosage : null,
      form: typeof v.form === "string" ? v.form : null,
      route: typeof v.route === "string" ? v.route : null,
      frequency: typeof v.frequency === "string" ? v.frequency : null,
      duration: typeof v.duration === "string" ? v.duration : null,
      quantity: typeof v.quantity === "string" ? v.quantity : null,
      renewals: typeof v.renewals === "number" ? v.renewals : null,
      remarks: typeof v.remarks === "string" ? v.remarks : null,
      ald: Boolean(v.ald),
    };
  } catch {
    return null;
  }
}

function joinParts(parts: Array<string | null | undefined>, sep = " · "): string | null {
  const cleaned = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  return cleaned.length > 0 ? cleaned.join(sep) : null;
}

/** Dosage + forme, ex. « 2,5 mg · comprimé ». */
export function formatLineDosage(extras: PrescriptionLineExtras | null): string | null {
  if (!extras) return null;
  return joinParts([extras.dosage, extras.form], " · ");
}

/**
 * Posologie affichable : texte libre prioritaire, sinon fréquence / voie / durée.
 * Ex. « 1 comprimé matin et soir · oral · 28 jours ».
 */
export function formatLinePosology(opts: {
  posology?: string | null;
  extras?: PrescriptionLineExtras | null;
}): string | null {
  const fromText = opts.posology?.trim();
  if (fromText) {
    const duration = opts.extras?.duration?.trim();
    return duration && !fromText.toLowerCase().includes(duration.toLowerCase())
      ? `${fromText} · ${duration}`
      : fromText;
  }
  const extras = opts.extras;
  if (!extras) return null;
  return joinParts([extras.frequency, extras.route, extras.duration]);
}

/** Identifiant technique Better Auth / UUID — ne pas afficher tel quel. */
export function isOpaqueActorId(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim();
  if (v === "—") return true;
  if (/^[0-9a-f-]{20,}$/i.test(v)) return true;
  if (/^[A-Za-z0-9_-]{20,}$/.test(v) && !/\s/.test(v)) return true;
  return false;
}
