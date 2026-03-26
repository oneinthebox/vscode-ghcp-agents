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

When reference docs are unavailable, the skill falls back to pattern-based detection using the `detects` field from the sub-library registry and the concrete patterns documented below.

Run this before `/angular-elevate-apply` to understand what needs fixing.

## Inputs

- `@angular /angular-elevate-audit` — audit all relevant sub-libs
- `@angular /angular-elevate-audit --lib auth,logging` — audit specific sub-libs only
- `@angular /angular-elevate-audit src/app/trade/` — audit specific directory

### Helper Script

Run the compliance scanner before executing steps manually:
```bash
node scripts/scan-elevate-compliance.js [project-root]
```
The script outputs JSON to stdout with per-sub-library violation counts, console.log usages, raw localStorage access, and hardcoded URLs. Use this data to inform the steps below.

## Steps

1. Read `package.json` to detect which `@yourorg/elevate/*` and `@yourorg/elevate-common/*` packages are installed.

2. For each installed sub-lib, load its reference doc from `.orch/references/internal/elevate/`.
   - If reference doc doesn't exist, note it and scan using the fallback detection patterns below.

3. **Per sub-lib scan with concrete detection patterns:**

   **auth** — Find custom login flows, localStorage token storage, manual JWT decode, missing AuthGuard:
   ```
   # Detection patterns (regex to scan .ts files, excluding .spec.ts):
   localStorage\.(get|set)Item\(.*token       # manual token storage
   sessionStorage\.(get|set)Item\(.*token      # manual token storage in session
   jwt_decode\(                                 # manual JWT decoding
   atob\(.*split\('\.'\)                       # manual JWT base64 decode
   new HttpHeaders\(.*Authorization             # manual auth header construction
   canActivate.*:.*boolean                      # custom route guard (should use ElevateAuthGuard)
   login\(\s*username.*password                 # custom login method
   ```
   Example violation:
   ```typescript
   // VIOLATION — manual JWT handling
   const token = localStorage.getItem('auth_token');
   const payload = jwt_decode(token);
   if (payload.exp < Date.now() / 1000) { /* expired */ }

   // EXPECTED — use ElevateAuthService
   const token = this.authService.getToken();
   const isExpired = this.authService.isTokenExpired();
   ```

   **authorization** — Find hardcoded role checks, missing permission directives:
   ```
   # Detection patterns:
   role\s*===?\s*['"]admin['"]                  # hardcoded role string comparison
   user\.role\s*===?                            # direct role property check
   \*ngIf=".*role.*===                          # template role check (should use *elevateHasPermission)
   includes\(['"]ADMIN['"]\)                    # hardcoded permission check
   ```

   **logging** — Find `console.log/error/warn` in source files (not test files):
   ```
   # Detection patterns (scan .ts files, exclude .spec.ts and test.ts):
   console\.log\(                               # should be this.logger.info()
   console\.error\(                             # should be this.logger.error()
   console\.warn\(                              # should be this.logger.warn()
   console\.debug\(                             # should be this.logger.debug()
   console\.info\(                              # should be this.logger.info()
   ```
   Example violation:
   ```typescript
   // VIOLATION — console.log in service
   console.log('Trade executed:', tradeData);
   console.error('Trade failed:', error);

   // EXPECTED — LoggingService
   this.logger.info('Trade executed', { data: tradeData });
   this.logger.error('Trade failed', { error });
   ```

   **config** — Find `localStorage`/`sessionStorage` direct access, hardcoded config values, `environment.ts` overuse:
   ```
   # Detection patterns:
   localStorage\.(get|set|remove)Item           # direct storage access (should use ConfigService)
   sessionStorage\.(get|set|remove)Item         # direct session storage access
   environment\.\w+                             # environment.ts direct import (check frequency)
   ['"]https?://.*api.*['"]                     # hardcoded API URLs
   ['"]ws://                                     # hardcoded WebSocket URLs
   apiUrl\s*[:=]\s*['"]http                     # hardcoded API URL assignment
   ```
   Example violation:
   ```typescript
   // VIOLATION — hardcoded URL and direct localStorage
   const apiUrl = 'https://api.internal.yourorg.com/v2';
   const userPrefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');

   // EXPECTED — ConfigService
   const apiUrl = this.configService.get<string>('api.baseUrl');
   const userPrefs = this.configService.get<UserPrefs>('user.preferences');
   ```

   **preferences** — Find custom user settings storage outside elevate preferences:
   ```
   # Detection patterns:
   localStorage\..*pref                         # custom preference storage
   localStorage\..*settings                     # custom settings storage
   localStorage\..*theme                        # custom theme persistence
   \btheme\b.*localStorage                      # theme stored in localStorage
   ```

   **common-grid** — Find raw `<ag-grid-angular>` without elevate grid wrapper, missing default column configs:
   ```
   # Detection patterns (scan .html and .ts files):
   <ag-grid-angular                             # raw AG Grid (should be <elevate-grid>)
   agGridModule                                 # raw AG Grid module import
   new ColDef                                   # manual column definitions (should use elevate defaults)
   gridOptions\s*[:=]\s*\{                      # manual grid options (should extend elevate defaults)
   ```

   **common-chart** — Find raw Plotly/Chart.js without elevate chart wrapper:
   ```
   # Detection patterns:
   <plotly-plot                                  # raw Plotly (should be <elevate-chart>)
   PlotlyModule                                 # raw Plotly module import
   Chart\(\s*ctx                                 # raw Chart.js instantiation
   new Chart\(                                   # raw Chart.js (should be <elevate-chart>)
   import.*chart\.js                            # direct chart.js import
   ```

   **common-dialog** — Find custom modal/dialog implementations:
   ```
   # Detection patterns:
   MatDialog                                     # raw Material dialog (should be ElevateDialogService)
   this\.dialog\.open\(                         # custom dialog opening
   class=".*modal.*"                            # custom modal CSS class
   \[cdkOverlayOrigin\]                         # manual CDK overlay usage
   ```
   <!-- ADD-HERE: detection patterns for new sub-libs -->

