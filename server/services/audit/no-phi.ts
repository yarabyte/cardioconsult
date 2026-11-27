/**
 * Détecte la présence de valeurs d'identité patient dans un payload d'audit.
 * Échoue si une valeur non vide de `identityValues` apparaît dans une colonne audit.
 */
export function auditContainsPhi(
  auditFields: Record<string, unknown>,
  identityValues: Array<string | null | undefined>,
): boolean {
  const haystacks = Object.values(auditFields)
    .filter((v) => v != null)
    .map((v) => String(v).toLowerCase());
  for (const raw of identityValues) {
    if (!raw || raw.trim().length < 2) continue;
    const needle = raw.trim().toLowerCase();
    if (haystacks.some((h) => h.includes(needle))) return true;
  }
  return false;
}
