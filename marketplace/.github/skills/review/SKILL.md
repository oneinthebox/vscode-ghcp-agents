---
name: review
description: "Review code changes for anti-patterns, standard violations, security issues, and improvement opportunities. Produces structured feedback with severity levels (error/warning/info). Flags issues but doesn't fail — provides constructive recommendations. Use for PR reviews or code quality checks."
metadata:
  author: orch-team
  version: "1.0"
---

## Domain Detection

Same as /generate — detect from active agent, project files, or file context.

## Steps

1. Detect domain.
2. Load domain-specific anti-patterns: [references/{domain}/anti-patterns.md](references/)
4. Read the diff or files to review.
5. Check each change against:
   - Anti-pattern checklist (domain-specific)
   - Active agent's instructions (coding standards)
   - Security patterns (OWASP top 10 basics)
   - Internal library usage (prefer @yourorg components)
6. Produce structured review output per [schemas/review-format.yaml](schemas/review-format.yaml).

## Severity levels

| Severity | Meaning | Action |
|----------|---------|--------|
| **Error** | Will cause bugs or security issues | Must fix before merge |
| **Warning** | Violates org standards, works but wrong | Should fix, discuss if disagree |
| **Info** | Improvement opportunity | Consider, not required |

**IMPORTANT: Flag, don't fail.** The review is advisory. It raises concerns — it doesn't block merges.

## Output format

```markdown
## Code Review — {scope}

### Summary
{1-2 sentence overview of review findings}

### Issues

#### 🔴 Error: {title}
**File:** `{file}:{line}`
**What:** {what's wrong}
**Why:** {why it matters}
**Fix:** {specific suggestion with code}

#### 🟡 Warning: {title}
...

#### 🔵 Info: {title}
...

### Positive Observations
- {things done well — always include at least one}
```

## Strict Mode (--strict)

When invoked with `--strict` (e.g., `/review --strict`):
- Treat all Warnings as Errors (they become "must fix before merge").
- Add additional checks not in normal mode:
  - HDS token compliance — scan for hardcoded colors/spacing that should use `var(--hds-*)`
  - Elevate compliance — scan for `console.log`, `localStorage`, `environment.ts` imports
  - Test coverage regression — compare against baseline if one exists
- Output includes a binary PASS/FAIL verdict at the end.

Strict mode is designed for pre-merge verification workflows.

### Strict mode output addition

Add to the end of the normal review output:

```markdown
### Verdict
| Check | Result |
|-------|--------|
| Code review | {N} errors (including warnings promoted to errors in --strict) |
| HDS compliance | PASS / FAIL ({N} hardcoded values found) |
| Elevate compliance | PASS / FAIL ({N} violations found) |
| **Overall** | **PASS / FAIL** |
```

## Workflow Integration

### Prerequisites

None. `/review` can run standalone at any time.

### Post-actions

None. `/review` is typically a terminal skill — its output is the deliverable.

Update `.orch/workflow/` stage status to `completed` if running within a workflow.

## Validation

- Every issue has file + line reference
- Every issue has a specific fix suggestion (not just "fix this")
- At least one positive observation included
- Severity levels match the anti-patterns checklist
