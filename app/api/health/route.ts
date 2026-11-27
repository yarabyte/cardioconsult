import { NextResponse } from "next/server";

/**
 * Readiness HTTP pour Coolify / Docker HEALTHCHECK.
 * Pas d’accès DB ni de données de santé — process up uniquement.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, service: "cardioconsult" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
