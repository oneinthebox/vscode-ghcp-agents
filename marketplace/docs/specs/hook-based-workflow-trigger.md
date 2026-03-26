# Hook-Based Workflow Trigger

## Problem

The `@angular` coordinator agent ignores workflow trigger instructions and answers directly instead of publishing events and starting the relay. Despite explicit instructions saying "check workflow triggers FIRST," the LLM takes the fast path — searches the codebase and writes a plain text summary.

**Root cause:** LLM instruction compliance is unreliable for complex orchestration. Instructions are suggestions, not commands. The LLM found it easier to do 9 codebase searches than to run `node publish.js`.

## Solution

Remove the LLM from the trigger decision entirely. A `userPromptSubmitted` hook runs a deterministic script **before the LLM processes the message**. If the prompt matches a workflow trigger, the script publishes events and starts the relay. The LLM then sees injected context saying "workflow already running, report status."

### Two-Punch Mechanism

**Punch 1 (side effect):** The hook script matches the prompt against workflow triggers (regex). On match:
- Runs `node .orch/scripts/relay/publish.js` to create event files
- Starts `node .orch/scripts/relay/relay.js` in background
- The workflow is now running regardless of what the LLM decides

**Punch 2 (context injection):** The hook outputs JSON with `additionalContext`:
- Tells the LLM: "ORCH WORKFLOW TRIGGERED. DO NOT scan the codebase. Report the workflow status."
- The LLM sees this context alongside the original message
- The LLM's only job is to confirm to the user that the workflow is running

### Why This Works

| Before (instruction-based) | After (hook-based) |
|---------------------------|-------------------|
| LLM decides whether to run workflow | Hook decides — deterministic, regex-based |
| LLM might ignore instructions | Hook runs before LLM sees the message |
| LLM searches codebase and summarizes | LLM sees "workflow already running" |
| No HTML report generated | Relay generates report automatically |

## Implementation

### New Files

- **`.orch/scripts/hooks/workflow-trigger.sh`** — The hook script. Reads prompt from stdin JSON, matches against workflow triggers, publishes events, starts relay, outputs `additionalContext`.
- **`.github/hooks/workflow-trigger.json`** — Hook registration. Fires on `userPromptSubmitted`.

### Trigger Patterns

| Workflow | Trigger Pattern |
|----------|----------------|
| `angular-project-recap` | `recap\|overview\|onboard\|walkthrough\|explain.*project` |
| `angular-migration` | `upgrade\|migrate\|update.*angular` |
| `angular-new-feature` | `create\|scaffold\|generate\|build\|add.*feature` |

### Safety

- **No double-publish:** If `active-run.json` exists, the hook reports existing workflow status instead of publishing a new one.
- **Publish failure:** If `publish.js` fails (exit code != 0), the hook exits silently and lets the LLM handle the request normally.
- **`--auto` flag extraction:** If the prompt contains `--auto`, the relay starts with the `--auto` flag.
- **Context extraction:** For migrations, extracts target version number. For features, extracts feature name.

### How the Hook Uses VS Code's API

The `userPromptSubmitted` hook receives stdin JSON with `.prompt` field. It cannot modify the prompt text, but it CAN:
1. Run terminal commands (side effects)
2. Output JSON with `additionalContext` that the LLM sees alongside the original message
3. Output `systemMessage` for user-visible notifications

## Flow

```
User: "@angular recap this project --auto"
  ↓
VS Code fires userPromptSubmitted hooks (in order):
  ↓
Hook 1 (log-prompt.sh): logs the prompt → exit 0
  ↓
Hook 2 (workflow-trigger.sh):
  → reads stdin → extracts ".prompt"
  → matches "recap" against triggers → MATCH
  → extracts --auto flag
  → runs: node publish.js angular-project-recap.yaml '{}'
  → runs: node relay.js --auto & (background)
  → outputs: { additionalContext: "workflow running..." }
  → exit 0
  ↓
LLM receives: original message + "ORCH WORKFLOW TRIGGERED..."
LLM responds: "Workflow published. 11 phases. Relay running..."
  ↓
Relay (background): executes phases → generates HTML report
```

## Verification

1. Say `@angular recap this project` → hook should publish events, start relay, LLM reports status
2. Say `@angular how does routing work?` → hook should NOT match (no workflow trigger), LLM answers directly
3. Say `@angular recap this project --auto` → relay starts with --auto flag
4. Say `@angular recap` while a workflow is already running → hook detects active run, reports status
5. Check `.orch/reports/angular-project-recap-report.html` is generated after workflow completes
