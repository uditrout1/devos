# Functional Requirements Document
## LoopForge — Product Engineering Intelligence
**Version:** 0.1 (Draft)
**Date:** 2026-06-21
**Status:** Internal Working Document

---

## 1. System Overview

LoopForge consists of five functional subsystems that share a common data layer:

```
┌────────────────────────────────────────────────────────┐
│                    Developer UI                        │
│         (Next.js — chat, canvas, backlog, dashboard)   │
└────────────────────────┬───────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────┐
│                   Harness API                          │
│     (Node.js/Hono — REST + WebSocket + Webhooks)       │
└──┬──────────┬─────────────┬──────────────┬─────────────┘
   │          │             │              │
┌──▼──┐  ┌───▼───┐  ┌──────▼──────┐  ┌───▼──────────────┐
│Brain│  │Skills │  │  Workflow   │  │  SDLC / Backlog  │
│Store│  │Registry│ │  Runtime    │  │  Engine          │
└──┬──┘  └───────┘  └──────┬──────┘  └──────────────────┘
   │                       │
┌──▼───────────────────────▼──────────────────────────────┐
│               Data Layer                                │
│   Supabase (PostgreSQL + pgvector + Auth + Realtime)    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Feature: Project Brain

### FR-B-01: Repository Connection
**Description:** User connects a code repository to LoopForge. The system ingests and indexes the repository to build the project brain.

**User Story:**
> As a developer, I want to connect my GitHub repository to LoopForge so that the system understands my project without me explaining it.

**Functional Requirements:**
- System shall support GitHub OAuth repository connection
- System shall support local filesystem path connection
- System shall walk the repository file tree on initial connection
- System shall parse and extract: README, package.json / pubspec.yaml / build.gradle / Cargo.toml, entry points, config files, .env.example
- System shall detect the technology stack with >90% accuracy for: JavaScript/TypeScript, Python, Swift, Kotlin, Go, Rust, Java
- System shall generate a structured project knowledge object (JSON) containing: stack, key files, detected conventions, open TODOs from code comments
- System shall complete initial indexing within 5 minutes for repositories up to 100,000 files
- System shall display indexing progress to the user

**Acceptance Criteria:**
- [ ] GitHub OAuth flow completes and repo is listed in user's projects
- [ ] Stack detection correct for a standard React + Node.js project
- [ ] Indexing completes within 5 minutes for a 50K-file repo
- [ ] Project knowledge object contains: stack (array), entry_points (array), conventions (object), todos (array)

---

### FR-B-02: Context Loading at Session Start
**Description:** At the start of every session, the project brain is loaded and injected as context automatically.

**User Story:**
> As a developer, I want my session to start with full project context so I never have to re-explain my codebase to the AI.

**Functional Requirements:**
- System shall load the project knowledge object at session start
- System shall retrieve the most recent session summary (if one exists)
- System shall retrieve open high-priority backlog tickets (top 5)
- System shall perform a semantic search of context chunks relevant to the user's first message (if provided at session start)
- Context load shall complete within 10 seconds
- System shall display a "context loaded" indicator showing what was loaded

**Acceptance Criteria:**
- [ ] Session opens with project stack visible in context
- [ ] Open tickets appear in session context without user requesting them
- [ ] Context load time < 10 seconds measured from session creation to first token
- [ ] User can view what context was loaded via a context panel

---

### FR-B-03: Incremental Context Updates
**Description:** The project brain updates automatically as the project changes.

**User Story:**
> As a developer, I want the system's understanding of my project to stay current as I make changes, without manual re-indexing.

**Functional Requirements:**
- System shall watch connected repositories for file changes (webhook for GitHub; file system watcher for local)
- System shall re-index changed files within 60 seconds of a change event
- System shall update the project knowledge object when package.json, config files, or README change
- System shall NOT re-index unchanged files (differential update only)
- System shall append session summaries to project knowledge after each session ends

**Session Summary Generation:**
- At session end (user closes session or 30 minutes of inactivity), system shall generate a summary of: what was worked on, decisions made, files changed, open threads
- Summary shall be stored and loaded in subsequent sessions

**Acceptance Criteria:**
- [ ] Edit a file; context chunk updates within 60 seconds
- [ ] Session summary generated and visible in next session's context panel
- [ ] Re-indexing does not re-process unchanged files (verified via logs)

---

### FR-B-04: Context Retrieval (Semantic Search)
**Description:** Relevant context chunks are retrieved on demand during a session.

**User Story:**
> As a developer, I want the AI to automatically find relevant parts of my codebase when I ask a question, without me specifying file paths.

**Functional Requirements:**
- System shall embed all indexed file chunks using a text embedding model (dimension: 1536, model: text-embedding-3-small or equivalent)
- System shall store embeddings in pgvector
- System shall perform cosine similarity search on user queries
- System shall return top-K chunks (K configurable, default: 5)
- System shall apply metadata filters (file type, directory) when inferable from query
- System shall re-rank results using a cross-encoder if enabled (optional, adds latency)

**Acceptance Criteria:**
- [ ] Query "how does authentication work" returns auth-related files with >0.75 similarity
- [ ] Results ranked by relevance (manual spot-check)
- [ ] Retrieval completes within 2 seconds excluding re-ranking

---

## 3. Feature: Skill Discovery

### FR-S-01: Skill Registry
**Description:** The system maintains a registry of available skills (AI capabilities) with metadata enabling discovery.

**User Story:**
> As a developer, I want to browse all available AI capabilities so I know what tools are available to me.

**Functional Requirements:**
- System shall maintain a skills table with: id, name, description, trigger_keywords, prompt_template, required_tools, required_model_capabilities, author, is_public, version
- System shall ship with a minimum of 15 built-in skills including: debug, security-audit, code-review, ui-fix, test-generation, changelog, refactor, document, explain, optimize, plan-feature, investigate-bug, onboard-codebase, review-pr, generate-tests
- System shall provide a searchable skill browser in the UI
- System shall support skill versioning (semver)
- Team admins shall be able to disable specific skills org-wide

**Acceptance Criteria:**
- [ ] All 15 built-in skills visible in skill browser
- [ ] Keyword search returns relevant skills within 500ms
- [ ] Skills page shows: name, description, trigger keywords, author, last updated

---

### FR-S-02: Automatic Skill Recommendation
**Description:** Relevant skills are surfaced proactively based on what the developer is currently doing.

**User Story:**
> As a developer, I want the system to suggest relevant tools based on my current task so I discover capabilities I didn't know existed.

**Functional Requirements:**
- System shall embed the user's last 3 messages at the start of each turn
- System shall perform cosine similarity search against skill description embeddings
- System shall surface top 3 relevant skills if similarity score > 0.7
- Recommendations shall appear in a non-intrusive panel (not blocking the chat)
- User can activate a recommended skill with one click
- User can dismiss recommendations without affecting future suggestions

**Acceptance Criteria:**
- [ ] User mentions "I have a bug" → debug skill surfaced
- [ ] User mentions "before I merge" → security-audit and code-review skills surfaced
- [ ] Recommendations appear within 1 second of user message
- [ ] Dismissing a recommendation does not suppress other recommendations

---

### FR-S-03: Skill Activation and Execution
**Description:** A developer activates a skill, which configures the session context and tools for that capability.

**User Story:**
> As a developer, I want to activate a skill with one click and have the AI immediately apply that specialized approach to my task.

**Functional Requirements:**
- Activating a skill shall inject the skill's prompt template into the session context
- Activating a skill shall make the skill's required tools available in the session
- Activating a skill shall set the model to the minimum required capability for that skill (or higher if set by user)
- User shall be able to activate multiple skills in a session
- Skill execution shall be logged: which skill, which session, which user, duration, model used

**Acceptance Criteria:**
- [ ] Activating security-audit skill changes session behavior to security-focused analysis
- [ ] Skill activation logs appear in audit trail
- [ ] Multiple skills can be active simultaneously without conflict

---

### FR-S-04: Skill Authoring
**Description:** Developers and teams can create and publish their own skills.

**User Story:**
> As a developer, I want to create a custom skill for my team's specific workflow so everyone benefits from it.

**Functional Requirements:**
- System shall provide a skill editor UI with: name, description (with embedding preview), trigger keywords, prompt template (with variable substitution), tool selection, model requirements
- System shall validate prompt templates for required variables before saving
- System shall generate an embedding preview showing which user queries would trigger this skill
- Team-private skills shall be visible only to team members
- Public skill publication shall require admin approval (V2)

**Acceptance Criteria:**
- [ ] Create a skill, save it, and find it in the browser within 30 seconds
- [ ] Skill is automatically recommended when trigger keywords appear in conversation
- [ ] Template variables ({{file_name}}, {{stack}}) are substituted correctly at activation

---

## 4. Feature: Model Router

### FR-M-01: Multi-Provider Routing
**Description:** The system routes requests to the appropriate model and provider based on task, policy, and cost.

**User Story:**
> As a developer, I want my tasks automatically sent to the right model so I get good results without overpaying.

**Functional Requirements:**
- System shall support routing to: OpenRouter (cloud), Ollama (local/on-prem), direct provider APIs
- System shall classify task complexity on a 1–5 scale using a lightweight classifier model
- Complexity 1–2 (extraction, classification, reformatting) → route to small model (Qwen 7B, Llama 3.1 8B)
- Complexity 3 (code generation, explanation) → route to mid-tier model (Claude Haiku, GPT-4o Mini)
- Complexity 4–5 (reasoning, architecture, debugging) → route to frontier model (Claude Sonnet, GPT-4o)
- Routing decision shall be logged with reasoning
- User can override routing per message

**Acceptance Criteria:**
- [ ] "Rename this variable" classified as complexity 1, routed to small model
- [ ] "Investigate why my auth flow is failing" classified as complexity 4–5, routed to frontier
- [ ] User can select model manually per message
- [ ] Routing log shows: input complexity score, selected model, reason

---

### FR-M-02: Cost Tracking
**Description:** All AI model usage is tracked by cost, attributed to project and user.

**User Story:**
> As an engineering manager, I want to see exactly how much AI is costing us per project so I can manage our AI budget.

**Functional Requirements:**
- System shall log cost per API call (token count × model price)
- Costs shall be attributed to: user, project, session, workflow
- System shall provide a cost dashboard with: daily/weekly/monthly spend, per-project breakdown, per-user breakdown, model breakdown
- System shall support configurable spend limits per project and per user (soft warning + hard cap)
- When hard cap is reached, system shall downgrade to a cheaper model and notify the user

**Acceptance Criteria:**
- [ ] Cost dashboard shows spend broken down by project for the last 30 days
- [ ] Setting a $10/month project limit triggers a warning at $8 and blocks frontier model access at $10
- [ ] Cost data accurate to within 5% of actual provider billing (verified monthly)

---

### FR-M-03: Data Sensitivity Routing
**Description:** Requests containing sensitive data are routed to on-prem models, never to cloud APIs.

**User Story:**
> As an enterprise architect, I want to ensure that code classified as sensitive never leaves our infrastructure.

**Functional Requirements:**
- System shall support data classification labels on projects: public, internal, confidential, restricted
- Requests from projects labelled confidential or restricted shall only route to on-prem (Ollama) endpoints
- System shall display a "data stayed on-prem" indicator for such requests
- Admin shall configure data sensitivity rules in the org settings panel

**Acceptance Criteria:**
- [ ] Project labelled "restricted" — all requests route to Ollama, not OpenRouter
- [ ] Indicator visible in chat confirming on-prem routing
- [ ] Attempting to configure cloud routing for a restricted project is blocked with explanation

---

## 5. Feature: AI-Maintained Backlog

### FR-BK-01: Backlog Ingestion — GitHub Issues
**Description:** GitHub Issues for connected repositories are ingested and maintained in the LoopForge backlog.

**User Story:**
> As a developer, I want my GitHub Issues visible in LoopForge so the AI understands what work is outstanding.

**Functional Requirements:**
- System shall connect to GitHub Issues via OAuth with read/write permissions
- System shall sync all open issues on initial connection
- System shall receive issue events via GitHub webhook (created, updated, closed, labelled)
- System shall map GitHub labels to LoopForge ticket types: bug, feature, debt, security
- System shall create new GitHub issues when a LoopForge ticket is created
- System shall close GitHub issues when a LoopForge ticket is resolved

**Acceptance Criteria:**
- [ ] All open GitHub Issues appear in LoopForge backlog within 60 seconds of connection
- [ ] Creating a ticket in LoopForge creates a corresponding GitHub Issue
- [ ] Closing a GitHub Issue closes the LoopForge ticket within 60 seconds

---

### FR-BK-02: AI Prioritization
**Description:** Tickets are automatically scored and ranked by the AI based on impact, frequency, and blocking relationships.

**User Story:**
> As a team lead, I want the backlog automatically prioritized so I don't have to do it manually and it reflects current reality.

**Functional Requirements:**
- System shall calculate a priority score (0–100) for each ticket using: mention frequency across sources, number of affected users (if available), number of tickets blocked by this ticket, stakeholder weight (configurable per source)
- System shall generate a plain-English priority reason for each ticket
- Priority scores shall recalculate when: new feedback arrives mentioning the same issue, related tickets are opened or closed, a PR is merged that affects linked files
- User can manually override priority; manual overrides are preserved until a significant new signal arrives
- Backlog shall be sortable by: AI priority score, created date, type, status

**Acceptance Criteria:**
- [ ] Ticket with 5 reports in 7 days scores higher than ticket with 1 report in 30 days
- [ ] Priority reason is readable and references the signals used
- [ ] Manual priority override survives an AI recalculation for 7 days

---

### FR-BK-03: Automatic Ticket Updates from Code Activity
**Description:** Ticket status updates automatically when related code is committed or merged.

**User Story:**
> As a developer, I want tickets to update themselves when I commit code so I don't have to manually update Jira.

**Functional Requirements:**
- System shall monitor commit messages and PR titles for ticket references (e.g., "fixes #42", "closes LOOPFORGE-17")
- System shall update ticket status to "in progress" when a PR referencing the ticket is opened
- System shall update ticket status to "resolved" when a PR referencing the ticket is merged
- System shall post an automated comment on the ticket with: PR link, commit SHA, merged by, timestamp
- For tickets with no explicit reference, system shall use semantic similarity between commit message and ticket title to infer relationships (confidence threshold: 0.85)

**Acceptance Criteria:**
- [ ] PR with "fixes #42" in title → ticket #42 moves to in_progress on PR open, resolved on merge
- [ ] Semantic match correctly links "fix login timeout crash" commit to "Users experiencing crashes on login" ticket with >85% confidence
- [ ] Auto-comment posted with PR link within 60 seconds of PR event

---

### FR-BK-04: Backlog Health Monitoring
**Description:** The system proactively identifies and surfaces backlog health issues.

**User Story:**
> As a team lead, I want to know when the backlog is drifting so I can address it before it becomes useless.

**Functional Requirements:**
- System shall flag tickets with no activity in >30 days (configurable)
- System shall detect duplicate or highly similar tickets (similarity > 0.9) and suggest merging
- System shall detect contradictory tickets (e.g., "make onboarding shorter" and "add 3 more onboarding steps") and surface the conflict
- System shall detect tickets referencing deleted or significantly refactored files and flag as potentially stale
- Backlog health summary shall be available in the dashboard: stale count, duplicate candidates, conflicts

**Acceptance Criteria:**
- [ ] Ticket with no activity for 31 days appears in "Stale tickets" section
- [ ] Two tickets about the same issue detected as duplicates with merge suggestion
- [ ] Contradictory tickets surfaced in backlog health report

---

## 6. Feature: Multi-Agent Workflow Engine

### FR-W-01: Workflow Definition
**Description:** Workflows are defined as directed graphs of nodes (agents, tools, conditions, human checkpoints) and edges.

**User Story:**
> As a developer, I want to define a multi-step AI workflow visually so I don't have to write orchestration code.

**Functional Requirements:**
- System shall support the following node types: Agent (executes an AI task), Tool (executes a deterministic function), Condition (branches based on output evaluation), Merge (waits for parallel branches and combines results), Human Checkpoint (pauses for human decision), Trigger (entry point)
- System shall support the following edge types: Sequential (A → B), Parallel fan-out (A → [B, C, D]), Conditional (A → B if X, A → C if Y)
- Each Agent node shall be configurable: model, context slice (keys from project brain), tools available, system prompt, retry strategy, timeout, output schema
- System shall provide a visual canvas editor for workflow construction
- System shall support workflow import/export as JSON
- System shall validate workflows before saving: no cycles (except explicit loop constructs), all edges connected, required node fields populated

**Acceptance Criteria:**
- [ ] Create a 3-node sequential workflow in the canvas editor and save it
- [ ] Create a fan-out workflow with 3 parallel agents and a merge node
- [ ] Add a human checkpoint; workflow pauses there and resumes after approval
- [ ] Invalid workflow (disconnected node) cannot be saved; error message explains why

---

### FR-W-02: Workflow Execution
**Description:** Workflows execute reliably, durably, and with full observability.

**User Story:**
> As a developer, I want to run a multi-agent workflow and see exactly what each agent did, in real time.

**Functional Requirements:**
- System shall execute workflow nodes in the order and parallelism defined by the graph
- System shall write each node's output to the shared state store before executing the next node
- If the system restarts mid-workflow, execution shall resume from the last completed node
- System shall enforce timeouts per node; on timeout, apply the node's retry strategy
- Retry strategies: immediate retry (N times), exponential backoff, fallback to alternate model, fail and notify
- System shall stream workflow execution status via WebSocket: which node is running, which are complete, which are pending
- User shall see a live execution view on the workflow canvas: nodes animate as they execute

**Acceptance Criteria:**
- [ ] Run a 5-node workflow; progress visible in real-time on canvas
- [ ] Kill the server mid-workflow; restart server; workflow resumes from correct node
- [ ] Node timeout triggers retry; second attempt succeeds; log shows both attempts
- [ ] Parallel nodes start simultaneously (verified by timestamp in logs)

---

### FR-W-03: Context Management Between Agents
**Description:** Each agent in a workflow receives exactly the context it needs — no more, no less.

**User Story:**
> As a developer building a workflow, I want each agent to have the right context for its task without receiving irrelevant information that wastes tokens.

**Functional Requirements:**
- Each Agent node shall declare a context slice: an array of keys from the project brain and shared workflow state to inject
- The orchestrator shall assemble the context for each agent from: declared context slice + outputs from predecessor nodes + relevant project brain chunks (semantic search on node's task description)
- Agent outputs shall be written to the shared state with a node-scoped key
- Context injection shall not exceed a configurable max token limit (default: 4000 tokens); if exceeded, summarize
- The orchestrator shall never pass the full conversation history between agents — only summaries and structured state

**Acceptance Criteria:**
- [ ] Security agent in a PR Review workflow receives: changed files, not the full codebase
- [ ] Merge node receives outputs from all parallel agents in structured format
- [ ] Token count for agent context stays within configured limit

---

### FR-W-04: Human-in-the-Loop
**Description:** Workflows can pause at designated checkpoints awaiting a human decision before proceeding.

**User Story:**
> As a release manager, I want to approve a release after automated checks pass before the deployment proceeds.

**Functional Requirements:**
- Human Checkpoint node shall pause workflow execution indefinitely until resolved
- System shall send a notification (email + in-app) when a checkpoint is reached: what decision is needed, what the preceding agents determined, options available
- The notification shall include a link to a decision UI where the human can: approve (workflow continues), reject (workflow terminates), provide input (workflow continues with input injected into context)
- Checkpoint decisions shall be logged: who decided, what they decided, timestamp, any input provided
- Checkpoints shall expire after a configurable duration (default: 7 days); on expiry, workflow terminates with a notification

**Acceptance Criteria:**
- [ ] Workflow reaches human checkpoint; email notification sent within 60 seconds
- [ ] Approving from notification link resumes workflow within 30 seconds
- [ ] Decision logged with approver identity and timestamp
- [ ] Workflow expires after configured duration; expiry notification sent

---

### FR-W-05: Built-In Workflow Library
**Description:** LoopForge ships with a set of pre-built workflows covering common developer tasks.

**User Story:**
> As a developer, I want pre-built workflows for common tasks so I don't have to build everything from scratch.

**Built-In Workflows (V1):**

| Workflow | Trigger | Agents | Output |
|---|---|---|---|
| PR Review | PR opened (webhook) | Security Agent + Code Review Agent + Coverage Agent (parallel) → Risk Scorer | PR comments + pass/fail status |
| Bug Investigation | Manual / ticket created | Reproducer → [Code Analysis + Log Analysis] → Fix Proposer → Verifier | Fix suggestion + PR |
| Feature Planning | Manual | Requirements Extractor → Complexity Estimator → Task Breakdown → Ticket Creator | Backlog tickets |
| Release Prep | Manual / scheduled | [Changelog Agent + Coverage Agent + Security Agent] → Readiness Scorer → (Human Checkpoint) | Release notes + readiness report |
| Nightly Security Scan | Scheduled (nightly) | Dependency Scanner + SAST Agent + Secret Detector → Risk Report | Security report + tickets for findings |
| Codebase Onboarding | Repo connect | Architecture Mapper + Convention Extractor + Hot Path Identifier → Project Brain Writer | Updated project brain |

**Acceptance Criteria:**
- [ ] PR Review workflow triggers automatically on PR open via GitHub webhook
- [ ] PR Review completes and posts comment within 3 minutes for an average-size PR
- [ ] All 6 built-in workflows available in workflow library on first login

---

## 7. Feature: SDLC Integration

### FR-CI-01: PR Review Automation
**Description:** Every PR triggers an automated review covering security, code quality, and test coverage.

**User Story:**
> As a developer, I want my PRs automatically reviewed for security issues and code quality before I request a human review.

**Functional Requirements:**
- System shall receive PR open events via GitHub webhook
- System shall execute the PR Review workflow (FR-W-05) automatically on PR open
- Security check shall cover: OWASP Top 10 patterns, secret/key detection, dependency vulnerabilities (via npm audit / pip audit / equivalent), injection patterns
- Code review shall cover: deviations from project conventions (from project brain), obvious bugs, dead code, missing error handling
- Coverage check shall identify changed files with no corresponding test coverage
- Results shall be posted as inline PR comments on the relevant lines
- System shall post a summary comment with: overall risk level, findings count by severity, pass/fail per check
- Blocking behaviour shall be configurable: block PR merge on critical findings, warn on medium, pass on low

**Acceptance Criteria:**
- [ ] Commit a hardcoded API key in a PR; security check catches it as critical finding with line reference
- [ ] Commit code that violates project naming convention; code review flags it
- [ ] Summary comment posted within 3 minutes of PR open
- [ ] PR cannot be merged when critical security finding exists (if blocking enabled)

---

### FR-CI-02: Testing Intelligence
**Description:** The system maps code changes to relevant tests and provides intelligent test execution recommendations.

**User Story:**
> As a developer, I want to run only the tests relevant to my changes so I get fast feedback without waiting for the full test suite.

**Functional Requirements:**
- System shall build a file-to-test mapping from the project brain: which test files cover which source files
- On PR open, system shall identify changed source files and recommend the corresponding test files to run
- System shall detect tests that have failed non-deterministically in the past 30 runs with no code change — flagging them as flaky
- Flaky tests shall be quarantined: excluded from blocking checks but still run and reported separately
- For source files with no corresponding test file, system shall generate 3 test case suggestions (not full test files — suggestions for the developer)
- System shall report: tests recommended, tests run, pass/fail, flaky tests excluded, coverage delta

**Acceptance Criteria:**
- [ ] Change `SessionView.swift`; system recommends `SessionTests.swift` but not `VaultTests.swift`
- [ ] A test that failed 3 of last 10 runs with no code change is flagged as flaky
- [ ] Test generation suggests 3 test cases for an uncovered function, formatted as code comments

---

### FR-CI-03: Release Readiness Scoring
**Description:** Before every release, the system calculates a readiness score based on configurable criteria.

**User Story:**
> As a release manager, I want an objective readiness score before every release so the decision to ship is based on data, not gut feel.

**Functional Requirements:**
- Release readiness score shall be calculated from: test pass rate (weight: configurable), test coverage on changed files (weight: configurable), open critical/high tickets (weight: configurable), security scan result (weight: configurable), stakeholder sign-off status (weight: configurable)
- Score shall be on a 0–100 scale
- System shall generate a plain-English readiness report: score, breakdown by component, blocking items, recommended actions
- Configurable release threshold: default 85 (below threshold → blocked; above → approved)
- Score recalculates automatically when inputs change (test results, tickets, approvals)

**Acceptance Criteria:**
- [ ] Release with 2 open critical bugs scores below 85 and is blocked
- [ ] Resolving the critical bugs causes score to update within 60 seconds
- [ ] Readiness report lists each component's contribution to the score

---

### FR-CI-04: Changelog Generation
**Description:** Release changelogs are generated automatically from commits and closed tickets.

**User Story:**
> As a developer, I want the release changelog written automatically so I don't spend time on it before every release.

**Functional Requirements:**
- System shall collect: all commits since last release tag, all tickets closed since last release
- System shall classify each item as: user-facing feature, bug fix, performance improvement, security fix, internal/infrastructure (hidden by default)
- System shall generate changelog in two formats: technical (full commit + ticket detail) and user-facing (plain English summary of changes)
- Developer can edit the generated changelog before publishing
- Published changelog shall be stored and linked to the release record

**Acceptance Criteria:**
- [ ] Generate changelog for a 10-commit release; output contains user-facing and technical sections
- [ ] Internal/infrastructure commits excluded from user-facing section by default
- [ ] Edited changelog saved and linked to release

---

## 8. Data Models

### Core Tables

```sql
-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'starter',   -- starter | team | enterprise
  settings jsonb default '{}',
  created_at timestamptz default now()
);

