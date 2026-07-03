import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCostUsd } from "@/lib/pricing";
import { ingestRequestSchema, type IngestEvent } from "@/lib/ingest-schema";
import { liveBus } from "@/lib/live-bus";
import { findUserByIdentity } from "@/lib/identity";

type ResolveResult =
  | { user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>> }
  | { error: string; status: number };

// Two auth modes share the same Bearer header:
// 1. The shared company-wide token (KS_DASHBOARD_INGEST_TOKEN) -- the sending
//    user is resolved from, in order of preference: (a) the real logged-in
//    account email Claude Code's own OTel export reported for this session
//    (see /api/otel/logs), when available, or (b) the `identity` field
//    (Windows username) the plugin always sends as a fallback. Never
//    auto-creates a user.
// 2. A legacy personal API key (`user.apiKey`) -- kept for backward
//    compatibility with keys already issued to employees.
async function resolveUser(
  token: string | null,
  identity: string | undefined,
  sessionId: string | undefined,
): Promise<ResolveResult> {
  if (!token) return { error: "Invalid or missing API key", status: 401 };

  const sharedToken = process.env.KS_DASHBOARD_INGEST_TOKEN;
  if (sharedToken && token === sharedToken) {
    const sessionIdentity = sessionId
      ? await prisma.sessionIdentity.findUnique({ where: { sessionId } })
      : null;
    const effectiveIdentity = sessionIdentity?.email ?? identity;
    if (!effectiveIdentity) return { error: "Missing identity for shared-token auth", status: 400 };
    const user = await findUserByIdentity(effectiveIdentity);
    if (!user) return { error: `No user found matching identity "${effectiveIdentity}"`, status: 400 };
    return { user };
  }

  const user = await prisma.user.findUnique({ where: { apiKey: token } });
  if (!user) return { error: "Invalid or missing API key", status: 401 };
  return { user };
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

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  // All events in one request come from the same plugin hook invocation, so
  // they always share one Claude Code session -- using the first is enough.
  const resolved = await resolveUser(token, parsed.data.identity, parsed.data.events[0]?.sessionId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { user } = resolved;

  const results = await Promise.allSettled(
    parsed.data.events.map((event) => handleEvent(user.id, event)),
  );
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, processed: results.length - failed, failed });
}
