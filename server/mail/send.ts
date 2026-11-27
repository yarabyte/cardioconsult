import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";
import { logger } from "@/lib/logging/logger";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

let transporter: Transporter | null = null;

function isSecure(): boolean {
  if (env.SMTP_SECURE != null) return env.SMTP_SECURE;
  return env.SMTP_PORT === 465;
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const secure = isSecure();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    // Port 587 STARTTLS ; 465 = TLS dès la connexion
    requireTLS: !secure && env.SMTP_PORT === 587,
    // Évite de bloquer l’inscription plusieurs minutes si SMTP injoignable (Lightsail / firewall).
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

/** Vérifie la connexion SMTP (auth + TLS). */
export async function verifySmtp(): Promise<void> {
  await getTransporter().verify();
  logger.info(
    {
      event: "mail.smtp_ok",
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: isSecure(),
      auth: Boolean(env.SMTP_USER),
    },
    "SMTP joignable",
  );
}

/**
 * Envoi transactionnel SMTP. Jamais de contenu clinique / identité patient.
 * Journalise uniquement compteurs + sujet (pas d’adresses en clair en prod logs si besoin).
 */
export async function sendMail(input: SendMailInput): Promise<{ messageId: string }> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const info = await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  logger.info(
    {
      event: "mail.sent",
      messageId: info.messageId,
      toCount: to.length,
      subject: input.subject.slice(0, 80),
    },
    "E-mail transactionnel envoyé",
  );
  return { messageId: info.messageId ?? "unknown" };
}
