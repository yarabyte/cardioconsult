import { APP_NAME } from "@/lib/brand";

export type VerifyEmailTemplateInput = {
  firstName: string | null;
  verifyUrl: string;
};

/** E-mail transactionnel — jamais de donnée clinique. */
export function buildVerifyEmailMail(input: VerifyEmailTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const firstName = (input.firstName ?? "utilisateur").replace(/[<>&"]/g, "");
  const safeUrl = input.verifyUrl.replace(/"/g, "%22");
  const subject = `${APP_NAME} — confirmez votre adresse e-mail`;

  const text = [
    `Bonjour ${firstName},`,
    "",
    `Bienvenue sur ${APP_NAME}. Pour activer votre compte, confirmez votre adresse e-mail :`,
    input.verifyUrl,
    "",
    "Ce lien est valable une durée limitée. Si vous n’êtes pas à l’origine de cette inscription, ignorez cet e-mail.",
    "",
    `Cet e-mail ne contient aucune donnée de santé. — ${APP_NAME}`,
  ].join("\n");

  const html = `<p>Bonjour ${firstName},</p>
<p>Bienvenue sur ${APP_NAME}. Pour activer votre compte, confirmez votre adresse e-mail.</p>
<p><a href="${safeUrl}">Confirmer mon adresse e-mail</a></p>
<p style="font-size:12px;color:#52627F">Ce lien est valable une durée limitée. Si vous n’êtes pas à l’origine de cette inscription, ignorez cet e-mail.<br/>
Cet e-mail ne contient aucune donnée de santé. — ${APP_NAME}</p>`;

  return { subject, text, html };
}
