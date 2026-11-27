"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { auth } from "@/server/auth/auth";
import { getControlDb } from "@/server/db/control-db";
import { contractualAcceptances, members, tenants, users } from "@/db/control/schema";
import { inscriptionInputSchema } from "@/lib/validation/inscription";
import { CGU_VERSION, DPA_VERSION } from "@/lib/validation/inscription";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { containsHomoglyphs, sanitizeSlugInput } from "@/lib/slug-homoglyphs";
import { isReservedSlug, isValidTenantSlug } from "@/lib/tenant-host";
import { verifyMathCaptcha } from "@/server/captcha/math-captcha";
import { getRppsVerifier } from "@/server/rpps/manual-review";
import { assertSignupRateLimit } from "@/server/signup/rate-limit";
import { enqueueTenantProvision } from "@/server/jobs/boss";
import { provisionTenant } from "@/server/jobs/tenant-provision";
import { logger } from "@/lib/logging/logger";
import { env } from "@/env";

export type InscriptionResult =
  | { ok: true; tenantId: string; slug: string }
  | { ok: false; error: { code: string; message: string } };

function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "0.0.0.0";
}

function truncateIp(ip: string): string {
  if (ip.includes(".")) {
    const p = ip.split(".");
    return `${p[0]}.${p[1]}.${p[2]}.0`;
  }
  return ip.slice(0, 19);
}

/**
 * Inscription cabinet : aucune donnée de santé.
 * Crée user + tenant(provisioning) + acceptations, enqueue/job provision.
 */
export async function submitInscription(raw: unknown): Promise<InscriptionResult> {
  const parsed = inscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "validation", message: "Formulaire invalide. Vérifiez les champs." },
    };
  }
  const data = parsed.data;
  const h = await headers();
  const ip = clientIp(h);

  try {
    if (!verifyMathCaptcha(data.captchaToken, data.captchaAnswer)) {
      return {
        ok: false,
        error: { code: "captcha", message: "Réponse anti-abus incorrecte ou expirée." },
      };
    }
    if (isDisposableEmail(data.email)) {
      return {
        ok: false,
        error: { code: "email", message: "Utilisez une adresse e-mail professionnelle." },
      };
    }
    if (containsHomoglyphs(data.subdomain)) {
      return {
        ok: false,
        error: { code: "slug", message: "Sous-domaine invalide (caractères non autorisés)." },
      };
    }
    const slug = sanitizeSlugInput(data.subdomain);
    if (!isValidTenantSlug(slug) || isReservedSlug(slug)) {
      return { ok: false, error: { code: "slug", message: "Sous-domaine réservé ou invalide." } };
    }

    const rpps = await getRppsVerifier().verify(data.rpps);
    if (rpps.status === "rejected") {
      return { ok: false, error: { code: "rpps", message: rpps.message } };
    }

    await assertSignupRateLimit(ip, data.email);

    const control = getControlDb();

    // Unicité slug en transaction + contrainte UNIQUE
    const existing = await control.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (existing.length > 0) {
      return {
        ok: false,
        error: { code: "slug_taken", message: "Ce sous-domaine est déjà pris." },
      };
    }

    const tenantId = data.idempotencyKey ?? uuidv7();
    // Idempotence : si même id déjà créé
    const prior = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (prior[0]) {
      return { ok: true, tenantId: prior[0].id, slug: prior[0].slug };
    }

    const displayName = data.displayName;
    const fullName = `${data.prenom} ${data.nom}`.trim();

    let userId: string;
    try {
      const signed = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: fullName,
          callbackURL: `/inscription/email-verifie?slug=${encodeURIComponent(slug)}`,
        },
      });
      userId = signed.user.id;
      // requireEmailVerification : un e-mail déjà pris renvoie un user synthétique (pas d’exception).
      const { user: authUserTable } = await import("@/db/control/auth-schema");
      const [createdAuth] = await control
        .select({ id: authUserTable.id })
        .from(authUserTable)
        .where(eq(authUserTable.email, data.email.toLowerCase()))
        .limit(1);
      if (!createdAuth || createdAuth.id !== userId) {
        return {
          ok: false,
          error: {
            code: "account",
            message: "Impossible de créer le compte. L'e-mail est peut-être déjà utilisé.",
          },
        };
      }
    } catch {
      return {
        ok: false,
        error: {
          code: "account",
          message: "Impossible de créer le compte. L'e-mail est peut-être déjà utilisé.",
        },
      };
    }

    await control
      .insert(users)
      .values({
        id: userId,
        email: data.email.toLowerCase(),
        name: fullName,
        emailVerified: false,
      })
      .onConflictDoNothing();

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      await control.insert(tenants).values({
        id: tenantId,
        slug,
        name: displayName,
        plan: "solo",
        status: "provisioning",
        address: data.adresse,
        rpps: data.rpps,
        rppsStatus: rpps.status,
        demoDataEnabled: data.demoData,
        trialEndsAt,
      });
    } catch {
      return {
        ok: false,
        error: { code: "slug_taken", message: "Ce sous-domaine est déjà pris." },
      };
    }

    await control.insert(members).values({
      id: uuidv7(),
      userId,
      tenantId,
      role: "MEDECIN",
      isTenantAdmin: true,
      status: "active",
    });

    const ipTrunc = truncateIp(ip);
    await control.insert(contractualAcceptances).values([
      {
        id: uuidv7(),
        tenantId,
        userId,
        documentType: "cgu",
        documentVersion: CGU_VERSION,
        ipTruncated: ipTrunc,
      },
      {
        id: uuidv7(),
        tenantId,
        userId,
        documentType: "dpa_art28",
        documentVersion: DPA_VERSION,
        ipTruncated: ipTrunc,
      },
    ]);

    // Provision : synchrone pour ne pas dépendre du worker (file = reprise / retry).
    const provisionPayload = {
      tenantId,
      adminUser: { email: data.email, name: fullName, userId },
    };
    try {
      await enqueueTenantProvision(provisionPayload);
    } catch (err) {
      logger.warn(
        { event: "signup.enqueue_failed", tenantId, err: err instanceof Error ? err.message : "x" },
        "Enqueue échoué — provision synchrone seule",
      );
    }
    try {
      await provisionTenant(provisionPayload);
    } catch (provErr) {
      logger.error(
        {
          event: "signup.provision_failed",
          tenantId,
          err: provErr instanceof Error ? provErr.message : "x",
        },
        "Provisioning échoué",
      );
      // tenant reste provisioning_failed via provisionTenant
    }

    logger.info({ event: "signup.ok", tenantId, slug }, "Inscription cabinet enregistrée");
    return { ok: true, tenantId, slug };
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return {
        ok: false,
        error: { code: "rate_limit", message: "Trop de tentatives. Réessayez dans 15 minutes." },
      };
    }
    logger.error(
      { event: "signup.error", err: err instanceof Error ? err.message : "x" },
      "Échec inscription",
    );
    return {
      ok: false,
      error: { code: "server", message: "Une erreur est survenue. Réessayez plus tard." },
    };
  }
}

