---
name: angular-docs-audit
description: "Audit TSDoc coverage across Angular source files. Finds undocumented public APIs, detects wrong-format docs, and produces a coverage report with gaps and fix suggestions."
references:
  - references/angular/v19/best-practices.md
  - references/angular/v19/documentation-conventions.md
allowed-tools:
  - codebase
---

## Context

Scans Angular TypeScript source files for TSDoc (JSDoc-style) comment coverage. Identifies undocumented public classes, methods, properties, and interfaces. Detects malformed doc comments (missing @param, @returns, wrong tag format). Produces a coverage report with specific gaps and suggested doc stubs.

## Inputs

- Optional: `--scope {path}` — audit specific directory or library instead of full project
- Optional: `--public-only` — only audit exported/public members (default: true)
- Optional: `--generate-stubs` — output TSDoc stubs for undocumented members
- Optional: `--min-coverage {N}` — set pass/fail threshold (default: 80%)

## Steps

1. **Scan target files.** Glob the target directory for `*.ts` files, excluding `*.spec.ts`, `*.test.ts`, `*.stories.ts`, `test/`, `e2e/`, `node_modules/`, and `.d.ts` files.

2. **Identify public symbols.** For each file, detect exported declarations using these patterns:
   - `export class {Name}` — classes (including abstract)
   - `export interface {Name}` — interfaces
   - `export type {Name}` — type aliases
   - `export function {Name}` — standalone functions
   - `export const {Name}` — constants, injection tokens, route configs
   - `export enum {Name}` — enumerations
   - Public methods inside classes — methods without `private` or `protected` keyword
   - Signal declarations — `input()`, `input.required()`, `output()`, `computed()` assigned to public fields

3. **Check documentation quality.** For each symbol:

   a. **Has doc comment** — a `/** ... */` block directly above the declaration (decorators like `@Component` or blank lines in between are allowed):
   ```typescript
   // DOCUMENTED — /** block directly above (decorator in between is OK)
   /** Manages trade lifecycle operations. */
   @Injectable({ providedIn: 'root' })
   export class TradeService { ... }

   // UNDOCUMENTED — no /** block
   @Injectable({ providedIn: 'root' })
   export class TradeService { ... }
   ```

   b. **Format correct** — uses TSDoc syntax (not JSDoc `{type}` annotations):
   ```typescript
   // CORRECT TSDoc format
   @param tradeId - Unique identifier for the trade

   // WRONG — JSDoc {type} in TypeScript
   @param {string} tradeId The trade ID
   ```

   c. **Complete** — check that:
   - Every parameter has a matching `@param` tag
   - Non-void methods have `@returns`
   - Error-throwing methods have `@throws`
   - `@param` count equals actual parameter count

   Example completeness check:
   ```typescript
   /**
    * Fetches trades by symbol.
    * @param symbol - The ticker symbol    ✓ present
    *                                       ✗ missing @param for 'options'
    *                                       ✗ missing @returns
    */
   getTrades(symbol: string, options?: QueryOptions): Observable<Trade[]> { ... }
   ```

4. **Classify each gap** by severity:

   | Classification | Definition | Severity |
   |---------------|-----------|----------|
   | **Missing** | No `/** */` block at all | High |
   | **Incomplete** | Has doc but missing `@param` or `@returns` | Medium |
   | **Malformed** | Wrong syntax: JSDoc `{type}`, empty `/** */`, mismatched param names | Low |

5. **Calculate coverage.** Formula:
   ```
   Coverage % = (symbols_with_any_doc / total_public_symbols) * 100
   Quality %  = (symbols_with_complete_correct_docs / total_public_symbols) * 100
   ```
   Report both metrics — a project can have 80% coverage but only 40% quality if docs are incomplete.

6. **Generate stubs** (if `--generate-stubs`). For each undocumented symbol, produce a TSDoc stub:
   ```typescript
   // Generated stub for TradeService.cancelTrade()
   /**
    * [TODO: describe purpose]
    * @param tradeId - [TODO: describe]
    * @returns [TODO: describe return value]
    */
   ```
   Stubs use `[TODO: describe]` placeholders so they compile immediately and are easy to find-and-replace.