-- Projects (one per repository)
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations,
  name text not null,
  repo_url text,
  repo_provider text,            -- github | gitlab | local
  stack jsonb,                   -- detected tech stack
  knowledge jsonb,               -- structured project knowledge
  data_classification text default 'internal',  -- public | internal | confidential | restricted
  settings jsonb default '{}',
  indexed_at timestamptz,
  created_at timestamptz default now()
);

-- Context chunks (embedded file segments)
create table context_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects,
  file_path text not null,
  content text not null,
  embedding vector(1536),
  chunk_index int,
  token_count int,
  file_hash text,                -- for differential re-indexing
  updated_at timestamptz default now()
);
create index on context_chunks using ivfflat (embedding vector_cosine_ops);

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects,
  user_id uuid references auth.users,
  context_loaded jsonb,          -- snapshot of what was injected at start
  summary text,                  -- generated at session end
  total_cost_usd numeric(10,6) default 0,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions,
  role text not null,            -- user | assistant | system
  content text not null,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  skills_active text[],
  created_at timestamptz default now()
);

-- Skills
create table skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations,  -- null = built-in
  name text not null,
  description text not null,
  embedding vector(1536),
  trigger_keywords text[],
  prompt_template text not null,
  required_tools jsonb,
  required_model_capability text,  -- small | medium | frontier
  author_id uuid references auth.users,
  is_public boolean default false,
  version text default '1.0.0',
  created_at timestamptz default now()
);
create index on skills using ivfflat (embedding vector_cosine_ops);

