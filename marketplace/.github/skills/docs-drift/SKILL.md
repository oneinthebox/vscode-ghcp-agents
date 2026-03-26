---
name: docs-drift
description: "Compare reference documentation against codebase to detect doc-code mismatch. Classify drift as doc stale, code wrong, or ambiguous. Enrich findings with git history context."
references:
  - references/orch/registry-schema-reference.md
allowed-tools:
  - codebase
  - terminal
---

## Context

Detects divergence between what reference documentation says the code should do and what the code actually does. This is critical before migrations, audits, or onboarding — stale docs lead to wrong assumptions. Each drift finding is enriched with git history to explain when and why the divergence happened, enabling informed resolution.

## Inputs

- **scope**: Application name, module path, or domain to check
- Optional: `--references {path}` — specific reference docs to compare against (default: all in `.orch/references/`)
- Optional: `--depth {shallow|deep}` — shallow checks headings/structure, deep checks code patterns
- Optional: `--auto-classify` — apply classification rules automatically (default: true)

## Doc-vs-Code Comparison Algorithm

The skill extracts checkable assertions from documentation and validates each against the codebase.

### Step 1: Extract assertions from docs

Parse each reference markdown file into structured assertions:

| Assertion Type     | Doc Pattern Detected                            | What to Check in Code                       |
|--------------------|------------------------------------------------|---------------------------------------------|
| API endpoint       | `## GET /api/users` or route table rows        | grep for `@Get('/api/users')` or router def |
| Type/interface name| `UserDTO`, `OrderStatus` in code blocks         | file search for `interface UserDTO`          |
| Function signature | `fetchUsers(limit: number): Promise<User[]>`    | AST match for function name + params         |
| Config pattern     | "Set `retryCount` to 3 in environment config"   | grep for `retryCount` in config files        |
| Import path        | `import { X } from '@app/shared/utils'`         | verify path exists and exports X             |
| Convention         | "All services use the `*Service` suffix"         | glob for `*.service.ts`, check class names   |

### Step 2: Validate assertions against code

For each assertion, scan the codebase and compute an alignment score:

```
matching_instances   = count(code locations that match the documented pattern)
total_instances      = count(all code locations in the assertion's domain)
alignment_pct        = (matching_instances / total_instances) * 100
```

### Step 3: Classify drift

```
if alignment_pct >= 80:
    classification = "doc_stale"        # code has moved on, doc is outdated
elif alignment_pct <= 20:
    classification = "code_wrong"       # doc is correct, code deviates
else:
    classification = "ambiguous"        # split opinion, needs human review

# Override: auth, security, and data domains are ALWAYS "ambiguous"
if domain in ["auth", "security", "data", "encryption", "pii"]:
    classification = "ambiguous"
```

## Detection Patterns by Drift Type

### API endpoint changed but docs not updated
- Doc says: `GET /api/v2/users` returns `{ users: User[] }`
- Code has: route handler at `/api/v3/users` returning `{ data: User[], pagination: {...} }`
- Detection: grep for the documented path literal; if not found, search for the base resource name and find the actual path.

### Type renamed but docs reference old name
- Doc says: `UserDTO` interface with fields `name`, `email`
- Code has: `UserResponse` interface (renamed) — `UserDTO` no longer exists
- Detection: search for the exact type name; if zero matches, search for similar types with overlapping fields.

### Deleted function still documented
- Doc says: `validateToken(token: string): boolean` in `auth.utils.ts`
- Code has: `auth.utils.ts` exists but `validateToken` was removed in favor of `AuthGuard.canActivate()`
- Detection: search for the function name in the documented file; if missing, search project-wide for the function name.

## Git Enrichment

For each drift finding, the skill runs targeted git queries to explain when the divergence was introduced:

```bash
# Find when the documented pattern was last present
git log --all --oneline -n 1 -S "validateToken" -- src/auth/auth.utils.ts
# Output: a1b2c3d 2026-01-15 refactor: replace validateToken with AuthGuard

# Find who changed it and the full commit context
git log --format="%H %ai %an — %s" -n 3 -- src/auth/auth.utils.ts
# Output:
# a1b2c3d 2026-01-15 Jane Smith — refactor: replace validateToken with AuthGuard
# f4e5d6c 2025-12-20 John Doe — feat: add token refresh logic
# b7c8d9e 2025-11-01 Jane Smith — fix: token validation edge case

# Find related PR
git log --format="%s" -n 1 a1b2c3d | grep -oP '#\d+'
# Output: #342
```

