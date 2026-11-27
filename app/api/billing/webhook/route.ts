import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { processWebhook } from "@/server/billing/repository";
import { normalizePlanKey } from "@/lib/rbac";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z
      .object({
        metadata: z
          .object({
            tenantId: z.string().optional(),
            planKey: z.string().optional(),
          })
          .optional(),
        client_reference_id: z.string().optional(),
      })
      .passthrough(),
  }),
});

/**
 * Webhooks Stripe — signature obligatoire.
 * En démo : en-tête `x-cc-webhook-signature` = HMAC-SHA256(secret, `${t}.${raw}`),
 * avec `x-cc-webhook-timestamp` et secret = STRIPE_WEBHOOK_SECRET || APP_SECRET.
 * Aucune donnée patient attendue ni journalisée.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("stripe-signature") ?? req.headers.get("x-cc-webhook-signature") ?? "";
  const timestamp =
    req.headers.get("x-cc-webhook-timestamp") ??
    // Stripe envoie t= dans stripe-signature ; démo utilise un en-tête dédié
    new URL(req.url).searchParams.get("t") ??
    "";

  const secret = env.STRIPE_WEBHOOK_SECRET || env.APP_SECRET;
  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const tenantId =
    parsed.data.object.metadata?.tenantId ?? parsed.data.object.client_reference_id ?? null;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId manquant" }, { status: 400 });
  }

  const planRaw = parsed.data.object.metadata?.planKey;
  const result = await processWebhook({
    eventId: parsed.id,
    type: parsed.type,
    tenantId,
    planKey: planRaw ? normalizePlanKey(planRaw) : undefined,
    signature,
    timestamp,
    rawBody,
    secret,
  });

  if (!result.ok) {
    logger.warn(
      { event: "billing.webhook_rejected", reason: result.error },
      "Webhook billing rejeté",
    );
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  logger.info(
    {
      event: "billing.webhook_processed",
      eventId: parsed.id,
      type: parsed.type,
      duplicate: result.duplicate,
      // Pas de PII / pas de nom patient
    },
    "Webhook billing traité",
  );

  return NextResponse.json({
    received: true,
    duplicate: result.duplicate,
    status: result.status ?? null,
  });
}
