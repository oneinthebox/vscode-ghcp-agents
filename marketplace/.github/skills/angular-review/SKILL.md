---
name: angular-review
description: "Review Angular code against an anti-pattern checklist. Produces structured feedback with severity levels (error/warning/info). Checks for Angular-specific pitfalls, org standards, and security issues."
references:
  - references/angular/v19/anti-patterns.md
allowed-tools:
  - codebase
---

## Context

Angular-specific code review skill. Loads the Angular anti-pattern checklist and reviews code changes (diffs or files) against it. Checks for common Angular pitfalls: improper change detection, memory leaks from unsubscribed observables, zone.js misuse, incorrect lifecycle hook usage, and org-standard violations. Produces structured, actionable feedback.

## Inputs

- **target**: Diff (PR or staged changes) or file paths to review
- Optional: `--strict` — promote warnings to errors, add HDS/Elevate compliance checks
- Optional: `--scope {module}` — limit review to a specific module or library

### Helper Script

Run the anti-pattern detection script before executing steps manually:
```bash
node scripts/detect-antipatterns.js [src-dir]
```
The script outputs JSON to stdout with detected violations including console.log usage, `any` types, legacy directives, constructor injection, and missing trackBy. Use this data to inform the steps below.

## Steps

1. Load the Angular anti-pattern checklist from `references/angular/v19/anti-patterns.md`.
2. Read the diff or target files.
3. Check each change against the following checklist categories:

   ---

   ### a. Security Checks

   | # | Check | Severity | Example Violation | Fix |
   |---|-------|----------|-------------------|-----|
   | S1 | No `innerHTML` binding without sanitization | Error | `[innerHTML]="userContent"` | Use `DomSanitizer.sanitize()` or Angular's built-in sanitization. Prefer interpolation `{{ }}` when possible. |
   | S2 | No `bypassSecurityTrust*` usage | Error | `this.sanitizer.bypassSecurityTrustHtml(input)` | Remove bypass. Sanitize at the data layer instead. If truly needed, add `// SECURITY: reviewed by [name]` comment. |
   | S3 | No hardcoded secrets or API keys | Error | `const apiKey = 'sk-abc123...'` | Move to environment config or vault. Use `ConfigService.get('api.key')`. |
   | S4 | No direct DOM manipulation | Error | `document.getElementById('x').style.color = 'red'` | Use Angular renderer: `this.renderer.setStyle(el, 'color', 'var(--hds-text-primary)')`. |
   | S5 | HTTP calls use `HttpClient`, not `fetch` | Warning | `fetch('/api/data')` | Use `inject(HttpClient).get('/api/data')` for interceptor support and type safety. |

   **Example finding:**
   ```
   #### Error: Unsafe innerHTML binding
   **File:** `trade-detail.component.html:23`
   **What:** `[innerHTML]="trade.notes"` binds unsanitized user content.
   **Why:** XSS vulnerability — user-controlled HTML is rendered without sanitization.
   **Fix:**
   ```html
   <!-- Replace innerHTML with text interpolation if HTML is not needed -->
   <p>{{ trade.notes }}</p>

   <!-- Or sanitize explicitly if HTML formatting is required -->
   <p [innerHTML]="sanitizedNotes()"></p>
   ```
   ```typescript
   private sanitizer = inject(DomSanitizer);
   sanitizedNotes = computed(() =>
     this.sanitizer.sanitize(SecurityContext.HTML, this.trade().notes) ?? ''
   );
   ```

   ---

   ### b. Performance Checks

   | # | Check | Severity | Example Violation | Fix |
   |---|-------|----------|-------------------|-----|
   | P1 | `@for` uses `track` expression | Error | `@for (item of items) { ... }` (no track) | Add `track item.id` or `track $index`. Required in Angular 19. |
   | P2 | No function calls in templates (except signals) | Warning | `{{ getTotal() }}` in template | Convert to `computed()` signal: `total = computed(() => ...)` then `{{ total() }}`. |
   | P3 | OnPush components do not call `detectChanges()` | Warning | `this.cdr.detectChanges()` in OnPush component | Use signals or `markForCheck()`. Direct `detectChanges()` bypasses OnPush optimization. |
   | P4 | Large barrel imports avoided | Warning | `import { something } from '@angular/material'` | Import specific module: `import { MatButtonModule } from '@angular/material/button'`. |
   | P5 | Lazy loading for feature routes | Info | `{ path: 'reports', component: ReportsComponent }` | Use `loadComponent: () => import('./reports/reports.component')`. |

   **Example finding:**
   ```
   #### Warning: Function call in template
   **File:** `portfolio.component.html:15`
   **What:** `{{ calculatePnL(trade) }}` is called on every change detection cycle.
   **Why:** Performance — this function runs on every CD cycle, not just when `trade` changes.
   **Fix:**
   ```typescript
   // Add computed signal in the component
   readonly pnl = computed(() =>
     this.trades().map(t => ({ ...t, pnl: t.currentPrice - t.entryPrice }))
   );
   ```
   ```html
   <!-- Use the precomputed value -->
   @for (trade of pnl(); track trade.id) {
     <span>{{ trade.pnl | currency }}</span>
   }
   ```

   ---

   ### c. Angular Pattern Checks

   | # | Check | Severity | Example Violation | Fix |
   |---|-------|----------|-------------------|-----|
   | A1 | Uses `inject()` not constructor injection | Warning | `constructor(private svc: MyService)` | `private readonly svc = inject(MyService);` |
   | A2 | Signal inputs/outputs for new code | Warning | `@Input() data: Trade[]` | `readonly data = input.required<Trade[]>()` |
   | A3 | Standalone components (no NgModule) | Warning | `@NgModule({ declarations: [Comp] })` | Add `standalone: true` to component, delete module file. |
   | A4 | No `subscribe()` without cleanup | Error | `.subscribe(data => this.data = data)` with no unsubscribe | Use `toSignal()`, `async` pipe, or `DestroyRef` + `takeUntilDestroyed()`. |
   | A5 | No `ngOnChanges` for new code | Info | `ngOnChanges(changes: SimpleChanges)` | Use signal inputs with `computed()` or `effect()`. |

   **Example finding:**
   ```
   #### Error: Observable subscription without cleanup
   **File:** `dashboard.component.ts:34`
   **What:** `this.dataService.getData().subscribe(d => this.data = d)` — no unsubscribe mechanism.
   **Why:** Memory leak — subscription persists after component destruction, potentially causing errors and memory bloat.
   **Fix:**
   ```typescript
   // Option 1: Use toSignal (preferred for signal-based components)
   readonly data = toSignal(this.dataService.getData(), { initialValue: [] });

   // Option 2: Use takeUntilDestroyed
   private destroyRef = inject(DestroyRef);
   ngOnInit() {
     this.dataService.getData().pipe(
       takeUntilDestroyed(this.destroyRef),
     ).subscribe(d => this.data.set(d));
   }
   ```

   ---

   ### d. Testing Checks

   | # | Check | Severity | Example Violation | Fix |
   |---|-------|----------|-------------------|-----|
   | T1 | Components have co-located `.spec.ts` | Warning | `trade-card.component.ts` exists but `trade-card.component.spec.ts` does not | Create spec file with at minimum: creation test, input binding test, output emission test. |
   | T2 | Services mock HTTP calls | Warning | `TestBed` with real `HttpClient` | Use `HttpClientTestingModule` and `HttpTestingController`. |
   | T3 | `data-testid` on interactive elements | Info | `<button (click)="submit()">` with no testid | Add `data-testid="submit-btn"`. |
   | T4 | No `fdescribe` / `fit` / `xit` in committed code | Error | `fdescribe('...', () => { ... })` | Remove the `f` prefix. Use `.skip()` intentionally, not `x`. |
   | T5 | Signal inputs tested via `componentRef.setInput()` | Info | `component.myInput = value` (won't work with signal inputs) | Use `fixture.componentRef.setInput('myInput', value)`. |

   **Example finding:**
   ```
   #### Error: Focused test committed
   **File:** `trade.service.spec.ts:12`
   **What:** `fdescribe('TradeService', ...)` — focused test suite will skip all other tests.
   **Why:** Other test suites will not run in CI, masking failures.
   **Fix:** Remove the `f` prefix:
   ```typescript
   describe('TradeService', () => { ... })
   ```

   ---

   ### e. Accessibility Checks

   | # | Check | Severity | Example Violation | Fix |
   |---|-------|----------|-------------------|-----|
   | AC1 | Images have `alt` attribute | Error | `<img [src]="chart.url">` | Add `alt="..."` or `alt=""` for decorative images with `role="presentation"`. |
   | AC2 | Interactive elements are keyboard accessible | Warning | `<div (click)="select()">` | Use `<button>` or add `tabindex="0"`, `role="button"`, and `(keydown.enter)`. |
   | AC3 | Forms have labels | Warning | `<input formControlName="amount">` with no label | Wrap in `<hds-form-field label="Amount">` or add `<label for="amount">`. |
   | AC4 | ARIA attributes on dynamic content | Info | Status message appears without `aria-live` | Add `aria-live="polite"` to the status container. |
   | AC5 | Color is not the only visual indicator | Info | Error shown only by red border | Add icon or text in addition to color change. |

   **Example finding:**
   ```
   #### Warning: Non-accessible click handler
   **File:** `trade-list.component.html:8`
   **What:** `<div class="trade-row" (click)="selectTrade(trade)">` — div with click handler is not keyboard accessible.
   **Why:** Keyboard and screen reader users cannot activate this element.
   **Fix:**
   ```html
   <div class="trade-row"
        role="button"
        tabindex="0"
        (click)="selectTrade(trade)"
        (keydown.enter)="selectTrade(trade)"
        (keydown.space)="selectTrade(trade)"
        [attr.aria-label]="'Select trade ' + trade.symbol">
   ```
   Or preferably, use a native `<button>` element.

4. Classify each finding by severity (error / warning / info) using the tables above.
5. For each finding, produce: file + line, what is wrong, why it matters, specific fix with code.
6. Include at least one positive observation.
7. If `--strict`, add HDS token compliance checks (scan for hardcoded colors/spacing) and Elevate compliance checks (scan for console.log, localStorage, missing platform services).

## Output

```markdown
## Angular Code Review — {scope}

