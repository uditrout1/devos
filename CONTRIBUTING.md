# Contributing to LoopForge

This document covers development setup, conventions, and how to extend LoopForge with new skills, workflows, context packs, spec generators, graph ingestion hooks, and eval suites.

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+

### Clone and install

```bash
git clone https://github.com/uditrout1/loopforge
cd loopforge
pnpm install
```

### Build

```bash
pnpm build                                    # build all packages
pnpm dev                                      # run gateway + UI in watch mode
pnpm --filter @loopforge/gateway dev          # gateway only
pnpm --filter apps/ui dev                     # UI only
```

### Environment

```bash
cp .env.example .env
# Minimum: set OPENROUTER_API_KEY
# For on-prem: set OLLAMA_BASE_URL
# For persistence: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
```

---

## Monorepo Structure

```
packages/
  core/       — shared types only, no implementations, no runtime deps
  brain/      — repo indexer, chunker, context loader, built-in context packs
  router/     — model routing (OpenRouter + Ollama), complexity tiers, data classification
  skills/     — skill registry, built-in skills, keyword recommender, capability gap advisor
  workflows/  — multi-agent workflow engine, built-in workflows, epic decomposer
  backlog/    — GitHub Issues integration, ticket classification, AI prioritization
  adr/        — ADR extraction and storage
  spec/       — PRD/architecture/technical spec generation and approval workflows
  vision/     — Visual Context Engine: screenshots, Figma, design-to-code linking
  graph/      — Product Engineering Knowledge Graph: lineage, impact analysis, traceability
  evals/      — Eval Engine: evaluation definitions, runs, scoring, human feedback
  db/         — Supabase persistence adapter (pgvector for embeddings)
  gateway/    — Hono HTTP gateway (port 18790), all routes, auth middleware
apps/
  ui/         — Next.js 15 developer UI (chat, skill browser, pack selector, graph explorer)
```

**Package dependency order:**
```
core ← brain, router, skills, backlog, adr, spec, vision, graph, evals ← workflows ← gateway
```

---

## Conventions

### Code

- TypeScript strict mode throughout (`strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`)
- No `any` — use `unknown` and narrow
- Prefer `node:` protocol for built-in imports (`node:crypto`, `node:fs/promises`)
- No comments explaining what code does — only why if genuinely non-obvious
- No unused variables, no dead code
- Spread-conditional pattern for optional fields: `...(x !== undefined ? { x } : {})`

### Packages

- Each package has a single responsibility
- `@loopforge/core` exports types only — no runtime dependencies
- Provider implementations (OpenRouter, Ollama) are swappable behind the same interface
- New providers go in `packages/router/src/providers/`
- Graph ingestion side effects go in the calling package — `@loopforge/graph` is called from spec/adr/backlog/vision/brain, not the reverse

### Git

- Branch names: `feat/description`, `fix/description`, `chore/description`
- Commit messages: imperative present tense (`add Gemini provider`, not `added` or `adds`)
- One logical change per commit
- PRs should be small and independently mergeable

---

## Adding a Skill

Skills live in `packages/skills/src/built-in.ts`. A skill requires:

```typescript
{
  id: "unique-kebab-id",
  name: "Human Readable Name",
  description: "One sentence — used for similarity search. Be specific.",
  triggerKeywords: ["keyword1", "keyword2"],
  promptTemplate: `Your skill's system prompt here.`,
  requiredTools: [],
  requiredModelCapability: "small" | "medium" | "frontier",
  isPublic: true,
  version: "1.0.0",
  createdAt: new Date(),
}
```

After adding: rebuild and verify the skill appears in `GET /skills` and keyword matching works.

Skills that require frontier models should justify the requirement — the default preference is the lowest tier that produces acceptable output.

---

## Adding a Workflow

Workflows live in `packages/workflows/src/built-in/`. Each workflow is a directed agent graph.

1. Create `packages/workflows/src/built-in/<your-workflow>.ts`
2. Export a `WorkflowDefinition` (type in `@loopforge/core`):

```typescript
export const myWorkflow: WorkflowDefinition = {
  id: "my-workflow",
  name: "Human Readable Name",
  description: "What this workflow does and when to use it.",
  steps: [
    {
      id: "step-1",
      agentRole: "...",
      inputs: ["$initial"],
      outputs: ["step1_result"],
      modelTier: "medium",
    },
  ],
}
```

3. Register it in `packages/workflows/src/built-in/index.ts`

---

## Adding a Context Pack

Context packs live in `packages/brain/src/packs/`. A pack is a curated slice of context loaded at session start.

1. Create `packages/brain/src/packs/<pack-id>.ts`
2. Export a `ContextPack`:

```typescript
export const authPack: ContextPack = {
  id: "auth",
  name: "Authentication",
  description: "Auth patterns, session handling, token flows.",
  fileGlobs: ["**/auth/**", "**/middleware/auth*", "**/session*"],
  systemPromptAddition: `Focus on the project's authentication conventions.`,
}
```

3. Register it in `packages/brain/src/packs/index.ts`

---

## Adding a Spec Generator

Spec generators live in `packages/spec/src/generators/`. LoopForge ships generators for PRDs, architecture docs, and technical specs.

1. Create `packages/spec/src/generators/<type>.ts`
2. Implement the generator and register it in `packages/spec/src/generators/index.ts`

Approved specs propagate requirement nodes and edges into the Knowledge Graph automatically.

---

## Adding a Graph Ingestion Hook

When a new entity type is introduced (a new package, a new domain object), add an ingestion function in `packages/graph/src/ingestion.ts`:

```typescript
export async function ingestMyEntity(
  entity: MyEntity,
  store: GraphStore,
): Promise<void> {
  const node: GraphNode = {
    id: `my_entity:${entity.id}`,
    projectId: entity.projectId,
    entityType: "my_entity_type",
    title: entity.name,
    metadata: { status: entity.status },
    sourceSystem: "my-package",
    sourceId: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
  await store.upsertNode(node)
  // Add edges for relationships
}
```

Then call it as a non-blocking side effect in the package that owns the entity:

```typescript
// Non-blocking — graph is a derived projection, not the source of truth
ingestMyEntity(entity, graphStore).catch(() => {})
```

---

## Adding an Eval Suite

Eval suites live in `packages/evals/src/built-in-suites.ts`. A suite is a named collection of evaluation criteria applied together:

```typescript
export const myEvalSuite: EvalSuite = {
  id: "my-suite",
  name: "My Review Suite",
  evaluationIds: ["security-review", "performance-check"],
  passingThreshold: 0.8,
}
```

Register it and add the suite ID to any workflow node that should gate on it.

---

## Adding a Model Provider

Providers live in `packages/router/src/providers/`. Each provider must:

1. Accept `messages: Message[]`, a capability tier, and provider-specific config
2. Return a `ModelResponse` matching the type in `@loopforge/core`
3. Handle rate limits (429) with exponential backoff internally
4. Serialize `MessageContent` correctly — string for text-only, multipart array for vision

Wire the new provider into `packages/router/src/router.ts`.

---

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes — keep scope narrow
3. Ensure `pnpm build` passes with zero errors
4. Open a PR with a clear title and description of what changed and why
5. A maintainer will review within a few days

For larger changes (new packages, new workflow types, major refactors), open a Discussion first to align on approach before writing code.

---

## Reporting Bugs

Use the [bug report template](https://github.com/uditrout1/loopforge/issues/new). Include:

- What you did
- What you expected
- What actually happened
- LoopForge version and Node.js version

---

## Code of Conduct

Be direct, respectful, and constructive. We are here to build good software together.
