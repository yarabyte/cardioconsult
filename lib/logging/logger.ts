import pino from "pino";
import { getRequestId } from "./request-context";

/** Champs jamais journalisés (identité, clinique, secrets). */
export const PII_REDACT_PATHS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "APP_SECRET",
  "S3_SECRET_KEY",
  "email",
  "firstName",
  "lastName",
  "birthName",
  "birthDate",
  "dateNaissance",
  "ins",
  "phone",
  "addressLine",
  "nom",
  "prenom",
  "patientName",
  "contentHtml",
  "contentJson",
  "bodyText",
  "interpretationText",
  "conclusionText",
  "historySummary",
  "antecedentsText",
  "treatmentsText",
] as const;

function resolveLevel(): pino.LevelWithSilent {
  const raw = process.env.LOG_LEVEL;
  if (
    raw === "fatal" ||
    raw === "error" ||
    raw === "warn" ||
    raw === "info" ||
    raw === "debug" ||
    raw === "trace" ||
    raw === "silent"
  ) {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export const logger = pino({
  level: resolveLevel(),
  redact: {
    paths: [...PII_REDACT_PATHS],
    censor: "[redacted]",
  },
  base: { service: "cardioconsult" },
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
});

export type Logger = typeof logger;
