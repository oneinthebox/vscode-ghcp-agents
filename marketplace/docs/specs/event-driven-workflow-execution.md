# Event-Driven Workflow Execution for ORCH

> **Note:** This plan is also saved to `marketplace/docs/specs/event-driven-workflow-execution.md`

## Context

ORCH workflows (migration, feature creation, project recap) currently execute as synchronous request-response chains within a single Copilot Chat conversation. The user wants autonomous execution — say `@angular migrate to Angular 21` and have it run to completion with minimal intervention.

## Why the Current System Doesn't Work

### How it works today (request-response)

```
User: "@angular migrate to Angular 21"
  ↓
@angular coordinator (ONE conversation, ONE context window):
  Phase 1: scan deps         → accumulates context (~3K tokens)
  Phase 2: check compat      → accumulates context (~6K tokens)
  Phase 3: upgrade TS        → accumulates context (~12K tokens)
  Phase 4: upgrade Angular   → accumulates context (~20K tokens)
  Phase 5: standalone        → accumulates context (~30K tokens)
  ⚠ Context window saturated. Quality degrades.
  ⚠ Agent hits maxRequests limit. Stops.
  "Type @angular continue to proceed."
  Phase 6: control flow      → user must re-engage
  Phase 7: signals           → user must re-engage
  ...
```

**Five fundamental problems:**

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Context accumulation** | Every phase adds ~3-5K tokens to the conversation. By phase 5, the context is bloated with scan results, upgrade logs, and file diffs from phases 1-4 that are no longer relevant. The AI's quality degrades because it's processing 30K+ tokens of noise. |
| 2 | **Tool call limits** | VS Code Copilot allows 25-100 tool calls per turn (`chat.agent.maxRequests`). A migration phase that edits 50 files needs ~60 tool calls. The agent runs out of budget mid-phase. |
| 3 | **User must type "continue"** | After each turn exhausts its budget, the user must manually type `@angular continue` to re-engage. A 10-phase migration needs 5-10 manual interventions. This is the opposite of autonomous. |
| 4 | **No parallelism** | A project recap has 9 independent scan phases. Today they run sequentially in one conversation. With parallel execution, they could complete 4x faster. |
| 5 | **No recovery** | If the conversation crashes, all state is lost. The user starts over. There's no checkpoint between turns — no file records which phases completed. |

### Why event-driven solves each problem

