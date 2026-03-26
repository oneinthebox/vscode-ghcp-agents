---
name: angular-docs-comment
description: "Add inline code comments to complex logic — explains WHY, not WHAT. Targets: complex conditionals, non-obvious algorithms, workarounds, business rules, regex patterns, and performance-critical sections. Never comments obvious code."
references:
  - references/angular/v19/best-practices.md
  - references/angular/v19/documentation-conventions.md
allowed-tools:
  - codebase
  - edit
---

## Context

Adds inline `//` comments to complex code sections that need explanation. Unlike `/angular-docs-generate` (which adds TSDoc to public APIs), this skill targets the internals — the complex logic, workarounds, and business rules that a new developer would struggle to understand.

**Key principle:** Comment the WHY, not the WHAT. `// increment counter` is useless. `// retry with exponential backoff — API rate-limits at 100 req/min` is valuable.

## Inputs

- `@angular /angular-docs-comment src/app/trading/` — comment complex logic in a directory
- `@angular /angular-docs-comment src/app/trading/order.service.ts` — comment a specific file
- `@angular /angular-docs-comment --threshold high` — only comment highly complex sections (cyclomatic complexity > 10)

## Steps

1. Scan target files for complexity indicators using these concrete detection patterns:

   **Nested conditionals (>3 levels)** — detect indentation depth or AST nesting:
   ```
   Pattern: three or more nested if/else/switch blocks. Look for lines where
   indentation increases 3+ times with if/else/switch keywords:
     if (...) {
       if (...) {
         if (...) {        // <-- depth 3, triggers comment
           if (...) { ...  // <-- depth 4, definitely triggers
   ```

   **RxJS chains (>3 operators in pipe)** — match `.pipe(` followed by 4+ operator calls:
   ```typescript
   // Detected pattern: pipe with 4+ operators needs a comment explaining the pipeline
   this.trades$.pipe(
     filter(t => t.status === 'active'),
     switchMap(t => this.http.get<Price>(`/api/price/${t.symbol}`)),
     retryWhen(errors => errors.pipe(delay(1000), take(3))),
     map(price => this.applySpread(price)),
     catchError(err => { this.log.error(err); return EMPTY; })
   );
   ```

   **Numeric constants** — unnamed numbers other than 0, 1, -1 in business logic:
   ```typescript
   // Pattern: literal numbers in calculations, thresholds, multipliers
   const fee = notional * 0.0025;       // what is 0.0025?
   if (retryCount > 3) { ... }          // why 3?
   const timeout = 30000;               // ms? seconds? why this value?
   ```

   **Regex patterns** — any regex longer than ~20 characters:
   ```typescript
   // Pattern: complex regex that is not self-documenting
   const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
   const TRADE_REF = /^(FX|EQ|FI)-\d{4}-[A-Z]{3}-\d{6}$/;
   ```

   **Workarounds lacking explanation** — `// TODO`, `// HACK`, `// WORKAROUND` with fewer than 10 words of context after the tag.

   **Performance-critical sections** — `trackBy` functions, `OnPush` change detection strategies, `computed()` signals with complex derivations, memoization patterns using `Map` caches.

2. Read the surrounding context (function purpose, service role, component behavior).

3. Write inline comments that explain:
   - **WHY** this approach was chosen (not what the code does)
   - **WHAT** the business rule means in domain terms
   - **WHEN** this workaround can be removed (if applicable)
   - **WHERE** this pattern is documented (link to reference if known)

4. Format: single-line `//` for brief explanations, block `/* */` for multi-line context only when necessary.

5. Run `ng lint` to verify no formatting issues introduced.

### Before/After Example

**Before** — complex function with no explanatory comments:
```typescript
calculateSettlementDate(tradeDate: Date, instrument: Instrument): Date {
  let days = instrument.type === 'FX' ? 2 : instrument.type === 'EQ' ? 3 : 1;
  const result = new Date(tradeDate);
  while (days > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6 &&
        !this.holidays.includes(result.toISOString().slice(0, 10))) {
      days--;
    }
  }
  if (instrument.currency !== 'USD' && this.isCLSEligible(instrument)) {
    result.setHours(17, 0, 0, 0);
  }
  return result;
}
```

**After** — same function with WHY-focused comments:
```typescript
calculateSettlementDate(tradeDate: Date, instrument: Instrument): Date {
  // Settlement cycles: FX=T+2 (CLS standard), Equities=T+3 (SEC rule),
  // Fixed Income=T+1 (FICC convention). See: compliance doc SETTLE-2024-003.
  let days = instrument.type === 'FX' ? 2 : instrument.type === 'EQ' ? 3 : 1;
  const result = new Date(tradeDate);
  // Skip weekends and market holidays — only count business days toward settlement.
  // Holiday calendar is loaded from the ops-calendar service at app startup.
  while (days > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6 &&
        !this.holidays.includes(result.toISOString().slice(0, 10))) {
      days--;
    }
  }
  // CLS (Continuous Linked Settlement) eligible FX trades must settle by 17:00 UTC.
  // Non-USD currencies that bypass CLS use standard EOD settlement.
  if (instrument.currency !== 'USD' && this.isCLSEligible(instrument)) {
    result.setHours(17, 0, 0, 0);
  }
  return result;
}
```

## Output

```markdown
## Code Comments Added

| File | Comments added | Complexity areas |
|------|---------------|-----------------|
| order.service.ts | 7 | RxJS chain, retry logic, price calculation |
| trade.guard.ts | 3 | Role-based access rules, session timeout |
| blotter.component.ts | 5 | AG Grid custom renderer, WebSocket reconnect |

Total: {n} comments across {n} files
Lint: pass (no formatting issues)

### Examples of comments added
- `order.service.ts:47` — `// Exponential backoff: API rate-limits at 100 req/min. Retry 3x with 1s, 2s, 4s delays.`
- `trade.guard.ts:23` — `// Traders can only modify orders in 'pending' status. Compliance requirement CR-2024-017.`
```

## Validation

- Comments explain WHY, not WHAT (no "increment counter" style comments)
- No comments on obvious code (variable assignments, simple returns)
- Lint passes after adding comments
- No functional code changes — only comments added
- Each comment is contextually accurate (matches what the code actually does)
