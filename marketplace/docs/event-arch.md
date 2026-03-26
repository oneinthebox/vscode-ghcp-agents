# ORCH Event-Driven Architecture

How the event-driven workflow execution maps to traditional event-driven concepts — using only the filesystem. No databases, no Kafka, no APIs.

## The Flow

```
USER: "@angular recap this project --auto"
         │
         ▼
┌─ PLAN ────────────────────────────────────────────────┐
│ Hook: workflow-trigger.sh intercepts the message       │
│ Runs: publish.js reads angular-project-recap.yaml      │
│ Creates: 11 event files (the plan)                     │
│ Location: .orch/workflow-state/events/run-xxx/         │
│   001.event.json  { status: "ready" }                  │
│   002.event.json  { status: "ready" }                  │
│   ...                                                  │
│   010.event.json  { status: "queued", depends_on:[...]}│
│   manifest.json   { status: "running" }                │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌─ OUTBOUND STORE ──────────────────────────────────────┐
│ = The event files on disk                              │
│ Each .event.json IS a queue entry                      │
│ Status field is the queue position:                    │
│   "ready"    = in the queue, waiting for pickup        │
│   "queued"   = not yet eligible (deps not met)         │
│   "running"  = picked up by relay                      │
│   "complete" = done                                    │
│                                                        │
│ Also: active-run.json = pointer to current run         │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌─ RELAY (polls every 5s) ──────────────────────────────┐
│ = relay.js (background terminal process)               │
│                                                        │
│ Every 5 seconds:                                       │
│   1. Read all .event.json files                        │
│   2. Check .complete.json markers (AI done?)           │
│   3. Resolve deps: queued → ready (when deps met)      │
│   4. Dispatch ready events:                            │
│      - Script: spawn child process                     │
│      - AI: code chat --mode agent                      │
│   5. Handle failures: retry / rollback / skip          │
│   6. Check: all done? → trigger report                 │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌─ QUEUE (the "ready" events) ──────────────────────────┐
│ = Events with status "ready" in .event.json            │
│ The relay picks them up on each poll cycle              │
│                                                        │
│ Script events:  relay spawns node process directly     │
│ AI events:      relay runs code chat --mode agent      │
│                                                        │
│ Concurrency: 4 scripts parallel, 1 AI at a time       │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌─ CONSUMERS (skills/scripts) ──────────────────────────┐
│ Script: node scan-deps.js → writes .output.json        │
│ AI:     code chat @angular → writes .complete.json     │
│                                                        │
│ Each consumer:                                         │
│   1. Reads its event context                           │
│   2. Does the work                                     │
│   3. Writes result (.output.json or .complete.json)    │
│   4. Dies (no persistent state)                        │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌─ STATUS UPDATE ───────────────────────────────────────┐
│ Relay detects .output.json or .complete.json           │
│ Updates .event.json: status "running" → "complete"     │
│ Resolves dependents: queued → ready                    │
│ Writes legacy .orch/workflow-state/{name}.yaml         │
│                                                        │
│ When ALL events terminal:                              │
│   → monitor.js collects all phase outputs              │
│   → recap-report-builder.js generates HTML report      │
│   → Git tag applied                                    │
│   → active-run.json cleared                            │
│   → Relay exits                                        │
└───────────────────────────────────────────────────────┘
```

## Concept Mapping

| Event-driven concept | Our implementation | File/Location |
|---------------------|-------------------|---------------|
| **Plan** | publish.js creates event files from workflow YAML | `.event.json` files in run directory |
| **Outbound store** | The events directory on disk | `.orch/workflow-state/events/run-xxx/` |
| **Relay** | relay.js polls every 5s | Background terminal process |
| **Queue** | Events with `status: "ready"` | `.event.json` status field |
| **Consumer** | Scripts (node) or AI (code chat) | Child processes / Copilot Chat sessions |
| **Status update** | Relay reads .output.json/.complete.json, updates .event.json | File writes |
| **Monitor** | monitor.js checks if all events are terminal | Part of relay poll loop |
| **Report** | Dedicated builder reads all outputs | `.orch/reports/*.html` |

## Event Lifecycle

```
created → queued → ready → running → complete
                                   → failed → retrying → ready (retry)
                                             → dead (max retries)
                → skipped (dependency failed + on-failure: continue)
```

## Files Per Event

Each phase produces a set of files in the run directory:

| File | Written by | Purpose |
|------|-----------|---------|
| `{id}.event.json` | publish.js (created), relay.js (updated) | Event state, identity, dependencies, result |
| `{id}.prompt.md` | prompt-builder.js | AI phase instructions (lazy loading, focused context) |
| `{id}.output.json` | relay.js (captures script stdout) | Script phase output data |
| `{id}.complete.json` | AI agent (writes when done) | AI phase completion marker + collected data |
| `manifest.json` | publish.js (created), monitor.js (updated) | Workflow-level metadata, final status |
| `collected-all.json` | monitor.js | Aggregated data from all phases (for report) |
| `active-run.json` | publish.js (created), monitor.js (cleared) | Pointer to the active run (at workflow-state/ level) |

## How Each Actor Works

### Publisher (publish.js)

Reads a workflow YAML → creates one `.event.json` per phase → sets dependencies → marks initial phases as "ready" → writes manifest + active-run pointer.

```bash
node .orch/scripts/relay/publish.js .orch/workflows/angular-project-recap.yaml '{"to":"21"}'
```

Can also be invoked by compose-plan.js for dynamic (non-YAML) plans.

### Relay (relay.js)

Runs as a background process. Polls every 5 seconds. Dispatches ready events. Detects completion. Advances the workflow.

