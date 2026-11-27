export type RubricState = "fait" | "courant" | "incomplet" | "alerte" | "vide";

export type ConsultationRubric = {
  order: number;
  slug: string;
  label: string;
  group: "Recueil" | "Examens" | "Décision";
  state: RubricState;
  href?: (consultationId: string) => string;
};

/** États initiaux : tout « vide » — jamais « fait » sans données (T-02). */
export const ETT_RUBRICS: ConsultationRubric[] = [
  { order: 1, slug: "identite", label: "Identité patient", group: "Recueil", state: "vide" },
  { order: 2, slug: "motif", label: "Motif / histoire", group: "Recueil", state: "vide" },
  {
    order: 3,
    slug: "antecedents",
    label: "Antécédents structurés",
    group: "Recueil",
    state: "vide",
  },
  { order: 4, slug: "facteurs", label: "Facteurs de risque", group: "Recueil", state: "vide" },
  {
    order: 5,
    slug: "traitements",
    label: "Traitements / allergies",
    group: "Recueil",
    state: "vide",
  },
  { order: 6, slug: "examen", label: "Examen clinique", group: "Recueil", state: "vide" },
  { order: 7, slug: "biologie", label: "Biologie", group: "Examens", state: "vide" },
  { order: 8, slug: "ecg", label: "ECG", group: "Examens", state: "vide" },
  {
    order: 9,
    slug: "echocardiographie",
    label: "Échocardiographie",
    group: "Examens",
    state: "vide",
  },
  {
    order: 10,
    slug: "aorte",
    label: "Aorte / RED FLAG",
    group: "Examens",
    state: "vide",
  },
  {
    order: 11,
    slug: "coronaires",
    label: "Coronaires / imagerie",
    group: "Examens",
    state: "vide",
  },
  { order: 12, slug: "rythmologie", label: "Rythmologie / PM", group: "Examens", state: "vide" },
  { order: 13, slug: "epreuve", label: "Épreuve d'effort", group: "Examens", state: "vide" },
  {
    order: 14,
    slug: "imagerie",
    label: "Imagerie complémentaire",
    group: "Examens",
    state: "vide",
  },
  {
    order: 15,
    slug: "scores",
    label: "Scores",
    group: "Décision",
    state: "vide",
    href: (id) => `/consultations/${id}/scores`,
  },
  { order: 16, slug: "synthese", label: "Synthèse / décisions", group: "Décision", state: "vide" },
  {
    order: 17,
    slug: "ordonnance",
    label: "Ordonnance",
    group: "Décision",
    state: "vide",
    href: (id) => `/consultations/${id}/ordonnance`,
  },
  {
    order: 18,
    slug: "examens-complementaires",
    label: "Examens complémentaires",
    group: "Décision",
    state: "vide",
  },
  { order: 19, slug: "transmissions", label: "Transmissions", group: "Décision", state: "vide" },
  {
    order: 20,
    slug: "compte-rendu",
    label: "Compte rendu",
    group: "Décision",
    state: "vide",
    href: (id) => `/consultations/${id}/compte-rendu`,
  },
  { order: 21, slug: "cloture", label: "Clôture & facturation", group: "Décision", state: "vide" },
];

export function rubricCompleteness(rubrics = ETT_RUBRICS, states?: Record<string, RubricState>) {
  if (!states) {
    const done = rubrics.filter((r) => r.state === "fait" || r.state === "courant").length;
    return { done, total: rubrics.length };
  }
  const done = Object.values(states).filter((s) => s === "fait" || s === "courant").length;
  return { done, total: rubrics.length };
}
