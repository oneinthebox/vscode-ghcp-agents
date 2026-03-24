---
name: audit-context
description: "In-session health check. Detect context rot, measure session quality, and generate compact handoff summaries for seamless session continuity."
references: []
allowed-tools:
  - codebase
---

## Context

Monitors the current session's health in real time. Detects context rot (declining output quality as context window fills), measures adherence and productivity metrics, and generates token-efficient handoff summaries when a fresh session is needed. Designed to be invoked mid-session when quality feels off, or proactively at regular intervals.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Inputs

- "Check session health" or "How is this session doing?" — run health check
- "Create a handoff" or "I need to start fresh" — generate compact handoff summary
- Optional: `--verbose` — include detailed metric breakdown
- Optional: `--max-tokens {n}` — handoff summary token budget (default: 300)

## Steps

### Health Check
1. Read current session state: elapsed time, messages exchanged, tools invoked.
2. Assess quality indicators:
   a. **Repetition rate**: detect repeated instructions or outputs within the session.
   b. **Tool failure rate**: percentage of tool calls that errored or returned empty.
   c. **Instruction drift**: compare recent outputs against the agent's original instructions.
   d. **Response coherence**: detect contradictions between early and recent responses.
3. Calculate overall health: good (all green), fair (minor issues), declining (actionable), poor (start fresh).
4. If declining or poor, identify the likely cause and recommend action.

### Handoff Summary
1. Analyze the session to extract:
   a. **Accomplished**: files modified, patterns migrated, decisions made, skills invoked.
   b. **Remaining**: tasks mentioned but not completed, in-progress work.
   c. **Key decisions**: choices made during the session that affect future work.
   d. **References**: file paths and doc paths used during the session.
2. Compress into a handoff prompt under {max-tokens} tokens.
3. Format for copy-paste into a new session.

## Output

### Health Check
```markdown
## Session Health

### Status: {good / fair / declining / poor}

### Metrics
| Indicator          | Value      | Status |
|--------------------|------------|--------|
| Duration           | {elapsed}  | {ok/warn} |
| Messages           | {n}        | {ok/warn} |
| Repetition rate    | {pct}%     | {ok/warn} |
| Tool failure rate  | {pct}%     | {ok/warn} |
| Instruction drift  | {low/med/high} | {ok/warn} |

### Recommendation
{Continue / Wrap up current task / Start fresh session with handoff}
```

### Handoff Summary
```markdown
## Handoff Summary

### Accomplished
- {completed work items}

### Remaining
- {pending work items}

### Key Decisions
- {decisions made}

---
> **Handoff prompt** (copy into new session):
> Continue {task}. Done: {summary}. Remaining: {items}. Decisions: {decisions}. Refs: {paths}.
```

## Validation

- Health status accurately reflects session quality (not always "good")
- Handoff prompt is under the specified token budget
- All accomplished work is accurately listed (no hallucinated progress)
- Remaining items are specific and actionable (not vague)
- Handoff prompt includes enough context to resume without re-reading all files
