import { subscribeAgenda } from "@/server/agenda/notify";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE tenant-scoped : uniquement appointmentId + status (pas de contenu clinique).
 */
export async function GET(req: Request) {
  try {
    await requireContext({ permission: "appointment.read", redirectOnFail: false });
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return new Response("Accès refusé", { status: 403 });
    }
    return new Response("Accès refusé", { status: 403 });
  }

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  if (!tenantId) {
    return new Response("tenantId requis", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: "hello", tenantId });
      const unsub = subscribeAgenda(tenantId, (payload) => {
        send({ type: "appointment.status", ...payload });
      });
      const ping = setInterval(() => {
        controller.enqueue(enc.encode(`: ping\n\n`));
      }, 15_000);
      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
