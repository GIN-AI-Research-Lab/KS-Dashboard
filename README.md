# KS Dashboard

Company-wide dashboard for Claude Code usage analytics: token/cost tracking,
per-person / team / department breakdowns, leaderboards, model usage, and a
live real-time feed of running sessions — fed by a companion Claude Code
plugin.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Prisma 6** + SQLite (swap `DATABASE_URL` for Postgres/MySQL in production —
  the schema uses no SQLite-specific features)
- **Auth.js (NextAuth v5)** — credentials login, JWT sessions, role-based
  access (Admin / Department Head / Team Lead / Member)
- **Recharts** for charts, using the validated colorblind-safe categorical
  palette from the internal dataviz guidelines
- **Server-Sent Events** for the live sessions feed (no extra infra required)
- A separate **Claude Code plugin** (`claude-code-plugin/`) that reports
  telemetry via hooks

## Getting started

```bash
npm install
npm run db:push     # create the SQLite schema
npm run db:seed      # demo departments/teams/users + historical usage data
npm run dev
```

Open http://localhost:3000 and sign in with the seeded admin account:

- **Admin:** `admin@company.com` / `admin1234`
- **Any seeded employee:** e.g. `an.nguyen@company.com` / `member1234`

## Project structure

```
src/
  app/
    (dashboard)/        # authenticated pages (sidebar + topbar layout)
      page.tsx           # 1.1 company-wide overview
      me/                # 1.2 personal stats + API key for the plugin
      teams/[id]/         departments/[id]/   # 1.2 team & department views
      rankings/          # 1.3 leaderboards (tokens, input/output, cost, duration)
      models/            # 1.4 most-used models
      live/              # 1.5/1.6 real-time session feed with tool-call tags
      admin/             # 1.9 department/team/user management (admin only)
    api/
      ingest/            # plugin -> dashboard ingestion endpoint (API-key auth)
      live/              # SSE stream for the live feed
      stats/             # read APIs backing the pages above
      admin/             # CRUD for departments/teams/users
      auth/[...nextauth]/
  auth.ts                # NextAuth config
  middleware.ts          # route protection
  lib/
    stats.ts             # all aggregation queries
    pricing.ts           # model $/token table, used when the plugin doesn't
                          # pre-compute cost
    ingest-schema.ts      # zod contract for /api/ingest
    live-bus.ts           # in-process pub/sub powering the SSE endpoint
prisma/
  schema.prisma
  seed.ts
claude-code-plugin/       # install this on each employee's machine — see its
                          # own README.md
```

## How usage data gets in

Every employee installs the `claude-code-plugin` (see
[`claude-code-plugin/README.md`](./claude-code-plugin/README.md)) and
configures it with their personal API key from the **Cá nhân** page. The
plugin hooks into Claude Code's `SessionStart` / `UserPromptSubmit` /
`PreToolUse` / `PostToolUse` / `Stop` / `SessionEnd` events, reads per-turn
token usage from the session transcript, and POSTs structured events to
`POST /api/ingest`. From there:

- `ClaudeSession` rows track one row per Claude Code session (status, totals).
- `Turn` rows track one row per assistant reply (tokens, cost, model).
- `ToolCall` rows back the "which tools did people run" tags and rankings.

All dashboard pages read from these three tables — nothing in the UI talks to
Claude's API directly.

## Design decisions worth knowing

- **Visibility model:** every authenticated user can see everyone else's
  usage stats (an internal transparency/benchmarking tool, like a company
  leaderboard) — only **mutating** org-structure (creating users, changing
  roles/team assignments) is restricted to `ADMIN`. If your org wants stricter
  per-department visibility, the natural place to add it is
  `src/lib/api-helpers.ts` + the page-level data fetches in `src/lib/stats.ts`.
- **Cost is computed**, not billed: `/api/ingest` accepts an optional
  pre-computed `costUsd` per turn, and falls back to `src/lib/pricing.ts`
  (kept in sync with current published per-model pricing) when the plugin
  doesn't send one.
- **Real-time** is SSE + an in-memory event bus (`src/lib/live-bus.ts`) —
  simple and sufficient for a single-instance internal tool. If you deploy
  multiple app instances behind a load balancer, swap it for a Redis pub/sub
  channel (the `LiveBus` interface is a 10-line change).
- **Charts** follow the internal dataviz skill: a fixed-order, validated
  colorblind-safe categorical palette (`src/lib/chart-colors.ts`), single-hue
  sequential ramps for magnitude, one axis per chart, and legends/tooltips on
  every multi-series chart.

## Production checklist

- Set a strong `AUTH_SECRET` and point `DATABASE_URL` at a real database.
- Put the app behind HTTPS — the plugin sends API keys as Bearer tokens.
- Consider rotating the demo admin password before exposing this beyond your
  own machine.
