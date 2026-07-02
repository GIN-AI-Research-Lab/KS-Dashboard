import { EventEmitter } from "node:events";
import type { ClaudeSession, ToolCall, Turn } from "@prisma/client";

export type LiveEvent =
  | { kind: "session_start"; userId: string; session: ClaudeSession }
  | { kind: "prompt"; userId: string; session: ClaudeSession }
  | { kind: "tool_start"; userId: string; session: ClaudeSession; toolCall: ToolCall }
  | { kind: "tool_end"; userId: string; session: ClaudeSession; toolCall: ToolCall }
  | { kind: "turn"; userId: string; session: ClaudeSession; turn: Turn }
  | { kind: "session_end"; userId: string; session: ClaudeSession };

class LiveBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(event: LiveEvent) {
    this.emitter.emit("event", event);
  }

  subscribe(listener: (event: LiveEvent) => void) {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }
}

const globalForBus = globalThis as unknown as { liveBus?: LiveBus };

export const liveBus = globalForBus.liveBus ?? new LiveBus();
if (process.env.NODE_ENV !== "production") globalForBus.liveBus = liveBus;
