import { NextResponse } from "next/server";
import { download } from "@/server/rgpd/repository";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Téléchargement d'export — jeton opaque, TTL 24 h, pas de PII dans les logs.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await download(token);
  if (!result.ok) {
    logger.info({ event: "rgpd.export_download_denied", reason: result.error }, "Export refusé");
    return NextResponse.json({ error: result.error }, { status: 410 });
  }

  logger.info(
    {
      event: "rgpd.export_download",
      exportId: result.job.id,
      scope: result.job.scope,
      // Pas de patientId / nom dans les logs
    },
    "Export téléchargé",
  );

  return new NextResponse(JSON.stringify(result.payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cardioconsult-export-${result.job.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
