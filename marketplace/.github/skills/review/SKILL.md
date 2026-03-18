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
2. Check for overrides: `.github/skill-overrides/review/overrides.yaml`
3. Load domain-specific anti-patterns: [references/{domain}/anti-patterns.md](references/)
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

## Validation

- Every issue has file + line reference
- Every issue has a specific fix suggestion (not just "fix this")
- At least one positive observation included
- Severity levels match the anti-patterns checklist
