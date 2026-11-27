/** URL workspace consultation (rubrique par défaut : identité). */
export function consultationWorkspaceHref(encounterId: string, rubric?: string | null): string {
  const slug = rubric?.trim() ? rubric.trim() : "identite";
  return `/consultations/${encounterId}/${slug}`;
}

/**
 * Décide reprise vs création.
 * Par défaut : reprendre l’en_cours existant (pas de second brouillon silencieux).
 */
export function decideStartOrResume(input: {
  open: { id: string; rubric: string } | null;
  forceNew?: boolean;
}): { mode: "resume"; encounterId: string; href: string } | { mode: "create" } {
  if (input.open && !input.forceNew) {
    return {
      mode: "resume",
      encounterId: input.open.id,
      href: consultationWorkspaceHref(input.open.id, input.open.rubric),
    };
  }
  return { mode: "create" };
}
