import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCostUsd } from "@/lib/pricing";
import { ingestRequestSchema, type IngestEvent } from "@/lib/ingest-schema";
import { liveBus } from "@/lib/live-bus";

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!apiKey) return null;
  return prisma.user.findUnique({ where: { apiKey } });
}

async function handleEvent(userId: string, event: IngestEvent) {
  const ts = event.timestamp ? new Date(event.timestamp) : new Date();

  switch (event.type) {
    case "session_start": {
      const session = await prisma.claudeSession.upsert({
        where: { externalId: event.sessionId },
        create: {
          externalId: event.sessionId,
          userId,
          cwd: event.cwd,
          projectLabel: event.projectLabel ?? event.cwd?.split(/[\\/]/).pop(),
          source: event.source,
          model: event.model,
          startedAt: ts,
          lastEventAt: ts,
          status: "ACTIVE",
        },
        update: {
          status: "ACTIVE",
          lastEventAt: ts,
          model: event.model ?? undefined,
        },
      });
      liveBus.publish({ kind: "session_start", userId, session });
      return;
    }
    case "prompt": {
      const session = await prisma.claudeSession.update({
        where: { externalId: event.sessionId },
        data: { promptCount: { increment: 1 }, lastEventAt: ts, status: "ACTIVE" },
      });
      liveBus.publish({ kind: "prompt", userId, session });
      return;
    }
    case "tool_start": {
      const session = await prisma.claudeSession.findUnique({ where: { externalId: event.sessionId } });
      if (!session) return;
      const call = await prisma.toolCall.create({
        data: {
          id: `${session.id}:${event.callId}`,
          sessionId: session.id,
          userId,
          toolName: event.toolName,
          summary: event.summary,
          status: "STARTED",
          startedAt: ts,
        },
      });
      await prisma.claudeSession.update({
        where: { id: session.id },
        data: { toolCallCount: { increment: 1 }, lastEventAt: ts },
      });
      liveBus.publish({ kind: "tool_start", userId, session, toolCall: call });
      return;
    }
    case "tool_end": {
      const session = await prisma.claudeSession.findUnique({ where: { externalId: event.sessionId } });
      if (!session) return;
      const callId = `${session.id}:${event.callId}`;
      const existing = await prisma.toolCall.findUnique({ where: { id: callId } });
      const durationMs = existing ? ts.getTime() - existing.startedAt.getTime() : undefined;
      const call = await prisma.toolCall.upsert({
        where: { id: callId },
        create: {
          id: callId,
          sessionId: session.id,
          userId,
          toolName: event.toolName,
          status: event.status,
          startedAt: ts,
          endedAt: ts,
        },
        update: { status: event.status, endedAt: ts, durationMs },
      });
      await prisma.claudeSession.update({ where: { id: session.id }, data: { lastEventAt: ts } });
      liveBus.publish({ kind: "tool_end", userId, session, toolCall: call });
      return;
    }
    case "turn": {
      const session = await prisma.claudeSession.findUnique({ where: { externalId: event.sessionId } });
      if (!session) return;
      const costUsd =
        event.costUsd ??
        computeCostUsd(
          event.model,
          event.inputTokens,
          event.outputTokens,
          event.cacheCreationTokens,
          event.cacheReadTokens,
        );

      const turn = await prisma.turn.create({
        data: {
          sessionId: session.id,
          userId,
          model: event.model,
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          cacheCreationTokens: event.cacheCreationTokens,
          cacheReadTokens: event.cacheReadTokens,
          costUsd,
          stopReason: event.stopReason,
          createdAt: ts,
        },
      });

      const updatedSession = await prisma.claudeSession.update({
        where: { id: session.id },
        data: {
          model: event.model,
          inputTokens: { increment: event.inputTokens },
          outputTokens: { increment: event.outputTokens },
          cacheCreationTokens: { increment: event.cacheCreationTokens },
          cacheReadTokens: { increment: event.cacheReadTokens },
          costUsd: { increment: costUsd },
          turnCount: { increment: 1 },
          lastEventAt: ts,
          status: "IDLE",
        },
      });
      liveBus.publish({ kind: "turn", userId, session: updatedSession, turn });
      return;
    }
    case "session_end": {
      const session = await prisma.claudeSession.update({
        where: { externalId: event.sessionId },
        data: { status: "ENDED", endedAt: ts, lastEventAt: ts },
      });
      liveBus.publish({ kind: "session_end", userId, session });
      return;
    }
  }
}

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ingestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });
  }

  const results = await Promise.allSettled(
    parsed.data.events.map((event) => handleEvent(user.id, event)),
  );
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, processed: results.length - failed, failed });
}
