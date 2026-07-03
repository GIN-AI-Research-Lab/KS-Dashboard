"use client";

import { useEffect, useState } from "react";
import { Badge, Tag } from "@/components/ui/Badge";
import { formatNumber, formatRelativeTime, formatUsd } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";
import type { LiveSessionCard, LiveToolCall } from "./types";

type RawLiveEvent = {
  kind: "session_start" | "prompt" | "tool_start" | "tool_end" | "turn" | "session_end";
  userId: string;
  userName: string;
  session: {
    id: string;
    externalId: string;
    projectLabel: string | null;
    model: string | null;
    status: LiveSessionCard["status"];
    startedAt: string;
    endedAt: string | null;
    lastEventAt: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    turnCount: number;
    promptCount: number;
    toolCallCount: number;
  };
  toolCall?: LiveToolCall;
};

const STATUS_VARIANT: Record<LiveSessionCard["status"], "good" | "warning" | "neutral"> = {
  ACTIVE: "good",
  IDLE: "warning",
  ENDED: "neutral",
};

const STATUS_LABEL: Record<LiveSessionCard["status"], string> = {
  ACTIVE: "Đang chạy",
  IDLE: "Chờ",
  ENDED: "Kết thúc",
};

function mergeEvent(sessions: LiveSessionCard[], event: RawLiveEvent): LiveSessionCard[] {
  const idx = sessions.findIndex((s) => s.id === event.session.id);
  const base: LiveSessionCard =
    idx >= 0
      ? { ...sessions[idx] }
      : {
          id: event.session.id,
          externalId: event.session.externalId,
          userId: event.userId,
          userName: event.userName,
          team: null,
          department: null,
          projectLabel: event.session.projectLabel,
          model: event.session.model,
          status: event.session.status,
          startedAt: event.session.startedAt,
          endedAt: event.session.endedAt,
          lastEventAt: event.session.lastEventAt,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          turnCount: 0,
          promptCount: 0,
          toolCallCount: 0,
          toolCalls: [],
        };

  base.status = event.session.status;
  base.model = event.session.model ?? base.model;
  base.projectLabel = event.session.projectLabel ?? base.projectLabel;
  base.endedAt = event.session.endedAt;
  base.lastEventAt = event.session.lastEventAt;
  base.inputTokens = event.session.inputTokens;
  base.outputTokens = event.session.outputTokens;
  base.costUsd = event.session.costUsd;
  base.turnCount = event.session.turnCount;
  base.promptCount = event.session.promptCount;
  base.toolCallCount = event.session.toolCallCount;

  if (event.toolCall) {
    const calls = base.toolCalls.filter((c) => c.id !== event.toolCall!.id);
    base.toolCalls = [event.toolCall, ...calls].slice(0, 8);
  }

  const rest = sessions.filter((s) => s.id !== event.session.id);
  return [base, ...rest].slice(0, 100);
}

export function LiveFeed({ initialSessions }: { initialSessions: LiveSessionCard[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [connected, setConnected] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const es = new EventSource("/api/live");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as RawLiveEvent;
        setSessions((prev) => mergeEvent(prev, event));
      } catch {
        // ignore malformed heartbeat/comment lines
      }
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-[#0ca30c]" : "bg-[#898781]"}`}
          aria-hidden
        />
        {connected ? "Đang kết nối trực tiếp" : "Đang kết nối lại..."}
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Chưa có phiên nào. Cài plugin KS Dashboard vào Claude Code để bắt đầu ghi nhận.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4a3aa7]/15 text-xs font-semibold text-[#4a3aa7]">
                  {s.userName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{s.userName}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {s.projectLabel ?? "—"} {s.model ? `· ${s.model}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(s.lastEventAt)}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span className="text-[var(--text-muted)]">Input</span>
                <div className="font-semibold tabular-nums">{formatNumber(s.inputTokens)}</div>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Output</span>
                <div className="font-semibold tabular-nums">{formatNumber(s.outputTokens)}</div>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Turns</span>
                <div className="font-semibold tabular-nums">{s.turnCount}</div>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Chi phí</span>
                <div className="font-semibold tabular-nums">{formatUsd(s.costUsd)}</div>
              </div>
            </div>

            {s.toolCalls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.toolCalls.map((tc, i) => (
                  <Tag key={tc.id} color={colorForIndex(i)}>
                    {tc.toolName}
                    {tc.status === "STARTED" ? " ⋯" : tc.status === "ERROR" ? " ✕" : " ✓"}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