### Summary
{1-2 sentence overview of findings}

### Metrics
| Category | Errors | Warnings | Info |
|----------|--------|----------|------|
| Security | {n} | {n} | {n} |
| Performance | {n} | {n} | {n} |
| Angular Patterns | {n} | {n} | {n} |
| Testing | {n} | {n} | {n} |
| Accessibility | {n} | {n} | {n} |
| **Total** | **{n}** | **{n}** | **{n}** |

### Issues

#### Error: {title}
**File:** `{file}:{line}`
**Category:** {Security|Performance|Angular Patterns|Testing|Accessibility}
**What:** {description of the issue}
**Why:** {impact — bug, memory leak, performance, security}
**Fix:**
```{language}
{specific code suggestion}
```

#### Warning: {title}
...

#### Info: {title}
...

### Positive Observations
- {at least one thing done well}
- {note good patterns observed — OnPush usage, signal adoption, good test coverage, etc.}
```

### Severity Levels

| Severity    | Meaning                              | Action                    |
|-------------|--------------------------------------|---------------------------|
| **Error**   | Will cause bugs, leaks, or security issues | Must fix before merge     |
| **Warning** | Violates org Angular standards       | Should fix                |
| **Info**    | Improvement opportunity              | Consider, not required    |

## Validation

- Every issue references a specific file and line
- Every issue includes a concrete fix suggestion with code
- Every issue is categorized into one of the 5 review categories
- Findings map to entries in the anti-patterns checklist or org standards
- At least one positive observation included
- No false positives on auto-generated code or third-party libraries
- Strict mode checks HDS tokens and Elevate compliance when enabled
- Review covers all 5 categories (security, performance, patterns, testing, accessibility)
