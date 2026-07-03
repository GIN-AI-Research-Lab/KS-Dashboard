import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedEmailDomain, findUserByIdentity } from "@/lib/identity";
import { liveBus } from "@/lib/live-bus";
import type { ClaudeSession } from "@prisma/client";

// Receives Claude Code's built-in OpenTelemetry log export (OTLP/HTTP, JSON) and
// turns it into the same ClaudeSession / Turn / ToolCall rows the dashboard's
// /live feed and stats read. This is the PRIMARY telemetry pipeline for the
// VS Code extension, where plugin hooks do not fire (confirmed empirically --
// see HANDOFF.md). Zero per-user config: the account email is taken straight
// from Claude Code's own `user.email` attribute and matched to a dashboard user
// by email local-part (same multi-domain rule as SSO login).
//
// Point Claude Code at it with (in .claude/settings.json "env"):
//   OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://<dashboard>/api/otel/logs
//
// Field locations confirmed against real Claude Code v2.1.199 output (2026-07-03):
// user.email / session.id / event.name / tokens / cost all live on each log
// RECORD's attributes, not on the shared resource attributes.

interface OtlpAttribute {
  key: string;
  value?: {
    stringValue?: string;
    intValue?: string | number;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

function attrsToMap(attrs: OtlpAttribute[] | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const a of attrs ?? []) {
    const v = a.value;
    if (!v) continue;
    if (v.stringValue !== undefined) out[a.key] = v.stringValue;
    else if (v.intValue !== undefined) out[a.key] = typeof v.intValue === "string" ? Number(v.intValue) : v.intValue;
    else if (v.doubleValue !== undefined) out[a.key] = v.doubleValue;
    else if (v.boolValue !== undefined) out[a.key] = v.boolValue;
  }
  return out;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// Ensures a ClaudeSession exists for this Claude Code session id. Returns the
// row plus whether it was just created (so the caller can emit session_start).
async function ensureSession(
  externalId: string,
  userId: string,
  ts: Date,
  model: string | undefined,
): Promise<{ session: ClaudeSession; created: boolean }> {
  const existing = await prisma.claudeSession.findUnique({ where: { externalId } });
  if (existing) return { session: existing, created: false };
  const session = await prisma.claudeSession.create({
    data: { externalId, userId, model, startedAt: ts, lastEventAt: ts, status: "ACTIVE" },
  });
  return { session, created: true };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Not JSON (e.g. binary protobuf). Ack so Claude Code doesn't retry forever.
    return NextResponse.json({});
  }

  const resourceLogs = (body as { resourceLogs?: unknown[] })?.resourceLogs ?? [];
  const records: Record<string, string | number | boolean>[] = [];
  for (const rl of resourceLogs) {
    const scopeLogs = (rl as { scopeLogs?: unknown[] }).scopeLogs ?? [];
    for (const sl of scopeLogs) {
      for (const r of (sl as { logRecords?: unknown[] }).logRecords ?? []) {
        const rec = r as { body?: { stringValue?: string }; attributes?: OtlpAttribute[] };
        const map = attrsToMap(rec.attributes);
        // event.name is usually present; fall back to the record body ("claude_code.<name>").
        if (!map["event.name"] && rec.body?.stringValue) {
          map["event.name"] = rec.body.stringValue.replace(/^claude_code\./, "");
        }
        records.push(map);
      }
    }
  }

  // Process sequentially: records for one session mutate shared aggregates, and
  // ordering (session upsert before its Turn/ToolCall) must be preserved.
  for (const m of records) {
    try {
      const sessionId = str(m["session.id"]);
      const email = str(m["user.email"]);
      const eventName = str(m["event.name"]);
      if (!sessionId || !eventName) continue;

      // Keep the sessionId->email map current for the hook /api/ingest fallback.
      if (email && isAllowedEmailDomain(email)) {
        await prisma.sessionIdentity.upsert({
          where: { sessionId },
          create: { sessionId, email },
          update: { email },
        });
      }

      // For /live we need a real dashboard user to attribute the row to.
      const user = email && isAllowedEmailDomain(email) ? await findUserByIdentity(email) : null;
      if (!user) continue;

      const tsStr = str(m["event.timestamp"]);
      const ts = tsStr ? new Date(tsStr) : new Date();
      const model = str(m["model"]);

      switch (eventName) {
        case "user_prompt": {
          const { session, created } = await ensureSession(sessionId, user.id, ts, model);
          const updated = await prisma.claudeSession.update({
            where: { id: session.id },
            data: { promptCount: { increment: 1 }, lastEventAt: ts, status: "ACTIVE" },
          });
          liveBus.publish(
            created
              ? { kind: "session_start", userId: user.id, session: updated }
              : { kind: "prompt", userId: user.id, session: updated },
          );
          break;
        }

        case "api_request": {
          const requestId = str(m["request_id"]);
          // Idempotency: skip a request we've already turned into a Turn (OTel retries).
          if (requestId) {
            const dupe = await prisma.turn.findUnique({ where: { externalId: requestId } });
            if (dupe) break;
          }
          const { session, created } = await ensureSession(sessionId, user.id, ts, model);
          if (created) liveBus.publish({ kind: "session_start", userId: user.id, session });

          const inputTokens = num(m["input_tokens"]);
          const outputTokens = num(m["output_tokens"]);
          const cacheCreationTokens = num(m["cache_creation_tokens"]);
          const cacheReadTokens = num(m["cache_read_tokens"]);
          const costUsd = num(m["cost_usd"]);
          const durationMs = m["duration_ms"] !== undefined ? Math.round(num(m["duration_ms"])) : null;
          const ttftMs = m["ttft_ms"] !== undefined ? Math.round(num(m["ttft_ms"])) : null;

          const turn = await prisma.turn.create({
            data: {
              externalId: requestId,
              sessionId: session.id,
              userId: user.id,
              model: model ?? "unknown",
              inputTokens,
              outputTokens,
              cacheCreationTokens,
              cacheReadTokens,
              costUsd,
              durationMs,
              ttftMs,
              createdAt: ts,
            },
          });
          const updated = await prisma.claudeSession.update({
            where: { id: session.id },
            data: {
              model: model ?? undefined,
              inputTokens: { increment: inputTokens },
              outputTokens: { increment: outputTokens },
              cacheCreationTokens: { increment: cacheCreationTokens },
              cacheReadTokens: { increment: cacheReadTokens },
              costUsd: { increment: costUsd },
              turnCount: { increment: 1 },
              lastEventAt: ts,
              status: "IDLE",
            },
          });
          liveBus.publish({ kind: "turn", userId: user.id, session: updated, turn });
          break;
        }

        case "tool_result": {
          const toolUseId = str(m["tool_use_id"]);
          if (!toolUseId) break;
          const toolName = str(m["tool_name"]) ?? "unknown";
          const success = m["success"] === true || m["success"] === "true";
          const durationMs = m["duration_ms"] !== undefined ? num(m["duration_ms"]) : null;

          const { session, created } = await ensureSession(sessionId, user.id, ts, model);
          if (created) liveBus.publish({ kind: "session_start", userId: user.id, session });

          const alreadyCounted = await prisma.toolCall.findUnique({ where: { id: toolUseId } });
          const toolCall = await prisma.toolCall.upsert({
            where: { id: toolUseId },
            create: {
              id: toolUseId,
              sessionId: session.id,
              userId: user.id,
              toolName,
              status: success ? "SUCCESS" : "ERROR",
              startedAt: ts,
              endedAt: ts,
              durationMs,
            },
            update: { status: success ? "SUCCESS" : "ERROR", endedAt: ts, durationMs },
          });
          const updated = await prisma.claudeSession.update({
            where: { id: session.id },
            data: {
              lastEventAt: ts,
              ...(alreadyCounted ? {} : { toolCallCount: { increment: 1 } }),
            },
          });
          liveBus.publish({ kind: "tool_end", userId: user.id, session: updated, toolCall });
          break;
        }

        case "tool_decision": {
          // Claude Code emits accept/reject when you approve or decline an edit.
          const decision = (str(m["decision"]) ?? "").toLowerCase();
          const accepted = decision.startsWith("accept");
          const rejected = decision.startsWith("reject");
          if (!accepted && !rejected) break;
          const { session, created } = await ensureSession(sessionId, user.id, ts, model);
          if (created) liveBus.publish({ kind: "session_start", userId: user.id, session });
          await prisma.claudeSession.update({
            where: { id: session.id },
            data: {
              lastEventAt: ts,
              ...(accepted ? { editsAccepted: { increment: 1 } } : { editsRejected: { increment: 1 } }),
            },
          });
          break;
        }

        case "api_error": {
          const { session, created } = await ensureSession(sessionId, user.id, ts, model);
          if (created) liveBus.publish({ kind: "session_start", userId: user.id, session });
          await prisma.claudeSession.update({
            where: { id: session.id },
            data: { apiErrorCount: { increment: 1 }, lastEventAt: ts },
          });
          break;
        }

        // assistant_response, hook_execution_* -- not needed for /live.
        default:
          break;
      }
    } catch {
      // One bad record must never fail the whole batch; Claude Code would retry it.
    }
  }

  return NextResponse.json({});
}
