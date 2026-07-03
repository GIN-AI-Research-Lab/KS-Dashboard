# KS Dashboard

Company-wide dashboard for Claude Code usage analytics: token/cost tracking,
per-person / team / department breakdowns, leaderboards, model usage, and a
live real-time feed of running sessions — fed by a companion Claude Code
plugin.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Prisma 6** + SQLite (swap `DATABASE_URL` for Postgres/MySQL in production —
  the schema uses no SQLite-specific features)
- **Auth.js (NextAuth v5)** — credentials login + optional Microsoft Entra ID
  SSO (multi-domain, matched by email local-part), JWT sessions, role-based
  access (Admin / Department Head / Team Lead / Member)
- **Recharts** for charts, using the validated colorblind-safe categorical
  palette from the internal dataviz guidelines
- **Server-Sent Events** for the live sessions feed (no extra infra required)
- A separate **Claude Code plugin** (`claude-code-plugin/`) that reports
  telemetry via hooks

## Getting started

```bash
cp .env.example .env   # fill in AUTH_SECRET at minimum -- see below
npm install
npm run db:push     # create the SQLite schema
npm run db:seed      # creates the admin account only (idempotent, no demo data)
npm run dev
```

`.env` needs at least `DATABASE_URL` and `AUTH_SECRET` (any random string in
dev, e.g. `openssl rand -base64 32`). Everything else (`ALLOWED_EMAIL_DOMAINS`,
`AUTH_MICROSOFT_ENTRA_ID_*`, `KS_DASHBOARD_INGEST_TOKEN`, `AMIS_*`) is optional
and only needed for the features described below -- see the comments in
[`.env.example`](./.env.example).

Open http://localhost:3000 and sign in with the seeded admin account:

- **Admin:** `admin@company.com` / `admin1234`

Add real departments, teams, and employees from the Admin panel, via the AMIS
sync (see below), or once Microsoft Entra ID SSO is configured.

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
  auth.ts                # NextAuth config (credentials + Microsoft Entra ID)
  proxy.ts               # route protection (Next 16 renamed middleware.ts)
  lib/
    stats.ts             # all aggregation queries
    pricing.ts           # model $/token table, used when the plugin doesn't
                          # pre-compute cost
    ingest-schema.ts      # zod contract for /api/ingest
    live-bus.ts           # in-process pub/sub powering the SSE endpoint
    identity.ts           # email local-part matching shared by SSO login,
                          # the plugin's shared-token auth, and AMIS sync
    amis.ts                # AMIS Thông tin nhân sự Open API client
    amis-sync.ts           # upserts Department/User from AMIS employee data
prisma/
  schema.prisma
  seed.ts
scripts/
  amis-sync.ts           # CLI entry point for `npm run sync:amis`
claude-code-plugin/       # install this on each employee's machine — see its
                          # own README.md
```

## How usage data gets in

Every employee installs the `claude-code-plugin` (see
[`claude-code-plugin/README.md`](./claude-code-plugin/README.md)) and
configures it with either their personal API key or the one company-wide
shared token (see **Login & identity** below). The plugin hooks into Claude
Code's `SessionStart` / `UserPromptSubmit` / `PreToolUse` / `PostToolUse` /
`Stop` / `SessionEnd` events, reads per-turn token usage from the session
transcript, and POSTs structured events to `POST /api/ingest`. From there:

- `ClaudeSession` rows track one row per Claude Code session (status, totals).
- `Turn` rows track one row per assistant reply (tokens, cost, model).
- `ToolCall` rows back the "which tools did people run" tags and rankings.

All dashboard pages read from these three tables — nothing in the UI talks to
Claude's API directly.

## Login & identity

The company has two email domains (`sint.co.jp` and `kstns.biz`), possibly on
different Microsoft 365 tenants, that should be treated as the same set of
people. Both the web login and the plugin match users the same way: by the
**local-part** of the email (the part before `@`), case-insensitively, via
`src/lib/identity.ts`. `tuent@sint.co.jp` and `tuent@kstns.biz` resolve to one
`User` row as long as `ALLOWED_EMAIL_DOMAINS` includes both.

- **Web login:** credentials (email/password) always work. Microsoft Entra ID
  SSO is enabled once `AUTH_MICROSOFT_ENTRA_ID_ID`/`_SECRET` are set in
  `.env` (Azure App Registration, redirect URI
  `<domain>/api/auth/callback/microsoft-entra-id`) — it uses the multi-tenant
  `common` endpoint and then enforces `ALLOWED_EMAIL_DOMAINS` plus "must match
  an existing user" in `src/auth.ts`'s `signIn` callback. SSO never creates a
  new account; only an admin or the AMIS sync does.
- **Plugin auth:** `/api/ingest` accepts two kinds of Bearer token — a
  personal `apiKey` (legacy, unambiguous), or the shared
  `KS_DASHBOARD_INGEST_TOKEN` (one value for the whole company), in which case
  the request must also include a top-level `identity` field (the sending
  Windows username) that gets matched the same way. See
  `resolveUser()` in `src/app/api/ingest/route.ts`.
- **Keeping departments current:** `npm run sync:amis` (or wire it to a
  periodic scheduler) pulls employees from AMIS Thông tin nhân sự's Open API
  (`src/lib/amis.ts`, credentials in `AMIS_CLIENT_ID`/`AMIS_SECRET_KEY`) and
  upserts `Department` + `User` rows in `src/lib/amis-sync.ts`, keyed by
  `amisEmployeeCode`. AMIS's employee API has no team-level field (only an
  org-unit name, mapped to `Department`), so `Team` assignment stays a manual
  admin action. Employees with no email on file in AMIS are skipped — there's
  nothing to match them by.

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