-- Tickets (backlog)
create table tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects,
  external_id text,              -- GitHub issue number
  external_url text,
  title text not null,
  description text,
  type text,                     -- feature | bug | debt | security
  status text default 'open',   -- open | in_progress | resolved | closed
  priority_score numeric(5,2),
  priority_reason text,
  sources jsonb default '[]',   -- [{type, ref, captured_at}]
  linked_files text[],
  linked_prs text[],
  manual_priority_override boolean default false,
  created_by text,               -- stakeholder | ai | developer
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflows
create table workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations,
  project_id uuid references projects,
  name text not null,
  description text,
  definition jsonb not null,     -- {nodes: [], edges: [], triggers: []}
  is_built_in boolean default false,
  is_public boolean default false,
  version text default '1.0.0',
  author_id uuid references auth.users,
  created_at timestamptz default now()
);

-- Workflow runs
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows,
  project_id uuid references projects,
  triggered_by text,             -- event type or user_id
  trigger_payload jsonb,
  status text default 'running', -- running | paused | completed | failed | cancelled
  current_node_id text,
  shared_state jsonb default '{}',
  completed_nodes jsonb default '{}',  -- {nodeId: {output, duration, model, cost}}
  human_checkpoints jsonb default '[]',
  total_cost_usd numeric(10,6) default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Pipeline runs