This gives the drift report concrete evidence: who, when, why, and which PR introduced the divergence.

## Steps

1. Read reference documentation from `.orch/references/` for the specified scope.
2. Extract checkable assertions from the documentation (API endpoints, types, functions, conventions).
3. Scan the codebase for patterns, APIs, and conventions documented in the references.
4. For each documented standard or pattern, compare doc vs code and compute alignment score.
5. For each drift finding:
   a. Classify using threshold rules (80%+ = doc stale, <20% = code wrong, 20-80% or sensitive domain = ambiguous).
   b. Enrich with git context using `git log -S` and `git log --format`.
6. Update `.orch/registry.yaml` with `drift_check` date and `drift_status`.
7. Produce the drift report with actionable recommendations.

## Concrete Example: 3 Drift Findings with Evidence

Running `/docs-drift --scope src/app/auth --depth deep` produces:

```markdown
## Doc-Code Drift Report — src/app/auth

### Summary
| Classification | Count |
|----------------|-------|
| Doc stale      | 1     |
| Code wrong     | 0     |
| Ambiguous      | 2     |
| Aligned        | 5     |

### Critical Drift

#### 1. `validateToken` function removed
| Field          | Value                                                         |
|----------------|---------------------------------------------------------------|
| Doc says       | `validateToken(token: string): boolean` in `auth.utils.ts`   |
| Code does      | Function deleted; replaced by `AuthGuard.canActivate()`       |
| Files          | `src/app/auth/auth.utils.ts`, `src/app/auth/auth.guard.ts`   |
| Alignment      | 0% (function not found anywhere)                              |
| Classification | Ambiguous (auth domain — forced human review)                 |
| Git evidence   | `a1b2c3d` 2026-01-15 Jane Smith — "refactor: replace validateToken with AuthGuard (#342)" |

#### 2. Auth endpoint path changed
| Field          | Value                                                         |
|----------------|---------------------------------------------------------------|
| Doc says       | `POST /api/v2/auth/login` accepts `{ email, password }`      |
| Code does      | Route is now `POST /api/v3/auth/login` with added `mfaCode` field |
| Files          | `src/app/auth/auth.controller.ts:48`                          |
| Alignment      | 0% (v2 path not found)                                       |
| Classification | Ambiguous (auth domain — forced human review)                 |
| Git evidence   | `c3d4e5f` 2026-02-20 John Doe — "feat: v3 auth API with MFA support (#401)" |

#### 3. Token refresh interval
| Field          | Value                                                         |
|----------------|---------------------------------------------------------------|
| Doc says       | "Tokens refresh every 15 minutes"                             |
| Code does      | `REFRESH_INTERVAL_MS = 300_000` (5 minutes) in `token.config.ts` |
| Files          | `src/app/auth/token.config.ts:12`                             |
| Alignment      | 95% of code uses 5min interval (doc is outdated)              |
| Classification | Doc stale (95% alignment with new pattern)                    |
| Git evidence   | `e6f7a8b` 2026-03-01 Jane Smith — "perf: reduce token refresh to 5min (#418)" |

### Aligned Areas
| Area                     | Status  |
|--------------------------|---------|
| JWT signing algorithm    | Aligned |
| Role-based guard logic   | Aligned |
| Session storage keys     | Aligned |
| Logout cleanup flow      | Aligned |
| Password hashing method  | Aligned |

### Recommended Actions
| # | Classification | Action                              | Target                                |
|---|----------------|-------------------------------------|---------------------------------------|
| 1 | Ambiguous      | Human review: update doc or revert  | `.orch/references/auth-patterns.md`   |
| 2 | Ambiguous      | Human review: update doc for v3 API | `.orch/references/auth-api.md`        |
| 3 | Doc stale      | Update doc to say 5 minutes         | `.orch/references/auth-patterns.md`   |
```

## Validation

- Every drift finding includes git evidence (commit hash, date, author, message, PR number)
- Classification follows the threshold rules (80%+ = doc stale, <20% = code wrong)
- Auth, security, and data areas are always flagged as ambiguous, never auto-classified
- Aligned items are listed (not just drift — shows full coverage of what was checked)
- Recommendations are specific and actionable (file path, exact change needed)
- Assertion extraction covers all documented types: endpoints, types, functions, config, conventions
- Git enrichment uses `git log -S` for string-level history, not just file-level
