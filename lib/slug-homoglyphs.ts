/**
 * Anti-homoglyphes : après normalisation, seuls a-z 0-9 et tirets.
 * Rejette caractères confusables (cyrillique, fullwidth, etc.).
 */
export function containsHomoglyphs(raw: string): boolean {
  // Si la chaîne contient autre chose que ASCII basique avant/après NFD strip.
  if (/[^\u0000-\u007f]/.test(raw)) return true;
  const normalized = raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalized !== raw.toLowerCase().replace(/[\u0300-\u036f]/g, "") ||
    /[^a-z0-9-]/.test(normalized)
  );
}

export function sanitizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
