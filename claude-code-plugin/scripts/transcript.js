"use strict";

const fs = require("fs");

// The Claude Code transcript JSONL format is internal and can change between
// releases, so this parser is defensive: it tries a couple of known shapes
// for the assistant "usage" block and model id rather than assuming one.
function extractAssistantTurn(entry) {
  const message = entry.message && typeof entry.message === "object" ? entry.message : null;
  const usage = entry.usage || (message && message.usage) || null;
  if (!usage) return null;

  const role = entry.role || (message && message.role);
  if (role && role !== "assistant") return null;

  const model = entry.model || (message && message.model) || null;
  const stopReason = entry.stop_reason || (message && message.stop_reason) || null;

  // usage.cache_creation, when present, breaks the write down by TTL --
  // 1h-cached tokens bill at 2x base input price, 5m-cached at 1.25x. Fall
  // back to treating the whole cache_creation_input_tokens as 5m if the
  // breakdown isn't there (older transcript entries, or a differently
  // shaped one -- again, this format is internal and can change).
  const cacheCreation = usage.cache_creation && typeof usage.cache_creation === "object" ? usage.cache_creation : null;
  const cacheCreation5m = cacheCreation
    ? Number(cacheCreation.ephemeral_5m_input_tokens || 0)
    : Number(usage.cache_creation_input_tokens || 0);
  const cacheCreation1h = cacheCreation ? Number(cacheCreation.ephemeral_1h_input_tokens || 0) : 0;

  return {
    model: model || "unknown",
    inputTokens: Number(usage.input_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    cacheCreationTokens: Number(usage.cache_creation_input_tokens || 0),
    cacheCreation5mTokens: cacheCreation5m,
    cacheCreation1hTokens: cacheCreation1h,
    cacheReadTokens: Number(usage.cache_read_input_tokens || 0),
    stopReason: stopReason || undefined,
  };
}

// Reads only the lines appended since `fromLine`, returns parsed assistant
// turns plus the new total line count so the caller can persist the offset.
function readNewTurns(transcriptPath, fromLine) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { turns: [], lineCount: fromLine };
  }

  const content = fs.readFileSync(transcriptPath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const newLines = lines.slice(fromLine);

  const turns = [];
  for (const line of newLines) {
    try {
      const entry = JSON.parse(line);
      const turn = extractAssistantTurn(entry);
      if (turn) turns.push(turn);
    } catch {
      // skip malformed / partially-written line
    }
  }

  return { turns, lineCount: lines.length };
}

module.exports = { readNewTurns };
