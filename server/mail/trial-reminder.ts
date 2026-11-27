import { APP_NAME } from "@/lib/brand";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

export type TrialReminderKind = "d7" | "d1";

export type TrialReminderTemplateInput = {
  kind: TrialReminderKind;
  cabinetName: string;
  adminPrenom: string | null;
  trialEndsAt: Date;
  /** Lien Paramètres → Abonnement (hôte tenant). */
  billingUrl: string;
};

function formatFrDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function buildTrialReminderMail(input: TrialReminderTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const when = formatFrDate(input.trialEndsAt);
  const greeting = input.adminPrenom ? `Bonjour ${input.adminPrenom},` : "Bonjour,";
  const horizon =
    input.kind === "d7"
      ? `Il reste une semaine avant la fin de votre essai ${APP_NAME}.`
      : `Votre essai ${APP_NAME} se termine demain.`;

  const subject =
    input.kind === "d7"
      ? `${APP_NAME} — fin d’essai dans 7 jours (${input.cabinetName})`
      : `${APP_NAME} — fin d’essai demain (${input.cabinetName})`;

  const text = [
    greeting,
    "",
    horizon,
    `Cabinet : ${input.cabinetName}`,
    `Fin de l’essai : ${when}`,
    "",
    "Après l’essai, l’abonnement par défaut est Solo. Vous pourrez passer à Cabinet ou Clinique depuis Paramètres → Abonnement.",
    "",
    `Gérer l’abonnement : ${input.billingUrl}`,
    "",
    `Cet e-mail ne contient aucune donnée de santé. — ${APP_NAME} · ${ROOT_DOMAIN}`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:system-ui,sans-serif;color:#0A1F44;line-height:1.5">
  <p>${escapeHtml(greeting)}</p>
  <p><strong>${escapeHtml(horizon)}</strong></p>
  <p>Cabinet : ${escapeHtml(input.cabinetName)}<br/>
  Fin de l’essai : ${escapeHtml(when)}</p>
  <p>Après l’essai, l’abonnement par défaut est <strong>Solo</strong>.
  Vous pourrez passer à Cabinet ou Clinique depuis Paramètres → Abonnement.</p>
  <p><a href="${escapeAttr(input.billingUrl)}">Gérer l’abonnement</a></p>
  <p style="font-size:12px;color:#52627F">Cet e-mail ne contient aucune donnée de santé.<br/>
  ${escapeHtml(APP_NAME)} · ${escapeHtml(ROOT_DOMAIN)}</p>
</body>
</html>`.trim();

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

export function billingSettingsUrl(tenantSlug: string): string {
  const root = ROOT_DOMAIN;
  if (root === "localhost" || root.endsWith(".localhost")) {
    return `http://${tenantSlug}.${root}/parametres/abonnement`;
  }
  return `https://${tenantSlug}.${root}/parametres/abonnement`;
}