export async function getProvisioningStatus(tenantId: string): Promise<{
  status: string;
  step: string | null;
  error: string | null;
  slug: string | null;
}> {
  const control = getControlDb();
  const [t] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) return { status: "unknown", step: null, error: null, slug: null };
  return {
    status: t.status,
    step: t.provisionStep,
    error: t.provisionError,
    slug: t.slug,
  };
}

/**
 * Reprise synchrone du provisioning après échec (démo / sans worker).
 * Réservé aux tenants `provisioning_failed`.
 */
export async function retrySignupProvision(tenantId: string): Promise<{
  ok: boolean;
  status: string;
  step: string | null;
  error: string | null;
  slug: string | null;
}> {
  const control = getControlDb();
  const [t] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) {
    return { ok: false, status: "unknown", step: null, error: "Tenant introuvable", slug: null };
  }
  if (t.status === "active" || t.status === "trial") {
    return {
      ok: true,
      status: t.status,
      step: t.provisionStep,
      error: null,
      slug: t.slug,
    };
  }
  if (t.status !== "provisioning_failed" && t.status !== "provisioning") {
    return {
      ok: false,
      status: t.status,
      step: t.provisionStep,
      error: "Reprise impossible pour ce statut.",
      slug: t.slug,
    };
  }

  const [member] = await control
    .select()
    .from(members)
    .where(eq(members.tenantId, tenantId))
    .limit(1);
  const [user] = member
    ? await control.select().from(users).where(eq(users.id, member.userId)).limit(1)
    : [undefined];

  await control
    .update(tenants)
    .set({
      status: "provisioning",
      provisionStep: "retry",
      provisionError: null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  try {
    await provisionTenant({
      tenantId,
      adminUser: user ? { email: user.email, name: user.name, userId: user.id } : undefined,
    });
  } catch (err) {
    logger.error(
      {
        event: "signup.provision_retry_failed",
        tenantId,
        err: err instanceof Error ? err.message : "x",
      },
      "Reprise provisioning échouée",
    );
  }

  return getProvisioningStatus(tenantId).then((s) => ({
    ok: s.status === "active" || s.status === "trial",
    ...s,
  }));
}