create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects,
  workflow_run_id uuid references workflow_runs,
  trigger text,                  -- pr | push | scheduled | manual
  ref text,                      -- branch or PR number
  commit_sha text,
  checks jsonb default '[]',     -- [{check_type, status, findings, duration}]
  readiness_score numeric(5,2),
  readiness_breakdown jsonb,
  status text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Releases
create table releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects,
  version text not null,
  changelog_technical text,
  changelog_user_facing text,
  readiness_score_at_release numeric(5,2),
  rollout_percentage int default 0,
  post_release_metrics jsonb,
  rolled_back boolean default false,
  released_by uuid references auth.users,
  created_at timestamptz default now()
);
```

---

## 9. Integration Specifications

### GitHub Integration
- **OAuth scopes required:** `repo`, `read:org`, `write:discussion`
- **Webhooks subscribed:** `push`, `pull_request`, `issues`, `issue_comment`, `release`
- **Webhook secret:** HMAC-SHA256 validated on every event
- **Rate limit handling:** Respect GitHub's 5000 req/hour limit; queue requests with exponential backoff on 429

### OpenRouter Integration
- **Base URL:** `https://openrouter.ai/api/v1` (OpenAI-compatible)
- **Auth:** Bearer token (org-level API key stored in secrets vault)
- **Headers required:** `HTTP-Referer`, `X-Title` (for OpenRouter analytics)
- **Model IDs:** use OpenRouter format e.g. `anthropic/claude-sonnet-4-5`, `openai/gpt-4o`, `qwen/qwen-2.5-72b-instruct`
- **Streaming:** SSE streaming supported and required for chat responses

