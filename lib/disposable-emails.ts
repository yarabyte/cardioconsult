/** Domaines d'e-mail jetables refusés à l'inscription (liste minimale, extensible). */
const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return true;
  return DISPOSABLE.has(domain);
}
