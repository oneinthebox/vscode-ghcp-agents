---
name: drift
description: "Compare reference documentation against codebase scan results to detect doc-code drift. Identifies where docs say one thing but code does another, enriched with git context explaining why. Use before migrations to ensure you're working from accurate information."
---

## Context

Doc-code drift is one of the biggest sources of bugs during migrations. This skill compares what reference docs say the code should look like against what the scan found it actually looks like.

## Inputs

- **app_name**: Name of the scanned application
- Optional: **--scope**: Limit to specific domain's reference docs

## Steps

1. Read the latest scan snapshot from `.github/references/scans/{app_name}/`.
2. Read reference docs for the relevant scope from `.github/references/`.
3. For each documented standard/pattern, check if the scan data confirms or contradicts it.
4. For each drift found:
   a. Classify: doc likely stale (80%+ code does X, doc says Y) / code likely wrong (5% deviate) / ambiguous
   b. Enrich with git context: `git log` to find when deviation was introduced, by whom, and why (commit message)
   c. Find related issues/PRs if referenced in commit messages
5. Update `docs-registry.yaml` with `drift_check` date and `drift_status`.

## Output

```markdown
## Drift Report — {app_name}

### Critical Drift (code contradicts documented standard)
| Area | Doc Says | Code Does | Files | Likely Cause |
|------|----------|-----------|-------|-------------|

### Moderate Drift (code partially follows docs)
| Area | Doc Says | Code Does | Compliance | Files |
|------|----------|-----------|-----------|-------|

### Aligned (no drift)
| Area | Status |
|------|--------|

### Summary
- Critical: {n}, Moderate: {n}, Aligned: {n}

### Recommended Actions
1. {specific actions for each critical drift item}
```

## Classification Rules

- **Doc likely stale**: 80%+ of codebase does X, doc says Y → suggest updating doc
- **Code likely wrong**: 5% of files deviate from documented standard → suggest fixing code
- **Ambiguous**: ~50/50 split or critical area (auth, security, data) → flag for human decision, NEVER auto-resolve

## Validation

- Every drift item includes git evidence (commit date, author, message)
- Classification follows the rules above (not arbitrary)
- Critical items in auth/security/data areas are always flagged as ambiguous, never auto-classified
