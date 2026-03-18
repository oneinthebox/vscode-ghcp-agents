---
name: context
description: "Monitor session health and create handoff summaries. Check if quality is declining (context rot), and generate compact handoff prompts to start fresh sessions without losing progress. Use when sessions run long or quality drops."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

Two capabilities: health check (is this session still performing well?) and compact (create a handoff to start fresh).

## Capabilities

| Action | When to use |
|--------|------------|
| **Health** | Check current session's quality status |
| **Compact** | Generate handoff summary for a fresh session |

## Inputs

- "Check session health" → health check
- "How is this session doing?" → health check
- "Create a handoff" → compact
- "I need to start fresh" → compact

## Steps

### Health
1. Read `.orch/audit/session-status.json`.
2. Read the current session audit record.
3. Summarize: work progress, quality status, any alerts.
4. If quality is declining, explain what's happening and recommend action.

### Compact
1. Read the current session audit record.
2. Read `.orch/audit/session-status.json` for progress data.
3. Analyze what was accomplished (files modified, patterns migrated, decisions made).
4. Determine what remains (bounded: total - completed; unbounded: summarize last goal).
5. Generate a compact handoff prompt (<300 tokens) for a fresh session.

## Output

### Health
```markdown
## Session Health

### Work Progress
| Metric | Value |
|--------|-------|
| Agent | {name} |
| Duration | {elapsed} |
| Progress | {n/total or unbounded} |

### Quality
| Status | {good / fair / declining / poor} |
| Adherence | {score}% |

### Recommendation
{Continue / Wrap up soon / Start fresh session}
```

### Compact
```markdown
## Session Summary

### Accomplished
- {what was done}

### Remaining
- {what's left}

### Key Decisions
- {decisions made during session}

---

### Handoff Prompt (copy into new session)

> Continue {task}. Completed: {summary}. Remaining: {items}.
> Key decisions: {decisions}. Reference: {doc paths}.
```

## Validation

- Health status matches session-status.json
- Compact handoff prompt is under 300 tokens
- All accomplished work accurately reflected
