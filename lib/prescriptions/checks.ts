export type LabValueDated = {
  value: number | string | null;
  datedAt: string | null;
  unit?: string;
};

export type PrescriptionChecksInput = {
  allergies: string[];
  dfg: LabValueDated;
  kaliemie: LabValueDated;
  /** null = non renseigné. */
  pregnancy: boolean | null;
  interactionMessage: string;
};

export type PrescriptionCheckItem = {
  id: string;
  level: "info" | "rappel" | "alerte";
  label: string;
  detail: string;
};

/**
 * Rappels de vérification — jamais un blocage automatique.
 */
export function buildPrescriptionChecks(input: PrescriptionChecksInput): PrescriptionCheckItem[] {
  const items: PrescriptionCheckItem[] = [];

  if (input.allergies.length > 0) {
    items.push({
      id: "allergies",
      level: "alerte",
      label: "Allergies renseignées",
      detail: input.allergies.join(", "),
    });
  } else {
    items.push({
      id: "allergies",
      level: "info",
      label: "Allergies",
      detail: "Aucune allergie renseignée dans le dossier.",
    });
  }

  items.push({
    id: "dfg",
    level: input.dfg.value == null ? "rappel" : "info",
    label: "Dernier DFG",
    detail:
      input.dfg.value == null
        ? "Non renseigné"
        : `${input.dfg.value}${input.dfg.unit ? ` ${input.dfg.unit}` : ""}${
            input.dfg.datedAt ? ` · ${input.dfg.datedAt}` : " · date inconnue"
          }`,
  });

  items.push({
    id: "kaliemie",
    level: input.kaliemie.value == null ? "rappel" : "info",
    label: "Dernière kaliémie",
    detail:
      input.kaliemie.value == null
        ? "Non renseignée"
        : `${input.kaliemie.value}${input.kaliemie.unit ? ` ${input.kaliemie.unit}` : ""}${
            input.kaliemie.datedAt ? ` · ${input.kaliemie.datedAt}` : " · date inconnue"
          }`,
  });

  items.push({
    id: "pregnancy",
    level: input.pregnancy == null ? "rappel" : "info",
    label: "Grossesse",
    detail:
      input.pregnancy == null
        ? "Non renseignée"
        : input.pregnancy
          ? "Oui (rappel — pas de blocage)"
          : "Non",
  });

  items.push({
    id: "interactions",
    level: "rappel",
    label: "Interactions",
    detail: input.interactionMessage,
  });

  return items;
}
