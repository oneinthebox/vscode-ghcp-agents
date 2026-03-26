<!-- Example output from /docs-drift — see SKILL.md for usage -->
## Doc-Code Drift Report — Acme Trading Platform

### Summary
| Metric                | Value |
|-----------------------|-------|
| Total drift items     | 5     |
| Stale file paths      | 1     |
| Angular version mismatches | 1 |
| Missing npm scripts   | 1     |
| Class/method not found | 1    |
| API URL mismatches    | 1     |

---

### Drift Finding 1 — Stale File Path

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Type     | `stale_file_path`                                                     |
| Source   | `README.md` (line 42)                                                 |
| Expected | `src/app/shared/utils/date-formatter.util.ts` (referenced in docs)    |
| Actual   | File not found on disk                                                |

**Evidence:** The file was renamed to `src/app/shared/utils/date-format.pipe.ts` in commit `b3c4d5e` on 2026-02-14 as part of the refactor to use Angular pipes instead of utility functions. The README still references the old utility path.

**Recommendation:** Update README.md line 42 to reference `src/app/shared/utils/date-format.pipe.ts`.

---

### Drift Finding 2 — Angular Version Mismatch

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Type     | `angular_version_mismatch`                                            |
| Source   | `README.md` (line 8)                                                  |
| Expected | Angular 17 (documented in README "Built with Angular 17")             |
| Actual   | Angular 19.x (`@angular/core: ~19.0.0` in package.json)              |

**Evidence:** The project was upgraded from Angular 17 to 19 in commit `f7a8b9c` on 2026-01-20 (PR #387). The README header was not updated during the migration.

**Recommendation:** Update README.md line 8 to say "Built with Angular 19".

---

### Drift Finding 3 — Missing npm Script

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Type     | `npm_script_missing`                                                  |
| Source   | `README.md` (line 65)                                                 |
| Expected | Script `e2e` referenced as `npm run e2e`                              |
| Actual   | Script `e2e` not found in package.json scripts                        |

**Evidence:** The `e2e` script was removed from package.json in commit `a2b3c4d` on 2026-03-01 when Protractor was replaced with Playwright. The new script is `test:e2e`. The README still tells users to run `npm run e2e`.

**Recommendation:** Update README.md line 65 to use `npm run test:e2e`.

---

### Drift Finding 4 — Class/Method Not Found

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Type     | `class_method_not_found`                                              |
| Source   | `README.md` (line 103)                                                |
| Expected | `TradeExecutionService` referenced in architecture section            |
| Actual   | `TradeExecutionService` not found in any TypeScript source under src/ |

**Evidence:** The class was renamed to `OrderExecutionService` in commit `d5e6f7a` on 2026-02-28 (PR #412) to better reflect the domain model. The README architecture diagram still uses the old name.

**Recommendation:** Update README.md line 103 to reference `OrderExecutionService`.

---

### Drift Finding 5 — API URL Mismatch

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Type     | `api_url_mismatch`                                                    |
| Source   | `.orch/references/api-contracts.md` (line 28)                         |
| Expected | API path `/api/v2/orders` documented in references                    |
| Actual   | Path not found in proxy.conf.json or environment.ts                   |

**Evidence:** The API was versioned up to `/api/v3/orders` in commit `c8d9e0f` on 2026-03-10 (PR #425). The proxy.conf.json was updated but the reference doc still mentions the v2 endpoint.

**Recommendation:** Update `.orch/references/api-contracts.md` line 28 to use `/api/v3/orders`.

---

### JSON Output (raw)

```json
{
  "driftItems": [
    {
      "type": "stale_file_path",
      "source": "README.md",
      "expected": "src/app/shared/utils/date-formatter.util.ts",
      "actual": "File not found on disk",
      "file": "README.md",
      "line": 42
    },
    {
      "type": "angular_version_mismatch",
      "source": "README.md",
      "expected": "Angular 17 (documented)",
      "actual": "Angular 19.x (package.json @angular/core)",
      "file": "README.md",
      "line": 8
    },
    {
      "type": "npm_script_missing",
      "source": "README.md",
      "expected": "Script \"e2e\" referenced in docs",
      "actual": "Script \"e2e\" not found in package.json scripts",
      "file": "README.md",
      "line": 65
    },
    {
      "type": "class_method_not_found",
      "source": "README.md",
      "expected": "\"TradeExecutionService\" referenced in documentation",
      "actual": "\"TradeExecutionService\" not found in any TypeScript source file under src/",
      "file": "README.md",
      "line": 103
    },
    {
      "type": "api_url_mismatch",
      "source": ".orch/references/api-contracts.md",
      "expected": "API path \"/api/v2/orders\" documented in references",
      "actual": "Path not found in proxy.conf.json or environment.ts",
      "file": ".orch/references/api-contracts.md",
      "line": 28
    }
  ],
  "summary": {
    "totalChecks": 5,
    "byType": {
      "stale_file_path": 1,
      "angular_version_mismatch": 1,
      "npm_script_missing": 1,
      "class_method_not_found": 1,
      "api_url_mismatch": 1
    }
  }
}
```
