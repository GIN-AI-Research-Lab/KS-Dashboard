export interface LiveToolCall {
  id: string;
  toolName: string;
  status: "STARTED" | "SUCCESS" | "ERROR";
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}

export interface LiveSessionCard {
  id: string;
  externalId: string;
  userId: string;
  userName: string;
  team: string | null;
  department: string | null;
  projectLabel: string | null;
  model: string | null;
  status: "ACTIVE" | "IDLE" | "ENDED";
  startedAt: string;
  endedAt: string | null;
  lastEventAt: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  turnCount: number;
  promptCount: number;
  toolCallCount: number;
  toolCalls: LiveToolCall[];
}
