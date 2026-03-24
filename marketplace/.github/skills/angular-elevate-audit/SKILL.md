---
name: angular-elevate-audit
description: "Scan Angular project for @yourorg/elevate compliance — detect missing platform services (auth, logging, config), incorrect usage, partial integration, and missing elevate-common components"
references:
  - references/internal/elevate/overview.md  # ADD-HERE: elevate platform overview
allowed-tools:
  - codebase

# Sub-library registry — add new elevate sub-libs here.
# The skill detects which are relevant from package.json and scans only those.
# To add a new sub-lib: add a row below AND create the reference doc.
sub-libs:
  - id: auth
    package: "@yourorg/elevate/auth"
    reference: references/internal/elevate/auth.md              # ADD-HERE
    detects: "custom login flows, localStorage tokens, manual JWT handling"
  - id: authorization
    package: "@yourorg/elevate/authorization"
    reference: references/internal/elevate/authorization.md     # ADD-HERE
    detects: "custom role checks, hardcoded permissions, *ngIf role guards"
  - id: logging
    package: "@yourorg/elevate/logging"
    reference: references/internal/elevate/logging.md           # ADD-HERE
    detects: "console.log, console.error, console.warn in source files"
  - id: config
    package: "@yourorg/elevate/config"
    reference: references/internal/elevate/config.md            # ADD-HERE
    detects: "localStorage, sessionStorage, hardcoded config, environment.ts abuse"
  - id: preferences
    package: "@yourorg/elevate/preferences"
    reference: references/internal/elevate/preferences.md       # ADD-HERE
    detects: "custom user settings storage, manual theme persistence"
  - id: common-grid
    package: "@yourorg/elevate-common/grid"
    reference: references/internal/elevate/common-grid.md       # ADD-HERE
    detects: "raw AG Grid without elevate wrapper, missing default configs"
  - id: common-chart
    package: "@yourorg/elevate-common/chart"
    reference: references/internal/elevate/common-chart.md      # ADD-HERE
    detects: "raw Plotly/Chart.js without elevate wrapper"
  - id: common-dialog
    package: "@yourorg/elevate-common/dialog"
    reference: references/internal/elevate/common-dialog.md     # ADD-HERE
    detects: "custom modal implementations instead of elevate dialog"
  # ADD-HERE: new sub-libs as elevate grows
---

## Context

Orchestrator-style audit skill for the @yourorg/elevate platform. Detects which elevate sub-libraries are relevant to the project (from `package.json`), then scans for compliance issues per sub-lib. Only loads references for sub-libs actually in use — no context bloat.

Run this before `/angular-elevate-apply` to understand what needs fixing.

## Inputs

- `@angular /angular-elevate-audit` — audit all relevant sub-libs
- `@angular /angular-elevate-audit --lib auth,logging` — audit specific sub-libs only
- `@angular /angular-elevate-audit src/app/trade/` — audit specific directory

## Steps

1. Read `package.json` to detect which `@yourorg/elevate/*` and `@yourorg/elevate-common/*` packages are installed.
2. For each installed sub-lib, load its reference doc from `.orch/references/internal/elevate/`.
   - If reference doc doesn't exist, note it and scan using known detection patterns from the `detects` field.
3. **Per sub-lib scan:**
   - **auth:** Find custom login flows, localStorage token storage, manual JWT decode, missing AuthGuard usage
   - **authorization:** Find hardcoded role checks, missing permission directives
   - **logging:** Find `console.log/error/warn` in source files (not test files)
   - **config:** Find `localStorage`/`sessionStorage` direct access, hardcoded config values, `environment.ts` overuse
   - **preferences:** Find custom user settings storage outside elevate preferences
   - **common-grid:** Find raw `<ag-grid-angular>` without elevate grid wrapper, missing default column configs
   - **common-chart:** Find raw Plotly/Chart.js without elevate chart wrapper
   - **common-dialog:** Find custom modal/dialog implementations
   <!-- ADD-HERE: detection patterns for new sub-libs -->
4. Classify each finding: **not using** (should be, isn't), **using incorrectly** (has it but wrong), **partially integrated** (some places use it, some don't).
5. Produce per-sub-lib report with file locations, severity, and recommended fix.

## Output

### Summary
| Sub-lib | Status | Files affected | Severity |
|---------|--------|---------------|----------|
| auth | Partially integrated | 3 | high |
| logging | Not using | 12 | high |
| common-grid | Using incorrectly | 2 | medium |
| config | Compliant | 0 | - |

### Detailed Findings
| File | Sub-lib | Issue | Severity | Current | Expected |
|------|---------|-------|----------|---------|----------|
| auth.service.ts | auth | Manual JWT decode | high | `jwt_decode()` | `ElevateAuthService.getToken()` |
| trade.service.ts | logging | console.log | high | `console.log(data)` | `this.logger.info(data)` |

## Validation

- All installed elevate packages were scanned
- console.log in test files excluded (not flagged)
- node_modules excluded
- No files modified (read-only audit)
