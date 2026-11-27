/**
 * Vérifie la connexion SMTP (host/port/auth/TLS).
 * Usage : `pnpm mail:verify`
 */
import { verifySmtp } from "@/server/mail/send";

async function main() {
  await verifySmtp();

  console.log("SMTP OK — connexion et authentification réussies.");
}

main().catch((err) => {
  console.error("SMTP KO:", err instanceof Error ? err.message : err);
  process.exit(1);
});
