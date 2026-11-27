import { env } from "@/env";

/**
 * Liste blanche IP console optionnelle.
 * Entrées : IP exactes ou préfixe /24 (ex. `198.51.100.0/24`).
 * Liste vide / absente → toutes les IP acceptées.
 */
export function isConsoleIpAllowed(clientIp: string | null | undefined): boolean {
  const raw = env.CONSOLE_IP_ALLOWLIST?.trim();
  if (!raw) return true;
  if (!clientIp) return false;

  for (const entry of raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (entry.endsWith("/24")) {
      const base = entry.slice(0, -3); // "198.51.100.0"
      const prefix = base.replace(/\.0$/, ".");
      if (clientIp.startsWith(prefix)) return true;
      continue;
    }
    if (clientIp === entry) return true;
  }
  return false;
}