```bash
node .orch/scripts/relay/relay.js         # safe mode (pauses for AI phases)
node .orch/scripts/relay/relay.js --auto  # auto mode (dispatches everything)
```

**Safe mode (default):** Script phases auto-dispatch. AI phases pause with `status: "awaiting-approval"`. User approves via `@angular approve` or `@angular approve-all`.

**Auto mode:** Everything dispatches automatically. AI phases sent to Copilot Chat via `code chat --mode agent --reuse-window`.

### Script Consumer

The relay spawns the script as a child process:
```
relay → spawn('node', ['scan-deps.js', projectRoot])
     → captures stdout as JSON
     → writes to {id}.output.json
     → updates event status to "complete"
```

Script has zero awareness of the event system. It reads the project, outputs JSON. The relay wraps it.

### AI Consumer

The relay triggers Copilot Chat:
```
relay → code chat --mode agent --reuse-window --add-file {id}.prompt.md "@angular ..."
     → AI reads prompt, executes skill, writes files
     → AI writes {id}.complete.json (completion protocol in the prompt)
     → relay detects marker on next poll, updates event status
```

The AI's only contract: write a `.complete.json` file when done.

### Monitor (monitor.js)

Called by the relay when all events reach a terminal state (complete, dead, skipped):
1. Reads all `.output.json` and `.complete.json` files
2. Aggregates into `collected-all.json`
3. Routes to the appropriate report builder (recap, migrate, create, docs, local)
4. Writes HTML report to `.orch/reports/`
5. Applies git tag
6. Clears `active-run.json`

## Hook-Based Trigger

The workflow is triggered BEFORE the LLM processes the user's message, via a `userPromptSubmitted` hook:

```
User types: "@angular recap this project --auto"
  ↓
Hook: workflow-trigger.sh
  → Reads prompt from stdin JSON
  → Matches "recap" against trigger patterns
  → Runs publish.js (creates events)
  → Starts relay.js in background
  → Outputs additionalContext: "workflow running, don't redo analysis"
  ↓
LLM sees: original message + "ORCH WORKFLOW TRIGGERED"
LLM responds: "Workflow published. Relay running."
  ↓
Relay handles everything from here.
```

This removes the LLM from the trigger decision. The hook is deterministic (regex match), not probabilistic (LLM instruction following).

## Failure Handling

Each event's `on_failure` field determines what happens when it fails after max retries:

| Strategy | Behavior |
|----------|----------|
| `stop` | Halt all remaining events. Workflow fails. |
| `pause` | Mark as `awaiting-approval`. User decides. |
| `rollback-to-checkpoint` | Git reset to previous checkpoint tag, then pause. |
| `continue` | Skip this event. Dependents still proceed. |
| `report-as-partial` | Skip and mark report as partial. |

## Parallel Execution

Events with empty `depends_on: []` start as "ready" simultaneously. The relay dispatches up to 4 script events in parallel. AI events are sequential (1 at a time — Copilot Chat is single-threaded).

Example: recap workflow has 9 scan phases with `depends_on: []`. All 9 become "ready" at publish time. The relay runs 4 scripts at a time, completing all 9 in ~3 batches instead of 9 sequential runs.

## Safe by Default

```
Default (safe mode):
  Script phases → auto (relay runs them)
  AI phases    → pause (user reviews prompt, types @angular approve)

With --auto flag:
  Script phases → auto
  AI phases    → auto (relay sends to Copilot Chat via code chat)

Mid-workflow upgrade:
  @angular approve-all → switches to auto for remaining phases
```

## Report Generation

When the workflow completes, the monitor routes to a dedicated report builder based on workflow type:

| Workflow | Builder | Output |
|----------|---------|--------|
| `angular-project-recap` | `recap-report-builder.js` | Styled HTML with 13 sections, Mermaid diagrams, KPIs |
| `angular-migration` | `migrate-report-builder.js` | Before/after comparison, phase timeline, compatibility |
| `angular-new-feature` | `create-report-builder.js` | Files created, architecture impact, test coverage |
| docs audit | `docs-report-builder.js` | Registry status, staleness, drift |
| local setup | `local-report-builder.js` | Platform, runtimes, Docker, ports |

Each builder reads phase `.output.json` files and generates a self-contained HTML report with inlined CSS (HDS oklch tokens), Mermaid CDN for diagrams, and print-friendly styles.

## Directory Layout

```
.orch/
  workflow-state/
    active-run.json                         # pointer to current run
    events/
      run-2026-03-26T18-56-52Z/            # one directory per run
        manifest.json                       # workflow metadata
        001.event.json                      # phase 1 state
        001.output.json                     # phase 1 script output
        002.event.json                      # phase 2 state
        002.prompt.md                       # phase 2 AI prompt
        002.complete.json                   # phase 2 AI completion
        ...
        collected-all.json                  # aggregated (written by monitor)
  reports/
    angular-project-recap-report.html       # generated report
  scripts/
    relay/
      publish.js                            # YAML → events (publisher)
      relay.js                              # poll loop (dispatcher)
      event-store.js                        # atomic read/write
      monitor.js                            # completion + report trigger
      prompt-builder.js                     # AI prompt assembly
      recap-report-builder.js               # HTML report generator
      migrate-report-builder.js
      create-report-builder.js
      docs-report-builder.js
      local-report-builder.js
      compose-plan.js                       # dynamic plan composer
    hooks/
      workflow-trigger.sh                   # userPromptSubmitted hook
    detect-domains.js                       # project stack detection
    detect-elevate.js                       # elevate lib detection
  hooks/
    check-stack.js                          # version-aware stack detection
    resolve-references.js                   # reference doc resolution
    track-trends.js                         # report trend tracking
```
