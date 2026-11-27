import { z } from "zod";

/**
 * Validation des variables d'environnement au démarrage (P01).
 * Les valeurs par défaut correspondent à `docker-compose.yml` (données synthétiques uniquement).
 */

const boolish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((v) => v === true || v === "true" || v === "1");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://cardioconsult:cardioconsult@127.0.0.1:5432/cc_control"),
  DATABASE_ADMIN_URL: z
    .string()
    .min(1)
    .default("postgresql://cardioconsult:cardioconsult@127.0.0.1:5432/cc_control"),
  DATABASE_URL_TEST: z
    .string()
    .min(1)
    .default("postgresql://cardioconsult:cardioconsult@127.0.0.1:5432/cc_control_test"),

  S3_ENDPOINT: z.string().url().default("http://127.0.0.1:9000"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1).default("minio"),
  S3_SECRET_KEY: z.string().min(1).default("minio-secret"),
  S3_BUCKET: z.string().min(1).default("cardioconsult-dev"),
  S3_FORCE_PATH_STYLE: boolish.default(true),

  GOTENBERG_URL: z.string().url().default("http://127.0.0.1:3001"),
  CLAMAV_HOST: z.string().min(1).default("127.0.0.1"),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  SMTP_HOST: z.string().min(1).default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().email().default("noreply@cardiosoins.local"),
  /** Auth SMTP (requis hors Mailpit local). Jamais committer le mot de passe. */
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** true = TLS implicite (port 465). Si absent : true quand port === 465. */
  SMTP_SECURE: boolish,

  /** Secret applicatif local — remplacer en production (jamais committer la vraie valeur). */
  APP_SECRET: z.string().min(32).default("dev-only-change-me-32chars-minimum!!"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  PSC_ENABLED: boolish.default(false),

  /** Stripe — absents → BillingProvider démo (aucune donnée santé transmise). */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_SOLO_EUR: z.coerce.number().positive().optional(),
  STRIPE_PRICE_CABINET_EUR: z.coerce.number().positive().optional(),
  STRIPE_PRICE_ID_SOLO: z.string().optional(),
  STRIPE_PRICE_ID_CABINET: z.string().optional(),
  STRIPE_PRICE_ID_CLINIQUE: z.string().optional(),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  /** Console plateforme — liste blanche IP optionnelle (CIDR ou IP, séparés par des virgules). */
  CONSOLE_IP_ALLOWLIST: z.string().optional(),
  /** MFA console : passkey / clé matérielle obligatoire hors démo. */
  CONSOLE_REQUIRE_PASSKEY: boolish.default(true),
});

const clientSchema = z.object({
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default("cardiosoins.com"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

const SERVER_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "DATABASE_ADMIN_URL",
  "DATABASE_URL_TEST",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
  "S3_FORCE_PATH_STYLE",
  "GOTENBERG_URL",
  "CLAMAV_HOST",
  "CLAMAV_PORT",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_SECURE",
  "APP_SECRET",
  "LOG_LEVEL",
  "BETTER_AUTH_URL",
  "PSC_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SOLO_EUR",
  "STRIPE_PRICE_CABINET_EUR",
  "STRIPE_PRICE_ID_SOLO",
  "STRIPE_PRICE_ID_CABINET",
  "STRIPE_PRICE_ID_CLINIQUE",
  "BILLING_GRACE_DAYS",
  "CONSOLE_IP_ALLOWLIST",
  "CONSOLE_REQUIRE_PASSKEY",
] as const;

function pick(keys: readonly string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    const raw = process.env[key];
    // Coolify / docker --env-file : clé présente avec "" → ne pas bloquer les .default() zod
    out[key] = raw === "" ? undefined : raw;
  }
  return out;
}

function parseEnv() {
  const server = serverSchema.safeParse(pick(SERVER_KEYS));
  if (!server.success) {
    console.error(
      "Variables d'environnement serveur invalides",
      server.error.flatten().fieldErrors,
    );
    throw new Error("Configuration environnement invalide (serveur).");
  }

  const client = clientSchema.safeParse({
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN || undefined,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || undefined,
  });
  if (!client.success) {
    console.error(
      "Variables d'environnement publiques invalides",
      client.error.flatten().fieldErrors,
    );
    throw new Error("Configuration environnement invalide (public).");
  }

  const merged = { ...server.data, ...client.data };

  const usingDevSecret = merged.APP_SECRET === "dev-only-change-me-32chars-minimum!!";
  const explicitAppProd = merged.NEXT_PUBLIC_APP_ENV === "production";
  if (usingDevSecret && explicitAppProd) {
    throw new Error(
      "APP_SECRET par défaut interdit en production applicative (définir un secret ≥ 32 caractères).",
    );
  }

  return merged;
}

/** Garde-fou testable (hors import side-effect) pour la CI et les unitaires. */
export function assertProductionGuards(input: { appEnv: string; appSecret: string }): void {
  if (input.appEnv !== "production") return;
  if (input.appSecret === "dev-only-change-me-32chars-minimum!!") {
    throw new Error("APP_SECRET par défaut interdit en production");
  }
}

export const env = parseEnv();