| Problem | Event-driven solution |
|---------|----------------------|
| **Context accumulation** | Each phase runs in a **fresh context**. The prompt file contains only what that phase needs (~2K tokens). Previous phase outputs are stored in files, not conversation history. Phase 5 never sees phase 1's scan results. |
| **Tool call limits** | Script phases don't use Copilot at all — the relay runs them as child processes (zero tool calls). AI phases get the full tool budget because they start fresh. 100 tool calls for ONE phase instead of 100 shared across 10 phases. |
| **User intervention** | The relay automatically advances from phase to phase. Script phases need zero human input. AI phases need `@angular continue` only when the relay can't auto-trigger Chat (research spike). Best case: 0 clicks. Worst case: 3-5 clicks instead of 10+. |
| **Parallelism** | Independent events have no `depends_on` — the relay dispatches them simultaneously. 9 scan scripts run in parallel (4 at a time). A 10-minute sequential recap becomes 3 minutes. |
| **Recovery** | State lives in event JSON files. If the relay crashes, restart it — it reads all events, finds "running" ones, recovers them to "ready", and continues. If the conversation crashes, the relay is unaffected (it's a separate process). |

### Concrete comparison: 10-phase migration

| Metric | Today (request-response) | Event-driven |
|--------|-------------------------|--------------|
| User messages | 10+ ("continue" per phase) | 3-4 (for AI phases only) |
| Context per AI phase | 20-30K tokens (accumulated) | ~2K tokens (focused) |
| Tool calls per AI phase | 10-15 (shared budget) | 80-100 (full budget) |
| Script phases (scan, verify) | Run through AI (wastes tokens) | Run as child processes (zero tokens) |
| Parallel scan phases | Sequential (10 min) | Parallel 4-at-a-time (3 min) |
| Crash recovery | Start over | Resume from last completed phase |
| Total time (migration) | 30-45 min + user waiting | 15-20 min, mostly unattended |

## Architecture (Revised — No Extension)

```
User: "@angular migrate to Angular 21"
  ↓
@angular coordinator (in Copilot Chat):
  → matches "migrate" trigger → reads workflow YAML
  → runs: node .orch/scripts/relay/publish.js angular-migration.yaml '{"to":"21"}'
  → creates event files in .orch/workflow-state/events/run-{id}/
  → runs: orch relay start (background terminal)
  → tells user: "Workflow published. Relay running."
  ↓
Terminal Relay (background process — `orch relay start`):
  → polls .orch/workflow-state/events/ every 5s
  → script events: spawns child process, captures output, marks complete
  → parallel: up to 4 scripts simultaneously
  → AI events: writes .prompt.md, signals Copilot Chat (research spike needed)
  → monitors .complete.json markers from AI phases
  → resolves dependencies: unlocks next phases when deps complete
  → all done? triggers report generation, git tag
  ↓
Copilot Chat Agent (for AI phases):
  → receives focused prompt (one skill, one reference, one phase context)
  → executes the skill (edit files, run commands)
  → writes .complete.json marker when done
  → relay detects marker, advances workflow
```

**No VS Code extension changes.** The relay is a CLI process. The agent is Copilot Chat. Event files are the state machine. VS Code settings (autopilot, terminal auto-approve) enable autonomous tool chaining within each AI phase.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Relay host | Terminal process (CLI) — no extension |
| AI phase trigger | `code chat --mode agent --reuse-window` — CONFIRMED WORKING (VS Code 1.112+). Relay auto-sends prompts to Copilot Chat. Zero user intervention. |
| Parallelism | Yes — independent phases run simultaneously (scripts only; AI is single-threaded) |
| Completion detection | AI writes `.complete.json` marker file |
| State persistence | JSON event files in `.orch/workflow-state/events/` |

## Implementation Plan

### Step 0: Research Spike — COMPLETED

**Result:** `code chat` subcommand exists in VS Code 1.112+ and works:

```bash
# Send a prompt to Copilot Chat in agent mode
code chat --mode agent --reuse-window "@angular execute phase 3"

# With file context
code chat --mode agent --reuse-window --add-file {prompt-file} "@angular execute this phase"

# Pipe prompt from stdin
cat {prompt-file} | code chat --mode agent --reuse-window -
```

This means the relay can trigger AI phases programmatically. **No user intervention needed. No "continue" command. Fully autonomous.**

### Step 1: Event Store Module

**Create `.orch/scripts/relay/event-store.js`** (~100 lines)

```
Exports:
  createRunDir(runId) → creates .orch/workflow-state/events/{runId}/
  readEvent(runDir, eventId) → parses {eventId}.event.json
  writeEvent(runDir, event) → atomic write (write .tmp, rename)
  readAllEvents(runDir) → array of all events
  readManifest(runDir) → manifest.json
  writeManifest(runDir, manifest) → atomic write
  readActiveRun() → active-run.json (or null)
  writeActiveRun(runId) → writes pointer
  updateStatus(event, newStatus) → updates status + status_history array
```

Reuse: `report.js` pattern (progress to stderr, structured output to stdout)

### Step 2: Publisher

**Create `.orch/scripts/relay/publish.js`** (~150 lines)

```
Input: workflow YAML path + runtime context JSON
Output: run_id (stdout)

Logic:
  1. Parse workflow YAML
  2. Generate run_id: "run-" + ISO timestamp
  3. Create run directory
  4. For each phase in YAML:
     - Assign event_id: "001", "002", ...
     - Determine type: "script" (if skill has scripts/ dir) or "ai"
     - Resolve dependencies:
       - If phase has depends_on field → use it
       - Else → depends on previous phase (sequential default)
     - Set initial status: no deps = "ready", has deps = "queued"
     - Build prompt file for AI phases (prompt-builder.js)
     - Write event JSON
  5. Write manifest.json
  6. Write active-run.json
```

### Step 3: Prompt Builder

**Create `.orch/scripts/relay/prompt-builder.js`** (~100 lines)

```
Input: event object + workflow context
Output: writes {eventId}.prompt.md

Content of prompt:
  - Phase identity (event_id, workflow, skill)
  - Focused context (ONLY what this phase needs — ~2000 tokens)
  - Inherited data from completed dependencies
  - Skill instructions (from SKILL.md)
  - Version-appropriate reference (from resolver)
  - Success criteria
  - Completion protocol: "When done, write .complete.json at {path}"
```

### Step 4: Relay Core Loop

**Create `.orch/scripts/relay/relay.js`** (~200 lines)

```
The main poll loop:

every 5 seconds:
  1. Read active-run.json → get current run
  2. Read all events
  3. Check for .complete.json markers (AI phases that finished)
  4. Resolve dependencies: queued → ready (when all deps complete)
  5. Handle retries: retrying → ready (after backoff)
  6. Dispatch ready events:
     - Script: spawn child process (up to 4 parallel)
     - AI: signal Copilot Chat (research spike result) or set "awaiting-ai"
  7. Handle failures: retry up to 3x, then dead letter
  8. Check workflow completion: all done → trigger report + git tag
  9. Write updated state
```

Concurrency limits:
- Scripts: 4 parallel (configurable)
- AI: 1 at a time (Copilot Chat is single-threaded)

### Step 5: Monitor

**Create `.orch/scripts/relay/monitor.js`** (~80 lines)

```
Exports:
  getProgress(events) → { total, completed, failed, running, ready, queued, pct }
  isWorkflowComplete(events) → boolean
  triggerPostWorkflow(runDir, manifest) → collects results, invokes report, git tag
  writeLegacyState(manifest, events) → writes .orch/workflow-state/{name}.yaml for backward compat
```

### Step 6: Workflow YAML Updates

**Modify all 3 workflow YAMLs** to add optional `depends_on` and `execution_type`:

`angular-project-recap.yaml`:
- Phases 1-9 (scans): `depends_on: []` — all independent, run in parallel
- Phase 10 (explain): `depends_on: ["001","002",...,"009"]`
- Phase 11 (report): `depends_on: ["010"]`

`angular-migration.yaml`:
- All phases sequential: each depends on previous

`angular-new-feature.yaml`:
- Scan before → generate (sequential) → integrate (parallel) → verify → report

### Step 7: Agent Updates

**Modify `angular.agent.md`** — coordinator becomes publisher:
```
When triage = workflow mode:
  1. Run: node .orch/scripts/relay/publish.js <yaml> <context>
  2. Run: node .orch/scripts/relay/relay.js & (background)
  3. Report: "Workflow started. N phases published. Relay running."
```

**Modify `angular-planner.agent.md`, `angular-engineer.agent.md`, `angular-verifier.agent.md`:**
Add completion protocol section:
```
When invoked as part of an event-driven workflow (event_id in prompt):
  1. Execute the skill as instructed
  2. Write completion marker to the path specified in the prompt
  3. End your response
```

### Step 8: AI Dispatch via `code chat`

The relay dispatches AI phases using `code chat`:

```bash
# Relay runs this for each AI phase:
code chat --mode agent --reuse-window \
  --add-file .orch/workflow-state/events/{run-id}/{event-id}.prompt.md \
  "@angular Execute the phase described in the attached prompt. When done, write the completion marker."
```

The prompt file contains everything: skill instructions, version-appropriate reference, focused context (~2K tokens), success criteria, and the completion marker path. The agent executes in a fresh context window with full tool budget.

**No `/continue` skill needed.** The relay auto-triggers each AI phase.

### Step 9: Configuration

**Add to `.orch/config.yaml`:**
```yaml
relay:
  poll_interval_ms: 5000
  max_concurrent_scripts: 4
  max_concurrent_ai: 1
  script_timeout_sec: 300
  ai_timeout_sec: 600
  retry_backoff_sec: [10, 30, 60]
  ai_dispatch: auto        # auto | prompt-file (result of research spike)
  verbose: false
events:
  store_path: .orch/workflow-state/events
  retention_days: 30
  legacy_compat: true
```

### Step 10: VS Code Settings

**Create `.vscode/settings.json`:**
```json
{
  "chat.agent.enabled": true,
  "chat.autopilot.enabled": true,
  "chat.agent.maxRequests": 100,
  "chat.tools.terminal.enableAutoApprove": true,
  "chat.tools.terminal.autoApprove": {
    "ng": true, "nx": true, "npm": true, "npx": true, "node": true,
    "git add": true, "git commit": true, "git status": true,
    "rm": false, "kill": false, "git push": false, "git reset --hard": false
  },
  "chat.tools.edits.autoApprove": { "src/**": true, "libs/**": true, "apps/**": true, "**/.env": false },
  "chat.editing.autoAcceptDelay": 3000,
  "chat.tools.terminal.autoReplyToPrompts": true,
  "chat.customAgentInSubagent.enabled": true,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.agent.autoFix": true,
  "chat.checkpoints.enabled": true
}
```

### Step 11: .gitignore Update

Add event store runtime files to `.gitignore`

## Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `.orch/scripts/relay/event-store.js` | ~100 | Read/write event JSON with atomic writes |
| `.orch/scripts/relay/publish.js` | ~150 | Workflow YAML → event files + prompts |
| `.orch/scripts/relay/relay.js` | ~200 | Terminal relay poll loop |
| `.orch/scripts/relay/monitor.js` | ~80 | Workflow status + post-workflow triggers |
| `.orch/scripts/relay/prompt-builder.js` | ~100 | SKILL.md + context → focused .prompt.md |
| `.vscode/settings.json` | ~25 | Copilot autopilot + terminal auto-approve settings |
| `.vscode/settings.json` | ~25 | Recommended Copilot autopilot settings |

## Files to Modify

| File | Change |
|------|--------|
| `.github/agents/angular.agent.md` | Workflow section: publisher + relay instead of execution loop |
| `.github/agents/angular-planner.agent.md` | Add completion protocol |
| `.github/agents/angular-engineer.agent.md` | Add completion protocol |
| `.github/agents/angular-verifier.agent.md` | Add completion protocol |
| `.orch/config.yaml` | Add relay + events sections |
| `.orch/workflows/angular-project-recap.yaml` | Add depends_on for parallel scans |
| `.orch/workflows/angular-migration.yaml` | Add depends_on (sequential) |
| `.orch/workflows/angular-new-feature.yaml` | Add depends_on (mixed) |
| `.gitignore` | Add event store runtime paths |

## Existing Code to Reuse

| Pattern | Location | Reuse |
|---------|----------|-------|
| `report.js` (progress/result/error) | `.orch/scripts/lib/report.js` | All relay scripts |
| `resolve-pkg.js` (requireOrch) | `.orch/scripts/lib/resolve-pkg.js` | YAML parsing from .orch/node_modules |
| `check-stack.js` (atomic file write) | `.orch/hooks/check-stack.js` | event-store.js atomic writes |
| `resolver.yaml` (version-aware refs) | `.orch/references/angular/resolver.yaml` | prompt-builder loads version-appropriate docs |

## Verification

1. **Publish dry-run:** `node .orch/scripts/relay/publish.js .orch/workflows/angular-project-recap.yaml '{}' --dry-run` → 11 event files created, 9 with status "ready"
2. **Script execution:** Start relay, verify scan scripts run in parallel (check timestamps)
3. **Dependency resolution:** After scan scripts complete, verify phase 10 (explain) becomes "ready"
4. **AI phase:** Verify .prompt.md generated with correct focused context (~2000 tokens)
5. **Completion marker:** Write a test .complete.json manually → verify relay detects and advances
6. **Failure + retry:** Make a script exit(1) → verify retry after 10s backoff → dead letter after 3 attempts
7. **Resume:** Kill relay → restart → verify it recovers from saved state
8. **End-to-end:** Full recap workflow: scripts auto-run, user types `@angular continue` for AI phases, report generated

## User Experience (Target)

**10-phase migration — FULLY AUTONOMOUS:**
```
User: @angular migrate to Angular 21
Agent: "Workflow published. 10 phases. Relay starting..."

[everything below happens automatically — user watches]

Relay → Phase 1 (scan-deps):       node scan-deps.js              ✓ auto (2s)
Relay → Phase 2 (compatibility):    node matrix-lookup.js           ✓ auto (1s)
Relay → Phase 3 (upgrade-ts):       code chat "@angular upgrade TS" ✓ auto (45s)
Relay → Phase 4 (upgrade-angular):  code chat "@angular upgrade ng" ✓ auto (60s)
Relay → Phase 5 (standalone):       code chat "@angular migrate..." ✓ auto (90s)
Relay → Phase 6 (control-flow):     code chat "@angular migrate..." ✓ auto (60s)
Relay → Phase 7 (signals):          code chat "@angular migrate..." ✓ auto (90s)
Relay → Phase 8 (third-party):      code chat "@angular update..."  ✓ auto (45s)
Relay → Phase 9 (verify):           node scan-tests.js              ✓ auto (5s)
Relay → Phase 10 (report):          node render-report.js           ✓ auto (2s)

Agent: "Migration complete. Report at .orch/reports/migrate-report.html"
```

**1 user message. 0 "continue" clicks. 10 phases. ~7 minutes total.**
Script phases run as child processes (zero tokens). AI phases get fresh context via `code chat` (full tool budget each). Relay orchestrates everything.