7. **Compare against threshold.** Use `--min-coverage` (default 80%). Exit with pass/fail status.

   | Coverage | Status | Meaning |
   |----------|--------|---------|
   | >= 80% | PASS | Meets minimum bar |
   | 60-79% | WARN | Below standard, should improve |
   | < 60% | FAIL | Critical gap |

## Output

```markdown
## TSDoc Coverage Report — {scope}

### Summary
| Metric              | Value         |
|---------------------|---------------|
| Files scanned       | {n}           |
| Public members      | {n}           |
| Documented          | {n} ({pct}%)  |
| Incomplete          | {n}           |
| Malformed           | {n}           |
| Threshold           | {min}%        |
| Status              | PASS / FAIL   |

### Gaps by File
| File | Missing | Incomplete | Malformed | Total | Coverage % |
|------|---------|------------|-----------|-------|-----------|
| `src/app/features/trading/trade.service.ts` | 3 | 2 | 0 | 12 | 58% |
| `src/app/features/trading/blotter.component.ts` | 5 | 1 | 0 | 9 | 33% |
| `src/app/shared/ui/data-table.component.ts` | 4 | 0 | 2 | 8 | 25% |
| `src/app/core/auth/auth.service.ts` | 0 | 0 | 0 | 6 | 100% |
| `src/app/core/models/trade.model.ts` | 0 | 0 | 1 | 4 | 75% |
| ... | ... | ... | ... | ... | ... |

### Top Gaps (detail)

#### `trade.service.ts`
- **Missing**: `cancelTrade()` — public method, no doc comment. Calls `DELETE /api/trades/:id`.
- **Missing**: `getTradeHistory()` — public method, no doc comment. Returns `Observable<Trade[]>`.
- **Missing**: `executeBulk()` — public method, no doc comment. Complex: 3 params, error recovery.
- **Incomplete**: `submitOrder()` — has doc but missing `@param options` and `@throws`
- **Incomplete**: `TradeService` class — has doc but description mentions removed `legacyMode` param

#### `blotter.component.ts`
- **Missing**: `BlotterComponent` — class has no doc comment
- **Missing**: `filterTerm` signal input — `filterTerm = input<string>('')` undocumented
- **Missing**: `tradeSelected` output — `tradeSelected = output<Trade>()` undocumented
- **Missing**: `filteredTrades` computed — `computed(() => ...)` undocumented
- **Missing**: `onExport()` — public method, no doc comment

### Format Issues
| Issue | Count | Files |
|-------|-------|-------|
| JSDoc `{type}` in TypeScript | 4 | `data-table.component.ts`, `trade.model.ts` |
| Empty `/** */` blocks | 1 | `blotter.component.ts` |
| Mismatched `@param` names | 1 | `trade.model.ts` — `@param tradeData` but param is `dto` |

### Suggested Stubs (if --generate-stubs)
```typescript
// --- trade.service.ts ---

/**
 * [TODO: describe purpose]
 * @param tradeId - [TODO: describe]
 * @returns [TODO: describe return value]
 */
cancelTrade(tradeId: string): Observable<void> { ... }

/**
 * [TODO: describe purpose]
 * @param filters - [TODO: describe]
 * @returns [TODO: describe return value]
 */
getTradeHistory(filters?: TradeFilter): Observable<Trade[]> { ... }
```

### Recommended Next Steps
- Run `/angular-docs-generate` to fill Missing gaps (high impact, 12 undocumented APIs)
- Run `/angular-docs-repair` to fix Incomplete + Malformed issues (6 issues)
- Add `npm run docs:coverage` to CI with `--min-coverage 80` to prevent regression
```

## Validation

- **Coverage accuracy**: spot-check 3 files manually — count `export` declarations and verify documented/total ratio matches the report.
- **Symbol existence**: every file and symbol listed in the Gaps table must exist on disk. Open each listed file and confirm the method/class/property is present and public.
- **Format detection**: every JSDoc `{type}` flagged must actually contain `@param {type}` or `@returns {type}` syntax. Search the file and verify.
- **Stub correctness**: every generated stub must have the correct number of `@param` tags matching the method signature. Insert the stubs into the file and verify `ng build` compiles.
- **Threshold consistency**: the Status column (PASS/WARN/FAIL) must match the stated threshold values.
- **Exclusion correctness**: verify no `.spec.ts`, `.test.ts`, `.stories.ts`, or `node_modules` files are counted.
- **No modifications**: confirm no files were created, modified, or deleted during the audit.
