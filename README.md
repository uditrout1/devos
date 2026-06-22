# LoopForge

**The brain for your project.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/uditrout1/loopforge/actions/workflows/ci.yml/badge.svg)](https://github.com/uditrout1/loopforge/actions/workflows/ci.yml)

LoopForge is a **Product Engineering Intelligence** platform. It is not a coding assistant. It is the persistent brain your entire product engineering team thinks through — connecting business intent, architecture decisions, implementation, and quality outcomes into a single living graph.

---

## Platform Intelligence Stack

```
Business Intent (PRD)
        ↓ REQUIRES
Requirements ──────────────────── VALIDATED_BY ──→ Evaluations
        ↓ DEFINES                                        ↓ SCORES
Specifications ── GENERATES ──→ ADRs              Implementation
        ↓                             ↓ APPROVES
        └─────────── IMPLEMENTS ──→ Code / Files
                                        ↓ INCLUDED_IN
                                   Pull Requests ── TAGGED_IN ──→ Releases

All entities connected through the Product Engineering Knowledge Graph.
LoopForge becomes your system of record for knowledge, decisions, and judgment.
```

---

## What LoopForge Is NOT / What LoopForge IS

| NOT | IS |
|---|---|
| A coding copilot | A full product engineering intelligence layer |
| A chat wrapper around an LLM | A persistent project brain with indexed memory |
| A one-model solution | An intelligent model router (small → frontier, cloud → on-prem) |
| A task tracker | An AI-maintained backlog with GitHub integration |
| A script runner | A multi-agent workflow engine |
| A documentation generator | A spec-driven development system with approval gates |
| A design viewer | A visual context engine that links designs to code |
| A search index | A traversable knowledge graph with lineage and impact analysis |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        LoopForge Gateway                           │
│                         (Hono · :18790)                            │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────────┤
│ Projects │ Sessions │ Backlog  │Workflows │Specs/ADR │   Graph    │
│  +Packs  │ +Vision  │ +GitHub  │ +Decomp  │+Approval │  Explorer  │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬──────┘
     │          │          │          │          │           │
     ▼          ▼          ▼          ▼          ▼           ▼
 @lf/brain  @lf/router @lf/backlog @lf/wf  @lf/spec    @lf/graph
                                           @lf/adr
                                           @lf/vision
                                               │
                                  All write to ↓
                          ┌──────────────────────────┐
                          │   Knowledge Graph         │
                          │   (graph_nodes +          │
                          │    graph_edges)           │
                          └───────────┬──────────────┘
                                      ↓
                               Supabase + pgvector
```

### Packages

| Package | Responsibility |
|---|---|
| `@loopforge/core` | Shared TypeScript types — no implementations, no runtime deps |
| `@loopforge/brain` | Repo indexer, chunker, context loader, built-in context packs |
| `@loopforge/router` | Model routing: OpenRouter (cloud) + Ollama (on-prem), complexity tiers, data classification |
| `@loopforge/skills` | 8 built-in skills, keyword recommender, capability gap advisor |
| `@loopforge/workflows` | Multi-agent workflow engine, 4 built-in workflows, epic decomposer |
| `@loopforge/backlog` | GitHub Issues integration, ticket classification, AI prioritization |
| `@loopforge/adr` | Architecture Decision Record extraction and storage |
| `@loopforge/spec` | PRD, architecture doc, and technical spec generation with approval workflows |
| `@loopforge/vision` | Visual Context Engine — screenshots, Figma, wireframes linked to code |
| `@loopforge/graph` | Product Engineering Knowledge Graph — lineage, impact analysis, traceability |
| `@loopforge/evals` | Eval Engine — converts requirements and standards into executable quality criteria |
| `@loopforge/db` | Supabase persistence adapter (pgvector for embeddings) |
| `@loopforge/gateway` | Hono HTTP gateway (port 18790), all routes, auth middleware |
| `apps/ui` | Next.js 15 developer UI — chat, skill browser, pack selector, graph explorer, cost dashboard |

**Package dependency order:**
```
core ← brain, router, skills, backlog, adr, spec, vision, graph, evals ← workflows ← gateway
```

---

## Features by Lifecycle Stage

### Spec
- **Spec-Driven Development** — generate PRDs, architecture docs, and technical specs via `POST /specs/:projectId/generate`
- **Approval workflows** — specs must be approved before downstream tasks are created
- **ADR extraction** — architectural decisions captured automatically from sessions; exportable as markdown
- **Eval generation** — approved specs can generate evaluation criteria from requirements automatically

### Code
- **Project Brain** — index a repo once; every session starts fully loaded with stack detection, conventions, and TODO surfacing
- **Context Packs** — curated context slices per task type (auth, database, API, UI, etc.) loaded at session start via `packId`
- **Capability Gap Advisor** — surfaces expertise gaps proactively (security, a11y, performance, testing, architecture, docs)
- **8 built-in skills** — `debug`, `security-audit`, `code-review`, `test-generation`, `ui-fix`, `plan-feature`, `explain`, `changelog`

### Design
- **Visual Context Engine** — upload a screenshot or paste a Figma URL; LoopForge analyzes UX issues, accessibility gaps, and copy problems, then links findings directly to source files
- **Design-to-code linking** — component names detected in visual analysis are matched against indexed code chunks
- **Multimodal sessions** — attach images directly to session messages; the frontier model reasons over code and visual context together

### Review
- **Multi-Agent Workflows** — PR review, bug investigation, release prep, nightly security scan
- **Intelligent Model Routing** — complexity-based tier selection: simple tasks → small model (Qwen 7B), code gen → medium, debugging/architecture → frontier
- **Data Classification Enforcement** — confidential/restricted projects automatically routed to on-prem Ollama; data never leaves your network
- **Eval Engine** — structured evaluation suites with AI scoring, human feedback capture, and regression detection

### Release
- **Epic Decomposer** — `POST /projects/:id/decompose` turns an epic description into sprint-ready tickets with file links pre-populated
- **AI-Maintained Backlog** — GitHub Issues integration, AI prioritization, health checks via `GET /backlog/tickets/:projectId`
- **GitHub Webhook** — live ticket sync on push/PR events via `POST /backlog/webhook/github`

### Learn
- **Product Engineering Knowledge Graph** — traversable graph connecting PRDs, requirements, specs, ADRs, code files, tickets, PRs, evaluations, and visual assets. Answer: "What breaks if this requirement changes?", "Which ADR approved this service?", "What led to this code existing?"
- **ADR Store** — all architectural decisions queryable and exportable per project
- **Cost Dashboard** — token usage and cost breakdown by session, project, and model in the UI

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/uditrout1/loopforge && cd loopforge && pnpm install

# 2. Configure
cp .env.example .env
# Set at minimum: OPENROUTER_API_KEY

# 3. Run
pnpm dev
# Gateway: http://localhost:18790
# UI:      http://localhost:3000
```

### Connect a project

```bash
# Connect a repo
curl -X POST http://localhost:18790/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app", "repoPath": "/path/to/repo"}'

# Start a session with a context pack
curl -X POST http://localhost:18790/sessions \
  -H "Content-Type: application/json" \
  -d '{"projectId": "<id>", "packId": "auth"}'

# Analyze a screenshot
curl -X POST http://localhost:18790/vision/<projectId>/screenshot \
  -H "Content-Type: application/json" \
  -d '{"name": "checkout flow", "base64": "<base64>", "mediaType": "image/png", "question": "What UX issues do you see?"}'

# Query the knowledge graph
curl http://localhost:18790/graph/<projectId>/nodes/<nodeId>/downstream
```

---

## API Reference

All routes require `X-API-Key: <LOOPFORGE_API_KEY>` when `HOST != 127.0.0.1`.

### Core

| Method | Route | Description |
|---|---|---|
| `POST` | `/projects` | Connect a repo |
| `POST` | `/sessions` | Start a session (optional `packId`) |
| `POST` | `/sessions/:id/messages` | Send a message → AI response + skill recommendations + capability gaps |
| `POST` | `/projects/:id/decompose` | Decompose an epic into sprint-ready tickets |

### Specs & ADRs

| Method | Route | Description |
|---|---|---|
| `POST` | `/specs/:projectId/generate` | Generate PRD / architecture / technical spec |
| `POST` | `/specs/:projectId/:id/approve` | Approve a spec |
| `GET` | `/adrs/:projectId` | List ADRs for a project |
| `GET` | `/adrs/:projectId/export` | Export all ADRs as markdown |

### Knowledge Graph

| Method | Route | Description |
|---|---|---|
| `GET` | `/graph/:projectId/summary` | Node and edge counts by type |
| `GET` | `/graph/:projectId/nodes` | List nodes, filterable by `?type=` |
| `GET` | `/graph/:projectId/nodes/:nodeId` | Node with all edges |
| `GET` | `/graph/:projectId/nodes/:nodeId/upstream` | Lineage — what caused this to exist |
| `GET` | `/graph/:projectId/nodes/:nodeId/downstream` | Impact — what changes if this changes |
| `GET` | `/graph/:projectId/trace` | Shortest path between `?from=&to=` |
| `GET` | `/graph/:projectId/search` | Full-text search over node titles |
| `POST` | `/graph/:projectId/nodes` | Manually create a node |
| `POST` | `/graph/:projectId/edges` | Manually create an edge |

### Backlog & Workflows

| Method | Route | Description |
|---|---|---|
| `GET` | `/backlog/tickets/:projectId` | Prioritized ticket list |
| `POST` | `/backlog/webhook/github` | GitHub webhook receiver |
| `GET` | `/workflows` | List available workflows |
| `POST` | `/workflows/:id/runs` | Start a workflow run |

### Visual Context

| Method | Route | Description |
|---|---|---|
| `POST` | `/vision/:projectId/screenshot` | Analyze a screenshot → structured UX + a11y + code feedback |
| `POST` | `/vision/:projectId/figma` | Analyze a Figma URL |
| `POST` | `/vision/:projectId/assets/:id/ask` | Follow-up question on an existing visual asset |
| `GET` | `/vision/:projectId/assets` | List visual assets for a project |

---

## Environment Variables

```bash
# Model routing
OPENROUTER_API_KEY=         # Cloud model access (required for cloud tiers)
OLLAMA_BASE_URL=            # On-prem model endpoint (default: http://localhost:11434)

# Gateway
PORT=18790
HOST=127.0.0.1              # Set to 0.0.0.0 for remote access (requires LOOPFORGE_API_KEY)
LOOPFORGE_API_KEY=          # Required when HOST != 127.0.0.1
ALLOWED_REPO_ROOTS=         # Colon-separated allowed repo paths
CORS_ORIGINS=               # Comma-separated allowed origins

# Persistence
SUPABASE_URL=               # pgvector-backed persistence (production)
SUPABASE_SERVICE_ROLE_KEY=

# GitHub integration
GITHUB_WEBHOOK_SECRET=      # For GitHub webhook verification
```

---

## Deployment

### Docker Compose

```yaml
services:
  gateway:
    build: .
    ports:
      - "18790:18790"
    environment:
      HOST: 0.0.0.0
      PORT: 18790
      LOOPFORGE_API_KEY: ${LOOPFORGE_API_KEY}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      OLLAMA_BASE_URL: http://ollama:11434
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama

  ui:
    build: apps/ui
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_GATEWAY_URL: http://gateway:18790

volumes:
  ollama_data:
```

For confidential/restricted workloads, omit `OPENROUTER_API_KEY` — all requests fall back to Ollama automatically.

---

## Roadmap

### Shipped
- [x] Project brain (repo indexing + context loading)
- [x] Context packs (curated per task type)
- [x] Skill registry, keyword recommender, capability gap advisor
- [x] Multi-provider model routing (OpenRouter + Ollama), complexity tiers, data classification
- [x] Multi-agent workflow engine + 4 built-in workflows
- [x] Epic decomposer
- [x] GitHub Issues backlog integration + AI prioritization
- [x] ADR extraction and storage
- [x] Spec-driven development (PRD / architecture / technical spec + approval)
- [x] Supabase persistence + pgvector semantic search
- [x] Next.js 15 developer UI
- [x] Visual Context Engine (screenshots, Figma, design-to-code linking, UX/a11y analysis)

### In Progress
- [ ] **Product Engineering Knowledge Graph** — connects requirements, decisions, implementation, and quality outcomes; lineage tracing, impact analysis, traceability queries
- [ ] **Eval Engine** — converts requirements and standards into machine-executable evaluation criteria; AI scoring, human feedback loop, regression detection

### Coming
- [ ] Workflow marketplace — community-contributed workflow definitions
- [ ] Slack / email feedback ingestion into backlog
- [ ] PR review workflow with security scoring and staged rollout gate
- [ ] Workflow visual builder (drag-and-drop agent graph)
- [ ] MCP server mode — expose LoopForge as an MCP server to any compatible client
- [ ] Figma API integration — pull component trees directly without screenshots

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, conventions, and how to add skills, workflows, context packs, and spec generators.

Found a bug? [Open an issue](https://github.com/uditrout1/loopforge/issues/new).
Have a feature idea? [Start a discussion](https://github.com/uditrout1/loopforge/discussions).

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built by the LoopForge contributors.