4. **Classify each finding** using this classification matrix:

   | Classification | Meaning | Severity |
   |---------------|---------|----------|
   | **Not using** | Elevate package installed but not used where it should be | high |
   | **Using incorrectly** | Elevate service imported but used with wrong API or missing options | medium |
   | **Partially integrated** | Some files use elevate, some still use raw patterns | high |
   | **Not installed** | Package not in package.json but violations suggest it should be | info |
   | **Compliant** | All usages follow elevate patterns | — |

5. **Produce compliance scorecard** with per-sub-lib report:

   **Scoring formula:**
   ```
   Sub-lib score = (compliant_usages / total_usages) * 100
   Overall score = average of all sub-lib scores
   ```

## Output

### Compliance Scorecard

| Metric | Value |
|--------|-------|
| Sub-libs scanned | 6 of 8 installed |
| Fully compliant | 2 (33%) |
| Files with violations | 17 |
| Critical violations | 3 |
| High violations | 12 |
| Medium violations | 8 |
| Overall compliance score | 45/100 |

### Summary
| Sub-lib | Status | Score | Files Affected | Severity |
|---------|--------|-------|---------------|----------|
| auth | Partially integrated | 40% | 3 | high |
| logging | Not using | 0% | 12 | high |
| common-grid | Using incorrectly | 60% | 2 | medium |
| config | Compliant | 100% | 0 | — |
| common-chart | Not installed | — | 1 | info |
| authorization | Partially integrated | 50% | 4 | high |

### Detailed Findings
| File | Sub-lib | Issue | Severity | Current | Expected |
|------|---------|-------|----------|---------|----------|
| auth.service.ts:14 | auth | Manual JWT decode | high | `jwt_decode(token)` | `this.authService.getToken()` |
| auth.service.ts:28 | auth | localStorage token | high | `localStorage.getItem('token')` | `this.authService.getToken()` |
| trade.service.ts:45 | logging | console.log | high | `console.log('Trade:', data)` | `this.logger.info('Trade', { data })` |
| trade.service.ts:72 | logging | console.error | high | `console.error('Failed:', err)` | `this.logger.error('Failed', { error: err })` |
| portfolio.component.ts:9 | common-grid | Raw AG Grid | medium | `<ag-grid-angular [rowData]="rows">` | `<elevate-grid [data]="rows">` |
| dashboard.component.ts:33 | config | Hardcoded API URL | high | `'https://api.yourorg.com/v2'` | `this.configService.get('api.baseUrl')` |
| admin.guard.ts:15 | authorization | Hardcoded role | high | `user.role === 'admin'` | `this.authzService.hasPermission('admin')` |

### Top Violations by Frequency
| Rank | Pattern | Count | Affected Sub-lib |
|------|---------|-------|-----------------|
| 1 | `console.log/error/warn` | 23 | logging |
| 2 | `localStorage` direct access | 8 | auth, config |
| 3 | Hardcoded role checks | 5 | authorization |
| 4 | Raw AG Grid | 3 | common-grid |
| 5 | Hardcoded URLs | 3 | config |

## Validation

- All installed elevate packages were scanned
- console.log in test files (`.spec.ts`, `test.ts`) excluded (not flagged)
- node_modules excluded
- No files modified (read-only audit)
- Compliance score calculated correctly per sub-lib
- Each finding includes file path, line number (when available), current code, and expected code
- When reference docs are unavailable, fallback detection patterns still identify all common violation types
- Sub-libs not listed in package.json but with detected violations are flagged as "Not installed" with info severity
