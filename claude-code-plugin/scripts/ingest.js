#!/usr/bin/env node
"use strict";

const { resolveConfig } = require("./config");
const { loadState, saveState, clearState } = require("./state");
const { readNewTurns } = require("./transcript");
const { computeCostUsd } = require("./pricing");

function readStdin() {
  try {
    const raw = require("fs").readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function summarizeToolInput(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return undefined;
  const raw =
    toolInput.command ||
    toolInput.file_path ||
    toolInput.path ||
    toolInput.pattern ||
    toolInput.url ||
    toolInput.description ||
    JSON.stringify(toolInput);
  const str = String(raw);
  return str.length > 140 ? `${str.slice(0, 140)}…` : str;
}

function looksLikeError(toolResponse) {
  if (!toolResponse) return false;
  if (typeof toolResponse === "object" && (toolResponse.is_error || toolResponse.error)) return true;
  if (typeof toolResponse === "string" && /error/i.test(toolResponse.slice(0, 60))) return true;
  return false;
}

async function postEvents(apiEndpoint, apiKey, identity, events) {
  if (events.length === 0) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ identity, events }),
      signal: controller.signal,
    });
  } catch (err) {
    process.stderr.write(`[ks-dashboard] failed to send telemetry: ${err && err.message}\n`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const eventName = process.argv[2];
  const { apiEndpoint, apiKey, identity } = resolveConfig(process.argv);
  const input = readStdin();
  const sessionId = input.session_id;

  if (!sessionId) process.exit(0);

  if (!apiEndpoint || !apiKey) {
    process.stderr.write(
      "[ks-dashboard] not configured -- set api_endpoint/api_key in plugin settings or KS_DASHBOARD_API_ENDPOINT/KS_DASHBOARD_API_KEY env vars.\n",
    );
    process.exit(0);
  }

  const state = loadState(sessionId);
  const events = [];
  const timestamp = new Date().toISOString();

  // Reads any transcript lines not yet processed and turns them into "turn"
  // events. Tracked by state.transcriptLine so calling this more than once
  // (e.g. from both "stop" and "session_end") never double-counts a turn.
  function flushTranscriptTurns() {
    const { turns, lineCount } = readNewTurns(input.transcript_path, state.transcriptLine || 0);
    state.transcriptLine = lineCount;
    for (const t of turns) {
      events.push({
        type: "turn",
        sessionId,
        timestamp,
        model: t.model,
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        cacheCreationTokens: t.cacheCreationTokens,
        cacheReadTokens: t.cacheReadTokens,
        costUsd: computeCostUsd(t),
        stopReason: t.stopReason,
      });
    }
  }

  function ensureStarted() {
    if (state.started) return;
    events.push({
      type: "session_start",
      sessionId,
      timestamp,
      cwd: input.cwd,
      source: input.source,
      model: input.model,
    });
    state.started = true;
  }

  switch (eventName) {
    case "session_start": {
      events.push({
        type: "session_start",
        sessionId,
        timestamp,
        cwd: input.cwd,
        source: input.source,
        model: input.model,
      });
      state.started = true;
      break;
    }
    case "prompt": {
      ensureStarted();
      events.push({ type: "prompt", sessionId, timestamp });
      break;
    }
    case "tool_start": {
      ensureStarted();
      const toolName = input.tool_name || "unknown";
      const seq = (state.toolCallSeq = (state.toolCallSeq || 0) + 1);
      const callId = `c${seq}`;
      state.pendingToolCalls = state.pendingToolCalls || {};
      state.pendingToolCalls[toolName] = state.pendingToolCalls[toolName] || [];
      state.pendingToolCalls[toolName].push(callId);
      events.push({
        type: "tool_start",
        sessionId,
        timestamp,
        callId,
        toolName,
        summary: summarizeToolInput(toolName, input.tool_input),
      });
      break;
    }
    case "tool_end": {
      ensureStarted();
      const toolName = input.tool_name || "unknown";
      state.pendingToolCalls = state.pendingToolCalls || {};
      const queue = state.pendingToolCalls[toolName] || [];
      const callId = queue.shift() || `c${(state.toolCallSeq = (state.toolCallSeq || 0) + 1)}`;
      const status = looksLikeError(input.tool_response || input.tool_output) ? "ERROR" : "SUCCESS";
      events.push({ type: "tool_end", sessionId, timestamp, callId, toolName, status });
      break;
    }
    case "stop": {
      ensureStarted();
      flushTranscriptTurns();
      break;
    }
    case "session_end": {
      ensureStarted();
      // Claude Code doesn't always fire "Stop" before a session ends (e.g.
      // non-interactive `claude -p` one-shot runs skip it) -- flush here too
      // as a fallback so per-turn token usage is never lost. Safe to do
      // even when Stop already ran: state.transcriptLine prevents re-reading
      // lines that were already turned into events.
      flushTranscriptTurns();
      events.push({ type: "session_end", sessionId, timestamp, reason: input.reason });
      break;
    }
    default:
      process.exit(0);
  }

  await postEvents(apiEndpoint, apiKey, identity, events);

  if (eventName === "session_end") {
    clearState(sessionId);
  } else {
    saveState(sessionId, state);
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[ks-dashboard] hook error: ${err && err.stack}\n`);
  process.exit(0);
});
