import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins";
import { getControlDb } from "@/server/db/control-db";
import { env } from "@/env";
import * as authSchema from "@/db/control/auth-schema";

/**
 * Better Auth — control-plane uniquement.
 * MFA TOTP via plugin ; enforcement applicatif dans requireContext.
 * Cookies : préfixe __Host- uniquement en HTTPS prod (localhost HTTP incompatible).
 */
export const auth = betterAuth({
  appName: "Cardio Soin",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: env.APP_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://*.localhost:3000",
    "http://console.localhost:3000",
    "https://*.cardiosoins.com",
    "https://cardiosoins.com",
  ],
  database: drizzleAdapter(getControlDb(), {
    provider: "pg",
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
      twoFactor: authSchema.twoFactor,
    },
  }),
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 60 * 60 * 24,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const { logger } = await import("@/lib/logging/logger");
      const { sendMail } = await import("@/server/mail/send");
      const { buildVerifyEmailMail } = await import("@/server/mail/verify-email");
      const firstName = user.name.trim().split(/\s+/)[0] ?? null;
      const mail = buildVerifyEmailMail({ firstName, verifyUrl: url });
      try {
        await sendMail({ to: user.email, ...mail });
        logger.info(
          { event: "auth.verify_email_sent", userId: user.id },
          "E-mail de vérification envoyé",
        );
      } catch (err) {
        logger.error(
          {
            event: "auth.verify_email_fail",
            userId: user.id,
            err: err instanceof Error ? err.message : "x",
          },
          "Échec envoi e-mail de vérification",
        );
        throw err;
      }
    },
    afterEmailVerification: async (user) => {
      const { eq } = await import("drizzle-orm");
      const { getControlDb } = await import("@/server/db/control-db");
      const { users } = await import("@/db/control/schema");
      const { logger } = await import("@/lib/logging/logger");
      const control = getControlDb();
      await control
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      logger.info({ event: "auth.email_verified", userId: user.id }, "Adresse e-mail confirmée");
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { logger } = await import("@/lib/logging/logger");
      const { sendMail } = await import("@/server/mail/send");
      const { APP_NAME } = await import("@/lib/brand");
      const firstNameRaw = user.name.trim().split(/\s+/)[0] ?? "utilisateur";
      const firstName = firstNameRaw.replace(/[<>&"]/g, "");
      const safeUrl = url.replace(/"/g, "%22");
      const subject = `${APP_NAME} — réinitialisation du mot de passe`;
      const text = [
        `Bonjour ${firstName},`,
        "",
        "Une demande de réinitialisation de mot de passe a été faite pour votre compte.",
        `Ouvrez ce lien (valide une durée limitée) : ${url}`,
        "",
        "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
        "",
        `Cet e-mail ne contient aucune donnée de santé. — ${APP_NAME}`,
      ].join("\n");
      const html = `<p>Bonjour ${firstName},</p>
<p>Une demande de réinitialisation de mot de passe a été faite pour votre compte.</p>
<p><a href="${safeUrl}">Réinitialiser mon mot de passe</a></p>
<p style="font-size:12px;color:#52627F">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.<br/>
Cet e-mail ne contient aucune donnée de santé. — ${APP_NAME}</p>`;
      try {
        await sendMail({ to: user.email, subject, text, html });
        logger.info({ event: "auth.reset_password_email", userId: user.id }, "E-mail reset envoyé");
      } catch (err) {
        logger.error(
          {
            event: "auth.reset_password_email_fail",
            userId: user.id,
            err: err instanceof Error ? err.message : "x",
          },
          "Échec envoi e-mail reset",
        );
        throw err;
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 5,
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    cookiePrefix: env.NODE_ENV === "production" ? "__Host-" : "cc",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  rateLimit: {
    enabled: true,
    window: 60 * 15,
    max: 20,
  },
  plugins: [
    twoFactor({
      issuer: "Cardio Soin",
      totpOptions: {
        digits: 6,
        period: 30,
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