### Ollama Integration
- **Base URL:** configurable per org (e.g., `http://localhost:11434`)
- **API:** OpenAI-compatible (`/v1/chat/completions`)
- **Health check:** `GET /api/tags` — list available models before routing
- **On-prem verification:** requests to Ollama endpoint shall be logged as "on-prem" in audit trail

---

## 10. Security Requirements

### FR-SEC-01: API Key Management
- API keys shall be stored encrypted at rest (AES-256) in a secrets vault table
- Keys shall never be returned in API responses or logged in plaintext
- Keys shall be scoped: org-level (shared) and user-level (personal)
- Key rotation shall be supported without downtime

### FR-SEC-02: Audit Logging
- Every AI API call shall generate an audit log entry: user_id, project_id, model, input_token_count, output_token_count, cost, timestamp
- Audit logs shall be immutable (append-only; no update or delete)
- Audit logs shall be retained for minimum 90 days
- Audit logs shall be exportable as CSV for compliance

### FR-SEC-03: PII Scrubbing
- System shall support configurable PII scrubbing rules per org
- Before sending any prompt to a cloud provider, the system shall apply scrubbing rules
- Scrubbed items: email addresses, phone numbers, names (configurable), credit card patterns, government ID patterns
- Scrubbed content shall be replaced with placeholder tokens (e.g., `[EMAIL_REDACTED]`)

### FR-SEC-04: Role-Based Access Control
| Role | Permissions |
|---|---|
| Org Admin | All permissions including billing, member management, model policy |
| Team Lead | Project settings, workflow publishing, backlog management |
| Developer | Sessions, skill activation, workflow execution, ticket creation |
| Stakeholder | Read-only backlog and release view, feedback submission |
| Billing | Billing and cost dashboard only |
