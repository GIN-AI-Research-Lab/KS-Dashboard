"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

function stateDir() {
  const base = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const dir = path.join(base, "ks-dashboard-state");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function statePath(sessionId) {
  return path.join(stateDir(), `${sessionId}.json`);
}

function loadState(sessionId) {
  try {
    const raw = fs.readFileSync(statePath(sessionId), "utf8");
    return JSON.parse(raw);
  } catch {
    return { started: false, transcriptLine: 0, pendingToolCalls: {}, toolCallSeq: 0 };
  }
}

function saveState(sessionId, state) {
  try {
    fs.writeFileSync(statePath(sessionId), JSON.stringify(state), "utf8");
  } catch {
    // best effort -- telemetry must never crash the hook
  }
}

function clearState(sessionId) {
  try {
    fs.unlinkSync(statePath(sessionId));
  } catch {
    // ignore
  }
}

module.exports = { loadState, saveState, clearState };
