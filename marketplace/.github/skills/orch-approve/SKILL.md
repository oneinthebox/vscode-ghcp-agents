---
name: orch-approve
description: "Approve a pending AI phase in the event-driven workflow relay. Use 'approve' for one phase, 'approve-all' to auto-run all remaining, or 'skip' to skip the current phase."
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

When the ORCH relay is running in safe mode (the default), it pauses before each AI phase and waits for user approval. This skill writes an approval signal file that the relay picks up on its next poll cycle (within 5 seconds).

## Inputs

- `@angular approve` — approve and execute the next pending AI phase
- `@angular approve-all` — switch to auto mode, execute all remaining AI phases without pausing
- `@angular skip` — skip the current pending AI phase and advance to the next

## Steps

1. **Determine the action** from the user's message:
   - "approve" → action = `approve`
   - "approve-all" or "approve all" or "auto" → action = `approve-all`
   - "skip" → action = `skip`

2. **Read the active run** from `.orch/workflow-state/active-run.json` to find the current run directory.

3. **Write the approval signal file:**
   ```bash
   echo '{"action": "<action>", "timestamp": "<now>"}' > .orch/workflow-state/events/<run-id>/approval-signal.json
   ```

4. **Report to user:**
   - For `approve`: "Approved. Phase will start within 5 seconds."
   - For `approve-all`: "Switched to auto mode. All remaining phases will run automatically."
   - For `skip`: "Phase skipped. Next phase will be evaluated."

## Output

```markdown
✓ Phase approved. The relay will dispatch it within 5 seconds.
```

## Validation

- The approval-signal.json file is valid JSON
- The action field is one of: approve, approve-all, skip
- The relay consumes and deletes the signal file after reading it
