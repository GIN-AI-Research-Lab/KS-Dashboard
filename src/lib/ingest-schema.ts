import { z } from "zod";

// Contract between the KS Dashboard Claude Code plugin and POST /api/ingest.
// Deliberately independent of Claude Code's own (unstable) hook / transcript
// field names -- the plugin script is responsible for adapting hook stdin +
// transcript JSONL into this shape before it POSTs.

const base = {
  sessionId: z.string().min(1),
  timestamp: z.string().datetime().optional(),
};

export const sessionStartSchema = z.object({
  type: z.literal("session_start"),
  ...base,
  // Only the project label (last folder name) is accepted -- never the full cwd
  // path. See PRIVACY.md.
  projectLabel: z.string().optional(),
  source: z.string().optional(),
  model: z.string().optional(),
});

export const promptSchema = z.object({
  type: z.literal("prompt"),
  ...base,
});

export const toolStartSchema = z.object({
  type: z.literal("tool_start"),
  ...base,
  callId: z.string(),
  toolName: z.string(),
  // No `summary`/content field on purpose -- we never accept tool input/output
  // text (commands, file paths, diffs). Privacy by design; see PRIVACY.md.
});

export const toolEndSchema = z.object({
  type: z.literal("tool_end"),
  ...base,
  callId: z.string(),
  toolName: z.string(),
  status: z.enum(["SUCCESS", "ERROR"]).default("SUCCESS"),
});

export const turnSchema = z.object({
  type: z.literal("turn"),
  ...base,
  model: z.string(),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  cacheCreationTokens: z.number().int().nonnegative().default(0),
  cacheReadTokens: z.number().int().nonnegative().default(0),
  costUsd: z.number().nonnegative().optional(),
  stopReason: z.string().optional(),
});

export const sessionEndSchema = z.object({
  type: z.literal("session_end"),
  ...base,
  reason: z.string().optional(),
});

export const ingestEventSchema = z.discriminatedUnion("type", [
  sessionStartSchema,
  promptSchema,
  toolStartSchema,
  toolEndSchema,
  turnSchema,
  sessionEndSchema,
]);

export const ingestRequestSchema = z.object({
  // Only required when authenticating with the shared company-wide token
  // (KS_DASHBOARD_INGEST_TOKEN) -- resolves the sending user by local-part
  // match (Windows username or email). Ignored for personal API-key auth.
  identity: z.string().min(1).optional(),
  events: z.array(ingestEventSchema).min(1).max(500),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;
