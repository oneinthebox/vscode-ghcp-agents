---
name: angular-scan-docs
description: "Scan README completeness, TSDoc coverage, code comment quality, and documentation format audit"
references:
  - references/angular/v19/documentation-conventions.md
allowed-tools:
  - codebase
---

## Context

Scans the project's documentation at every level: README, inline code comments, TSDoc/JSDoc annotations, and any generated docs. Produces a documentation health report with coverage metrics and quality assessment. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan documentation" — full documentation audit
- "Check TSDoc coverage" — TSDoc/JSDoc annotation coverage for public APIs
- "Rate our README" — README completeness assessment
- "Find undocumented code" — list public APIs missing documentation

### Helper Script

Run the documentation health scanner before executing steps manually:
```bash
node scripts/scan-docs-health.js [project-root]
```
The script outputs JSON to stdout with readme sections, tsdocCoverage, and tooling status. Use this data to inform the steps below.

## Steps

1. **Assess README completeness** — open `README.md` at project root (and `libs/*/README.md` for Nx workspaces). Score each expected section as present/partial/missing:
   - **Project description**: first paragraph or `#` heading explaining what the project does.
   - **Installation**: `npm install` or `yarn install` instructions, prerequisites (Node version, etc.).
   - **Usage / Getting started**: `ng serve`, `npm start`, or similar development instructions.
   - **Configuration**: environment setup, `.env` file instructions, feature flags.
   - **Build & Deploy**: `ng build`, CI/CD references, deployment steps.
   - **Contributing**: PR process, coding standards, branch naming.
   - **License**: LICENSE file reference or license section.
   - **Stale detection**: compare Angular version mentioned in README against `package.json` `@angular/core` version. Flag if README says "Angular 16" but package.json has `^19.0.0`.

2. **Scan TSDoc/JSDoc coverage** — identify every exported public symbol and check for documentation:
   - **What counts as a public symbol**: `export class`, `export interface`, `export type`, `export function`, `export const` (for injection tokens, routes), and all `public` methods on classes.
   - **What counts as documented**: a `/** ... */` comment block directly above the declaration.
   - **Coverage calculation formula**:
     ```
     TSDoc Coverage % = (symbols_with_doc_comment / total_exported_symbols) * 100
     ```
   - **Per-file scan approach**: for each `.ts` file (excluding `.spec.ts`, `.stories.ts`):
     1. Count lines matching `export (class|interface|function|type|const|enum)` — these are exported symbols.
     2. For each exported class, count `public` methods (methods without `private` or `protected` keyword, plus constructor if it has `public` parameters).
     3. Check if the line immediately above each symbol contains `*/` (end of a doc comment block).
   - Example of undocumented symbol:
     ```typescript
     // UNDOCUMENTED - no /** */ block above
     export class OrderService {
       // UNDOCUMENTED - public method with no doc comment
       public getOrders(filters: OrderFilter): Observable<Order[]> {
         ...
       }
     }
     ```
   - Example of properly documented symbol:
     ```typescript
     /**
      * Manages order CRUD operations against the REST API.
      * Uses caching to reduce redundant network calls.
      */
     export class OrderService {
       /**
        * Fetches orders matching the given filters.
        * @param filters - Criteria for filtering orders (status, date range, customer)
        * @returns Observable emitting the matching order list
        */
       public getOrders(filters: OrderFilter): Observable<Order[]> {
         ...
       }
     }
     ```

3. **Assess comment quality** — scan all `.ts` files for quality signals:
   - **Low-quality markers** — count occurrences of:
     - `// TODO` and `// FIXME` — unresolved work items
     - `// HACK` and `// WORKAROUND` — technical debt markers
     - `// eslint-disable` — suppressed lint rules (note which rules)
     - `// @ts-ignore` and `// @ts-expect-error` — TypeScript safety bypasses
     - Single-word comments: `// temp`, `// test`, `// fix`
   - **Commented-out code** — detect blocks of 3+ consecutive lines starting with `//` that contain code patterns (function calls, variable assignments, imports).
   - **Empty doc blocks** — detect `/** */` with no content between the delimiters.
   - **Quality score formula**:
     ```
     Quality Score = 100 - (low_quality_markers * 2) - (commented_out_blocks * 5) - (empty_doc_blocks * 3)
     Clamped to [0, 100]
     ```

4. **Check for documentation tooling** — detect the presence and configuration of doc generators:
   - **Compodoc**: look for `@compodoc/compodoc` in `devDependencies`, `tsconfig.doc.json`, `.compodocrc.json` or `.compodocrc.yaml`, and `"docs:generate": "compodoc -p tsconfig.doc.json"` in scripts.
   - **Storybook**: look for `@storybook/angular` in devDependencies, `.storybook/main.ts` or `.storybook/main.js`, and `*.stories.ts` files. Count story files vs. component files.
   - **Typedoc**: look for `typedoc` in devDependencies and `typedoc.json` or `typedoc.config.js`.
   - **API documentation**: look for Swagger/OpenAPI specs (`openapi.yaml`, `swagger.json`) in the project.

5. **Scan for supplementary docs** — check for:
   - `docs/` or `documentation/` directory — list all files with word counts.
   - Architecture Decision Records: `adr/`, `docs/decisions/`, `docs/adr/` — count ADRs and note the most recent one.
   - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` at root.
   - `CHANGELOG.md` — check if it is auto-generated (semantic-release) or manual.

6. **Detect doc format consistency** — scan all `/** */` blocks:
   - Check if `@param` tags use TSDoc format (`@param name - description`) or JSDoc format (`@param {type} name description`).
   - Flag mixed usage (some files use TSDoc, others JSDoc).
   - Check for redundant `@type` annotations that duplicate TypeScript types.
   - Report the dominant format and the percentage of doc blocks using it.

7. **Produce the output report** with coverage metrics, quality scores, and actionable findings.

## Output

```markdown
## Documentation Scan — {project_name}

