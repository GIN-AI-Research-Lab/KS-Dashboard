# KS Dashboard Telemetry Plugin

Reports Claude Code usage (tokens, cost, sessions, tool calls) from your machine
to the company's KS Dashboard, so it shows up on the Overview / Personal / Team /
Live pages in near real time.

**What it sends:** session id, project folder name, model, token counts
(input/output/cache), computed cost, tool **names** and a short truncated
summary (e.g. the first 140 chars of a bash command or a file path) — never
full file contents, full commands, or your prompt/response text.

**How it works:** it registers Claude Code hooks (`SessionStart`,
`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd`). Each
hook runs `scripts/ingest.js`, which reads the small amount of data it needs
(and, on `Stop`, the newly-appended lines of the session transcript to read
token usage) and POSTs it to your dashboard's `/api/ingest` endpoint. Hooks run
asynchronously and always exit `0` — a dashboard outage or network hiccup never
blocks or slows down your actual Claude Code session.

## 1. Get an API key

Two ways to authenticate, both use the same `api_key` field:

- **Company-wide shared token (recommended, no per-person setup):** ask IT for
  the one `KS_DASHBOARD_INGEST_TOKEN` value they generated for the whole
  company. With this token, the dashboard identifies you by your **Windows
  username** (matched against your email's local-part, e.g. Windows user
  `tuent` matches `tuent@sint.co.jp` / `tuent@kstns.biz`) — nothing else to
  configure. This only works if your account already exists on the dashboard
  (created by an admin or by the AMIS sync); it will never auto-create one.
- **Personal API key (legacy, still supported):** log into the dashboard, open
  **Cá nhân** (Me), and copy your personal key (starts with `ksd_`). Usage is
  attributed to your account directly, no identity matching involved.

## 2. Configure the endpoint + key

The simplest way is to set two environment variables that Claude Code will
pass through to the hook scripts. Add this to your **user-level**
`~/.claude/settings.json` (create the file if it doesn't exist):

```json
{
  "env": {
    "KS_DASHBOARD_API_ENDPOINT": "https://ks-dashboard.your-company.com/api/ingest",
    "KS_DASHBOARD_API_KEY": "the shared company token, or your personal ksd_... key"
  }
}
```

For local development against the dashboard running on your machine, use
`http://localhost:3000/api/ingest`.

## 3. Install the hooks

### Option A — merge into settings.json directly (most compatible)

Copy the contents of [`hooks/hooks.json`](./hooks/hooks.json) into the
`"hooks"` key of `~/.claude/settings.json` (to apply to every project) or
`.claude/settings.json` in a specific repo (to apply to that project only).
Replace every `${CLAUDE_PLUGIN_ROOT}` with the **absolute path** to this
`claude-code-plugin` directory, and delete the two
`${user_config.api_endpoint}` / `${user_config.api_key}` arguments from each
`args` array (leave the env vars from step 2 to do their job instead) — or
keep them and just leave them as empty strings `""`, the script falls back to
the environment variables automatically.

Example for one hook entry after substitution:

```json
{
  "type": "command",
  "command": "node",
  "args": ["/opt/ks-dashboard/claude-code-plugin/scripts/ingest.js", "stop"],
  "timeout": 20,
  "async": true
}
```

### Option B — load as a plugin (if your Claude Code build supports plugin dirs)

```bash
claude --plugin-dir /path/to/claude-code-plugin
```

or install it from a git-based plugin marketplace your org maintains, then
optionally fill in `api_endpoint` / `api_key` in the plugin's settings UI
instead of using environment variables.

## 4. Verify it's working

1. Start a new Claude Code session in any project.
2. Run a couple of prompts / tool calls.
3. Open the dashboard's **Phiên trực tuyến** (Live) page — your session should
   appear within a few seconds, with a live token/cost counter and tags for
   each tool call.

If nothing shows up, run a hook manually to see the error output:

```bash
echo '{"session_id":"test-123","cwd":"/tmp","transcript_path":"/dev/null"}' \
  | node scripts/ingest.js session_start
```

Common issues:

- `not configured` — the env vars from step 2 aren't set, or you started
  Claude Code from a shell that doesn't have them exported.
- `failed to send telemetry: ... 401` — your API key is wrong or was
  regenerated on the dashboard; copy the current one from your Me page.
- `failed to send telemetry: ... 400` (shared-token mode only) — the
  dashboard couldn't match your Windows username to an existing account. Ask
  an admin to check that your account exists there under an email whose
  local-part equals your Windows username, or switch to a personal API key.
- Nothing at all — check that `~/.claude/settings.json` is valid JSON (a
  trailing comma will silently break hook loading).

## Notes & limitations

- Tool call `PreToolUse`/`PostToolUse` correlation is done by a small local
  per-session FIFO queue per tool name (state kept under
  `~/.claude/ks-dashboard-state/`), since Claude Code hook payloads don't
  expose a stable tool-call id. This is accurate for the common case but can
  mismatch under heavy parallel use of the *same* tool within one turn.
- Turn-level token usage is read from the session transcript file on `Stop`.
  Claude Code's transcript format is internal and can change between
  releases; `scripts/transcript.js` parses it defensively (tries a couple of
  known field shapes) and simply reports zero new turns if the shape changes
  again — it will never crash your session.
- All local state files are safe to delete at any time
  (`~/.claude/ks-dashboard-state/`); they'll be recreated on the next hook.
