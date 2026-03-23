---
name: docs-drift
description: "Compare reference documentation against codebase to detect doc-code mismatch. Classify drift as doc stale, code wrong, or ambiguous. Enrich findings with git history context."
references: []
---

## Context

Detects divergence between what reference documentation says the code should do and what the code actually does. This is critical before migrations, audits, or onboarding — stale docs lead to wrong assumptions. Each drift finding is enriched with git history to explain when and why the divergence happened, enabling informed resolution.

## Inputs

- **scope**: Application name, module path, or domain to check
- Optional: `--references {path}` — specific reference docs to compare against (default: all in `.orch/references/`)
- Optional: `--depth {shallow|deep}` — shallow checks headings/structure, deep checks code patterns
- Optional: `--auto-classify` — apply classification rules automatically (default: true)

## Steps

1. Read reference documentation from `.orch/references/` for the specified scope.
2. Scan the codebase for patterns, APIs, and conventions documented in the references.
3. For each documented standard or pattern, compare doc vs code:
   a. **Aligned**: code matches documented pattern.
   b. **Drifted**: code contradicts or diverges from documented pattern.
4. For each drift finding:
   a. Classify using threshold rules:
      - **Doc stale**: 80%+ of code does X, doc says Y — doc likely outdated.
      - **Code wrong**: <20% of code deviates from documented standard — code likely wrong.
      - **Ambiguous**: 20-80% split, or the area is auth/security/data — flag for human.
   b. Enrich with git context:
      - `git log` for the divergent files: when deviation introduced, by whom, commit message.
      - Related PRs or issues referenced in commit messages.
5. Update `.orch/registry.yaml` with `drift_check` date and `drift_status`.
6. Produce the drift report with actionable recommendations.

## Output

```markdown
## Doc-Code Drift Report — {scope}

### Summary
| Classification | Count |
|----------------|-------|
| Doc stale      | {n}   |
| Code wrong     | {n}   |
| Ambiguous      | {n}   |
| Aligned        | {n}   |

### Critical Drift
| Area       | Doc Says      | Code Does     | Files   | Classification | Git Context        |
|------------|---------------|---------------|---------|----------------|--------------------|
| {pattern}  | {expected}    | {actual}      | {paths} | {class}        | {who, when, why}   |

### Aligned Areas
| Area       | Status  |
|------------|---------|
| {pattern}  | Aligned |

### Recommended Actions
| # | Classification | Action                | Target               |
|---|----------------|-----------------------|----------------------|
| 1 | Doc stale      | Update reference doc  | `.orch/references/{path}` |
| 2 | Code wrong     | Fix code to match doc | `src/{path}`         |
| 3 | Ambiguous      | Human decision needed | See details          |
```

## Validation

- Every drift finding includes git evidence (commit date, author, message)
- Classification follows the threshold rules (80%+ = doc stale, <20% = code wrong)
- Auth, security, and data areas are always flagged as ambiguous, never auto-classified
- Aligned items are listed (not just drift — shows full coverage)
- Recommendations are specific and actionable (agent, skill, file path)