### Summary
| Metric | Value | Status | Threshold |
|--------|-------|--------|-----------|
| README completeness | 71% (5/7 sections) | WARN | pass >= 85%, warn >= 50%, fail < 50% |
| TSDoc coverage | 38% (45/118 symbols) | FAIL | pass >= 70%, warn >= 40%, fail < 40% |
| Comment quality score | 72/100 | WARN | pass >= 80, warn >= 50, fail < 50 |
| Doc tooling | Compodoc configured | PASS | — |
| Storybook coverage | 42% (17/40 components) | WARN | pass >= 60%, warn >= 30%, fail < 30% |

### README Assessment
| Section | Status | Notes |
|---------|--------|-------|
| Project description | Present | Clear one-paragraph description |
| Installation | Present | Node 20+, `npm install` documented |
| Usage / Getting started | Present | `ng serve`, dev proxy instructions |
| Configuration | Partial | Mentions `.env` but no key descriptions |
| Build & Deploy | Missing | No build/deploy instructions |
| Contributing | Present | Links to `CONTRIBUTING.md` |
| License | Missing | No LICENSE file or section |
| Angular version accuracy | WARN | README says "Angular 18", `package.json` has `^19.0.0` |

### TSDoc Coverage by Module
| Module/Feature | Exported Symbols | Documented | Coverage % | Status |
|----------------|-----------------|------------|-----------|--------|
| `core/services` | 24 | 18 | 75% | PASS |
| `core/models` | 15 | 12 | 80% | PASS |
| `feature-dashboard` | 22 | 6 | 27% | FAIL |
| `feature-settings` | 18 | 4 | 22% | FAIL |
| `feature-reports` | 16 | 3 | 19% | FAIL |
| `shared-ui` | 23 | 2 | 9% | FAIL |
| **Total** | **118** | **45** | **38%** | **FAIL** |

### Undocumented Public APIs (top 15 by impact)
| File | Symbol | Type | Public Methods |
|------|--------|------|---------------|
| `src/app/features/dashboard/dashboard.component.ts` | `DashboardComponent` | Component | `onFilterChange()`, `refresh()`, `exportData()` |
| `src/app/features/dashboard/services/report.service.ts` | `ReportService` | Service | `generateReport()`, `downloadPdf()` |
| `src/app/shared/ui/data-table/data-table.component.ts` | `DataTableComponent` | Component | `sort()`, `paginate()`, `filter()` |
| `src/app/shared/ui/chart/chart.component.ts` | `ChartComponent` | Component | `updateData()`, `setOptions()` |
| `src/app/features/settings/profile-form.component.ts` | `ProfileFormComponent` | Component | `onSubmit()`, `validate()` |
| ... | ... | ... | ... |

### Comment Quality Issues
| Issue | Count | Severity | Top Files |
|-------|-------|----------|-----------|
| `// TODO` / `// FIXME` | 14 | Medium | `order.service.ts` (4), `dashboard.component.ts` (3), `auth.guard.ts` (2) |
| Commented-out code blocks | 6 | High | `report.service.ts` (2), `settings.component.ts` (2) |
| Empty doc blocks (`/** */`) | 3 | Medium | `data-table.component.ts`, `chart.component.ts` |
| `// @ts-ignore` | 2 | High | `legacy-adapter.service.ts` (2) |
| `// eslint-disable` | 5 | Low | `custom-validators.ts` (2), `date-utils.ts` (1) |
| Single-word comments | 8 | Low | Various files |

### Documentation Tooling
| Tool | Configured? | Config File | Notes |
|------|------------|-------------|-------|
| Compodoc | Yes | `tsconfig.doc.json`, `"docs": "compodoc -p tsconfig.doc.json"` | Last generated: unknown (check `documentation/` dir) |
| Storybook | Yes | `.storybook/main.ts` | 17 story files for 40 components (42% coverage) |
| Typedoc | No | — | Not installed |
| ADRs | Yes | `docs/decisions/` | 5 ADRs, most recent: `005-signals-migration.md` |

### Documentation Format Consistency
| Format | Usage | Percentage |
|--------|-------|-----------|
| TSDoc (`@param name - desc`) | 32 doc blocks | 71% |
| JSDoc (`@param {type} name desc`) | 13 doc blocks | 29% |
| **Recommendation** | Standardize on TSDoc format — it is the dominant convention and correct for TypeScript |
```

## Validation

- **Coverage accuracy**: TSDoc coverage percentages must be computed from actual file scanning. Verify by spot-checking 3 randomly selected files: count their exported symbols manually and confirm the documented/total ratio matches the report.
- **Symbol existence**: every file and symbol listed in the Undocumented Public APIs table must exist. Verify by opening the file and confirming the class/method/function is exported and public.
- **README section accuracy**: every section marked "Present" must actually appear in `README.md`. Every section marked "Missing" must genuinely be absent. Re-read `README.md` and cross-check.
- **Comment count accuracy**: the counts for `// TODO`, `// FIXME`, commented-out code, and other markers must match actual occurrences. Verify by running a targeted search (e.g., search for `TODO` across `*.ts` files excluding `node_modules`) and comparing totals.
- **Threshold consistency**: the Status column (PASS/WARN/FAIL) must match the stated threshold values. For example, if the threshold is "pass >= 70%" and coverage is 38%, the status must be FAIL, not WARN.
- **Tooling detection**: a tool is only marked "Configured" if both the dependency exists in `package.json` and a config file is present on disk. Do not mark "Configured" based on dependency alone.
- **No modifications**: confirm that no files were created, modified, or deleted during the scan.
