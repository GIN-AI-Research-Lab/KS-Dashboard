# KS Dashboard

> **Enterprise AI Observability, FinOps & Developer Governance Platform for Claude Code & AI Coding Agents**  
> *A grant-seeking, open-source enterprise software platform delivering real-time telemetry, token cost forecasting, engineering tool intelligence, and sovereign privacy.*

[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20TypeScript%20%7C%20Tailwind%204-black.svg?logo=nextdotjs)](package.json)
[![Database](https://img.shields.io/badge/Database-Prisma%206%20%7C%20PostgreSQL%20%2F%20SQLite-38B2AC.svg?logo=prisma)](prisma/)
[![Auth](https://img.shields.io/badge/Auth-NextAuth%20v5%20%7C%20Microsoft%20Entra%20ID-blue.svg)](src/auth.ts)
[![Telemetry](https://img.shields.io/badge/Telemetry-Claude%20Code%20Hooks%20%7C%20OTel-orange.svg)](claude-code-plugin/)
[![Privacy](https://img.shields.io/badge/Privacy-Zero%20Prompt%20Logging%20%7C%20RBAC-success.svg)](PRIVACY.md)

---

## 🌟 Executive Summary & Pitch

As enterprises aggressively deploy autonomous AI coding assistants (such as Claude Code, Cursor, and custom agentic CLI harnesses), engineering leaders face critical visibility and control bottlenecks:
1. **Unpredictable AI Spend & Token Leaks:** High-tier foundation models rapidly drain enterprise budgets without per-developer, per-team, or per-project accountability.
2. **The "Prompt Caching" Blindspot:** Companies fail to capture Anthropic Prompt Caching savings (which can discount recurring context by up to 90%) due to a lack of cache hit-ratio monitoring.
3. **Zero Developer Tooling Intelligence:** Engineering leaders cannot see *how* developers use AI—which CLI tools fail, where agent loops stall, or how code-edit acceptance correlates with productivity.
4. **Data Sovereignty & Privacy Concerns:** Standard cloud analytics tools capture confidential corporate intellectual property (source code snippets, developer prompts, full disk paths).

**KS Dashboard** provides a **self-hosted, enterprise-grade AI FinOps & Governance Control Center**. Powered by a native companion plugin (`claude-code-plugin/`) capturing telemetry directly at the execution lifecycle, KS Dashboard aggregates token burn, computes dollar savings from prompt caching, tracks tool execution flow via Sankey diagrams, detects task categories (research, coding, debugging, planning), and offers a live Server-Sent Events (SSE) session stream—all under a **strict zero-prompt-logging privacy architecture**.

```
       ┌────────────────────────────────────────────────────────┐
       │             Developer Workstations (CLI / IDE)         │
       │                                                        │
       │  Claude Code CLI Execution ──► Lifecycle Hooks Plugin  │
       │  (SessionStart, PreToolUse, PostToolUse, Stop, End)   │
       └───────────▲────────────────────────────▲───────────────┘
                   │ Secure JSON Telemetry      │
                   ▼ (Zero Prompts / Zero Code) │
       ┌────────────────────────────────────────┴───────────────┐
       │             KS Dashboard Enterprise Core               │
       │                                                        │
       │  • Next.js 16 (App Router) + Prisma 6 PostgreSQL/SQLite│
       │  • Auth.js v5 (Microsoft Entra ID Azure SSO + RBAC)    │
       │  • Real-time SSE Pub/Sub Event Bus (`liveBus`)         │
       │  • Anthropic Prompt Caching ROI & Run-Rate Forecasting │
       │  • Tool Latency Percentiles (P50/P90/P99) & Sankeys    │
       │  • Task Auto-Classification & Internal Prompt Library  │
       └────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Architectural Modules & Features

### 1. Ingestion Engine & Strict Sovereign Privacy
- **Companion Telemetry Plugin:** Lightweight hooks plugin installed on developer laptops (`claude-code-plugin/`) monitoring `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, and `SessionEnd`.
- **Zero-Data-Retention Compliance:** Guaranteed by design (`PRIVACY.md`). Prompts, source code contents, sensitive environment variables, and absolute working directories are **never transmitted or stored**. Only token counts, model tiers, tool names, execution latencies, and exit codes are ingested.
- **Enterprise OpenTelemetry Receiver:** Integrated `/api/otel/metrics` receiver capturing TTFT (Time-to-First-Token), line delta estimates, and API failure codes.

### 2. FinOps & Cost Intelligence
- **Prompt Caching ROI Engine (`/roi`):** Explicitly calculates exact USD saved from cache read hits vs. fresh prompt generation, computing overall cache efficiency ratios.
- **Run-Rate & Anomaly Alerts:** Automatically projects month-end spending based on active rolling daily burn and flags abnormal consumption spikes.
- **Dynamic Pricing Engine:** Configurable model pricing table (`src/lib/pricing.ts`) mapping Claude 3.5 Sonnet, Claude 3.7 Sonnet, Claude 3 Opus, and Claude 3.5 Haiku token rates.

### 3. Tool & Engineering Workflow Analytics
- **Tool Sequence Sankey Diagrams (`/insights`):** Visualizes transitions between developer tool calls (e.g., `Glob` → `Read` → `Edit` → `Bash`) to diagnose agent looping or task stall patterns.
- **Latency Percentiles:** Comprehensive P50, P90, and P99 execution benchmarks across every tool and CLI subcommand.
- **Task-Type Classification:** Combines user intent tags with tool-call heuristics to automatically categorize sessions into *Research*, *Feature Coding*, *Bug Investigation*, or *Architectural Planning*.

### 4. Enterprise Identity & HRMS Synchronization
- **Single Sign-On (SSO):** Microsoft Entra ID (Azure Active Directory) multi-tenant OAuth with email local-part domain matching.
- **Role-Based Access Control (RBAC):** Granular permissions for *Admin*, *Department Head*, and *Engineer / Member*.
- **AMIS HRMS Sync (`scripts/amis-sync.ts`):** Automated Open API synchronization mapping corporate organizational departments and personnel rosters into dashboard teams.

### 5. Knowledge Sharing & Internal Prompt/Skill Library (`/library`)
- Enterprise internal repository for sharing high-impact developer prompts and Claude Code custom skills.
- Supports public/private visibility, Markdown authoring with secure image upload, emoji reactions, threaded comments, and personal bookmark collections.

---

## 📊 Feature Comparison Matrix

| Capability | KS Dashboard | Cloud SaaS Trackers (Langfuse/Arize) | Generic APM (Datadog/NewRelic) |
|:---|:---:|:---:|:---:|
| **Specialized Claude Code Plugin** | ✅ Native Lifecycle Hooks | ❌ Generic SDK Only | ❌ Manual instrumentation |
| **Prompt Caching USD Tracking** | ✅ Real-time ROI calculation | ⚠️ Partial | ❌ None |
| **Tool Sankey Transition Chains** | ✅ Built-in | ❌ None | ❌ None |
| **Strict Zero-Prompt Data Privacy** | ✅ Zero IP captured | ⚠️ Prompts stored in cloud | ⚠️ Telemetry scrub required |
| **Microsoft Entra ID & HRMS Sync** | ✅ Native AMIS + Entra ID | ❌ Enterprise Add-on ($$$) | ⚠️ Complex SAML setup |
| **Self-Hosted Sovereign Deployment** | ✅ 1-click Docker / Node | ⚠️ Complex Kubernetes | ❌ Cloud only |

---

## 🛠️ Project Structure

```
KS-Dashboard/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Authenticated application views
│   │   │   ├── page.tsx        # Company-wide overview & cache efficiency
│   │   │   ├── live/           # Real-time SSE session monitor
│   │   │   ├── roi/            # FinOps run-rate & prompt caching savings
│   │   │   ├── insights/       # Tool Sankeys, latency percentiles & pivots
│   │   │   ├── tools/          # Tool error rates, execution metrics
│   │   │   ├── library/        # Internal prompt & skill sharing platform
│   │   │   ├── sessions/       # Session playback, annotations & outcomes
│   │   │   └── admin/          # RBAC department & identity management
│   │   └── api/                # Ingestion endpoints, SSE stream & export APIs
│   ├── auth.ts                 # NextAuth v5 + Microsoft Entra ID integration
│   └── lib/                    # Pricing tables, stats aggregation, AMIS client
├── prisma/
│   ├── schema.prisma           # Prisma schema (PostgreSQL / SQLite)
│   └── seed.ts                 # Database seeder
├── claude-code-plugin/         # Developer CLI companion telemetry plugin
├── deploy/                     # Enterprise deployment guides & Docker Compose
└── scripts/                    # AMIS HRMS employee synchronization scripts
```

---

## ⚡ Quick Start & Deployment

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/trituenguyen97/KS-Dashboard.git
cd KS-Dashboard

# 2. Configure environment
cp .env.example .env
# Ensure AUTH_SECRET is set (e.g. openssl rand -base64 32)

# 3. Install dependencies & initialize database
npm install
npm run db:push
npm run db:seed     # Seeds default admin: admin@company.com / admin1234

# 4. Start development server
npm run dev
```

Open **`http://localhost:3000`** and log in.

### Installing Developer Companion Plugin

On each engineer's machine running Claude Code:
```bash
cd claude-code-plugin
npm install
# Configure personal API key or shared company ingest token in config.json
```
Telemetry will immediately stream into the live dashboard.

---

## 🎯 Startup Vision, Grant Objectives & Roadmap

KS Dashboard is targeting the high-growth **AI FinOps & Enterprise Agent Governance** market. We are seeking open-source grants, seed capital, and enterprise pilot partners.

### Planned Grant & Resource Allocation

```
                   ┌───────────────────────────────────────┐
                   │        Target Grant Allocation        │
                   ├──────────────────┬────────────────────┤
                   │ Multi-Agent Hub  │                    │
                   │ (Cursor/Codex/...)        35%         │
                   ├──────────────────┼────────────────────┤
                   │ Automated Budget │                    │
                   │ Circuit Breakers │        25%         │
                   ├──────────────────┼────────────────────┤
                   │ SOC2 & Enterprise│                    │
                   │ Security Auditing│        25%         │
                   ├──────────────────┼────────────────────┤
                   │ Open Source Core │                    │
                   │ Documentation    │        15%         │
                   └──────────────────┴────────────────────┘
```

1. **Multi-Agent Unified Adapter Hub (35%):** Broadening telemetry ingestion beyond Claude Code to Cursor, GitHub Copilot CLI, OpenAI Operator, and Aider.
2. **Automated Budget Circuit Breakers (25%):** Real-time webhook alerting and automated API rate throttling when monthly departmental budget thresholds are approached.
3. **Enterprise Compliance & Security Certifications (25%):** SOC2 Type II certification and formal zero-trust audits for banking and healthcare software deployments.
4. **Community Documentation & Open-Source Growth (15%):** Turnkey Helm charts, Terraform AWS/GCP modules, and standardized developer onboarding tutorials.

### Ideal Grant Programs
- **Open Source DevTools Grants** (GitHub Accelerator, Mozilla Open Source Support)
- **Enterprise Software Seed & Angel Funding**
- **Cloud Startup Credits** (AWS Activate, Microsoft Founders Hub, Google for Startups)

---

## 🤝 Contact & Enterprise Pilots

We are actively onboarding design partner organizations and welcoming investor/grant inquiries:

- **Founder & Maintainer:** Tri Tue Nguyen ([@trituenguyen97](https://github.com/trituenguyen97))
- **GitHub:** [https://github.com/trituenguyen97/KS-Dashboard](https://github.com/trituenguyen97/KS-Dashboard)
- **Pilot Inquiries:** Submit an issue on GitHub or reach out directly via maintainer profile.
