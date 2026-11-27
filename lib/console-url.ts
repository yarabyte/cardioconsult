import { ROOT_DOMAIN } from "@/lib/tenant-host";

/** Origine absolue de la console plateforme (évite /console sur un hôte tenant → 404). */
export function getConsoleOrigin(): string {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_APP_ENV === "development") {
    return "http://console.localhost:3000";
  }
  return `https://console.${ROOT_DOMAIN}`;
}
