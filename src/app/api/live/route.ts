import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { liveBus, type LiveEvent } from "@/lib/live-bus";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function serialize(event: LiveEvent, userName: string) {
  return `data: ${JSON.stringify({ ...event, userName })}\n\n`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const userNameCache = new Map<string, string>();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      const unsubscribe = liveBus.subscribe((event) => {
        (async () => {
          try {
            let name = userNameCache.get(event.userId);
            if (!name) {
              const u = await prisma.user.findUnique({ where: { id: event.userId } });
              name = u?.name ?? "Unknown";
              userNameCache.set(event.userId, name);
            }
            controller.enqueue(encoder.encode(serialize(event, name)));
          } catch {
            // stream likely closed
          }
        })();
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
