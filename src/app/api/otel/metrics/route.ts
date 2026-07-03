import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedEmailDomain, findUserByIdentity } from "@/lib/identity";
import { attrsToMap, otlpStr, otlpNum, type OtlpAttribute } from "@/lib/otlp";

// Receives Claude Code's OTel METRICS export (separate from logs) to capture
// lines of code added/removed. Enable on the client with:
//   OTEL_METRICS_EXPORTER=otlp
//   OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://<dashboard>/api/otel/metrics
//   OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta   (so each export is an increment)
//
// We only consume `claude_code.lines_of_code.count` (attribute type=added|removed,
// plus session.id + user.email). Delta temporality => safe to increment.

interface DataPoint {
  attributes?: OtlpAttribute[];
  asInt?: string | number;
  asDouble?: number;
}
interface Metric {
  name?: string;
  sum?: { dataPoints?: DataPoint[] };
  gauge?: { dataPoints?: DataPoint[] };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({}); // not JSON -> ack, don't retry
  }

  const resourceMetrics = (body as { resourceMetrics?: unknown[] })?.resourceMetrics ?? [];
  const perSession = new Map<string, { email?: string; added: number; removed: number }>();

  for (const rm of resourceMetrics) {
    for (const sm of (rm as { scopeMetrics?: unknown[] }).scopeMetrics ?? []) {
      for (const metric of (sm as { metrics?: Metric[] }).metrics ?? []) {
        if (metric.name !== "claude_code.lines_of_code.count") continue;
        const points = metric.sum?.dataPoints ?? metric.gauge?.dataPoints ?? [];
        for (const dp of points) {
          const map = attrsToMap(dp.attributes);
          const sessionId = otlpStr(map["session.id"]);
          const type = otlpStr(map["type"]);
          if (!sessionId || !type) continue;
          const value = dp.asInt !== undefined ? Number(dp.asInt) : otlpNum(dp.asDouble);
          const b = perSession.get(sessionId) ?? { email: otlpStr(map["user.email"]), added: 0, removed: 0 };
          const email = otlpStr(map["user.email"]);
          if (email) b.email = email;
          if (type === "added") b.added += value;
          else if (type === "removed") b.removed += value;
          perSession.set(sessionId, b);
        }
      }
    }
  }

  for (const [sessionId, agg] of perSession) {
    try {
      const user = agg.email && isAllowedEmailDomain(agg.email) ? await findUserByIdentity(agg.email) : null;
      if (!user) continue;
      const existing = await prisma.claudeSession.findUnique({ where: { externalId: sessionId } });
      if (!existing) {
        await prisma.claudeSession.create({
          data: { externalId: sessionId, userId: user.id, linesAdded: agg.added, linesRemoved: agg.removed },
        });
      } else {
        await prisma.claudeSession.update({
          where: { id: existing.id },
          data: { linesAdded: { increment: agg.added }, linesRemoved: { increment: agg.removed } },
        });
      }
    } catch {
      // never fail the whole batch
    }
  }

  return NextResponse.json({});
}
