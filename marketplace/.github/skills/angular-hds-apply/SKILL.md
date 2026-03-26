---
name: angular-hds-apply
description: "Fix HDS compliance issues — replace hardcoded values with tokens, migrate deprecated tokens, set up theming, wrap raw elements with HDS components"
references:
  - references/internal/hds/tokens.md            # ADD-HERE: full token reference
  - references/internal/hds/theming.md           # ADD-HERE: theme setup guide
  - references/internal/hds/components.md        # ADD-HERE: component migration patterns
  - references/internal/hds/deprecated-tokens.md # ADD-HERE: old-to-new token map
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Fix HDS design system compliance issues found by `/angular-hds-audit`. Replaces hardcoded values with tokens, migrates deprecated tokens, sets up theming, and wraps raw HTML elements with HDS components. Run `/angular-hds-audit` first to understand what needs fixing.

When HDS token references are not available, the skill uses generic fallback patterns — mapping common color values to semantic token names, standard spacing scales, and well-known component wrappers.

## Inputs

- `@angular /angular-hds-apply` — fix all issues from most recent audit
- `@angular /angular-hds-apply src/app/dashboard/` — fix specific directory
- `@angular /angular-hds-apply --severity high` — only fix high+ severity issues
- `@angular /angular-hds-apply --dry-run` — show what would change without modifying files

## Steps

1. Read the most recent `/angular-hds-audit` report (or run audit if none exists).
2. Load HDS token map from `.orch/references/internal/hds/tokens.md`.
   - If the token map is unavailable, use fallback generic token patterns below.

3. **Replace hardcoded colors** — map each hex/rgb/hsl value to the closest HDS token.

   **Before/after examples:**
   ```scss
   /* BEFORE — hardcoded hex colors */
   .dashboard-header {
     color: #333333;
     background-color: #ffffff;
     border-bottom: 1px solid #e5e7eb;
   }
   .accent-text {
     color: #3b82f6;
   }
   .error-message {
     color: #ef4444;
   }

   /* AFTER — HDS tokens */
   .dashboard-header {
     color: var(--hds-text-primary);
     background-color: var(--hds-surface-primary);
     border-bottom: 1px solid var(--hds-border-default);
   }
   .accent-text {
     color: var(--hds-accent-primary);
   }
   .error-message {
     color: var(--hds-feedback-error);
   }
   ```

   **Fallback color mapping** (when token reference is unavailable):
   | Hardcoded Value | Semantic Token | Category |
   |----------------|----------------|----------|
   | `#333`, `#333333`, `rgb(51,51,51)` | `var(--hds-text-primary)` | Text |
   | `#666`, `#666666` | `var(--hds-text-secondary)` | Text |
   | `#999`, `#999999` | `var(--hds-text-tertiary)` | Text |
   | `#fff`, `#ffffff` | `var(--hds-surface-primary)` | Surface |
   | `#f5f5f5`, `#f8f9fa` | `var(--hds-surface-secondary)` | Surface |
   | `#e5e7eb`, `#d1d5db` | `var(--hds-border-default)` | Border |
   | `#3b82f6`, `#2563eb` | `var(--hds-accent-primary)` | Accent |
   | `#ef4444`, `#dc2626` | `var(--hds-feedback-error)` | Feedback |
   | `#22c55e`, `#16a34a` | `var(--hds-feedback-success)` | Feedback |
   | `#f59e0b`, `#d97706` | `var(--hds-feedback-warning)` | Feedback |

   For colors that do not have an exact match, insert a `/* TODO: verify HDS token mapping */` comment and use the closest semantic token.

4. **Replace raw spacing** — convert px/rem values to HDS spacing tokens.

   **Before/after examples:**
   ```scss
   /* BEFORE — raw pixel values */
   .card {
     padding: 16px;
     margin-bottom: 24px;
     gap: 8px;
   }
   .card-header {
     padding: 12px 16px;
     margin-bottom: 8px;
   }

   /* AFTER — HDS spacing tokens */
   .card {
     padding: var(--hds-space-md);
     margin-bottom: var(--hds-space-lg);
     gap: var(--hds-space-sm);
   }
   .card-header {
     padding: var(--hds-space-sm-md) var(--hds-space-md);
     margin-bottom: var(--hds-space-sm);
   }
   ```

   **Fallback spacing scale:**
   | Raw Value | HDS Token |
   |-----------|-----------|
   | `4px` / `0.25rem` | `var(--hds-space-xs)` |
   | `8px` / `0.5rem` | `var(--hds-space-sm)` |
   | `12px` / `0.75rem` | `var(--hds-space-sm-md)` |
   | `16px` / `1rem` | `var(--hds-space-md)` |
   | `24px` / `1.5rem` | `var(--hds-space-lg)` |
   | `32px` / `2rem` | `var(--hds-space-xl)` |
   | `48px` / `3rem` | `var(--hds-space-2xl)` |
   | `64px` / `4rem` | `var(--hds-space-3xl)` |

5. **Migrate deprecated tokens** — replace old token names with current equivalents.

   **Before/after examples:**
   ```scss
   /* BEFORE — deprecated tokens */
   .header {
     color: var(--hds-blue-500);
     background: var(--hds-gray-100);
     font-size: var(--hds-font-sm);
   }

   /* AFTER — current tokens */
   .header {
     color: var(--hds-accent-primary);
     background: var(--hds-surface-secondary);
     font-size: var(--hds-type-body-sm);
   }
   ```

   **Fallback deprecated token mapping:**
   | Deprecated | Current |
   |-----------|---------|
   | `--hds-blue-*` | `--hds-accent-*` (semantic alias) |
   | `--hds-gray-*` | `--hds-surface-*` or `--hds-text-*` |
   | `--hds-red-*` | `--hds-feedback-error` |
   | `--hds-green-*` | `--hds-feedback-success` |
   | `--hds-color-primary` | `--hds-accent-primary` |
   | `--hds-color-bg` | `--hds-surface-primary` |
   | `--hds-font-sm` | `--hds-type-body-sm` |
   | `--hds-font-lg` | `--hds-type-body-lg` |

6. **Set up theming** (if not already configured):

   **Add `@yourorg/hds/themes` import to `styles.scss`:**
   ```scss
   /* styles.scss — BEFORE */
   @use 'normalize.css';
   // ... existing styles

   /* styles.scss — AFTER */
   @use 'normalize.css';
   @use '@yourorg/hds/themes' as hds-theme;

   :root {
     @include hds-theme.tokens();
   }

   [data-theme='dark'] {
     @include hds-theme.dark-tokens();
   }
   ```

   **Add theme binding in root component:**
   ```typescript
   // app.component.ts — BEFORE
   @Component({ selector: 'app-root', ... })
   export class AppComponent {}

   // app.component.ts — AFTER
   @Component({
     selector: 'app-root',
     host: { '[attr.data-theme]': 'themeService.currentTheme()' },
     ...
   })
   export class AppComponent {
     protected themeService = inject(ThemeService);
   }
   ```

7. **Wrap raw elements** — replace native HTML with HDS components.
   <!-- ADD-HERE: before/after examples for each component migration -->

   **Before/after examples for each component type:**

   **Table to DataGrid:**
   ```html
   <!-- BEFORE -->
   <table class="trade-grid">
     <thead>
       <tr>
         <th>Symbol</th>
         <th>Price</th>
         <th>Qty</th>
       </tr>
     </thead>
     <tbody>
       <tr *ngFor="let trade of trades">
         <td>{{ trade.symbol }}</td>
         <td>{{ trade.price | currency }}</td>
         <td>{{ trade.quantity }}</td>
       </tr>
     </tbody>
   </table>

   <!-- AFTER -->
   <hds-data-grid
     [data]="trades()"
     [columns]="tradeColumns"
     [sortable]="true"
     [paginator]="true"
     data-testid="trade-grid">
   </hds-data-grid>
   ```

   **Select to HDS Select:**
   ```html
   <!-- BEFORE -->
   <select formControlName="tradeType">
     <option value="buy">Buy</option>
     <option value="sell">Sell</option>
   </select>

   <!-- AFTER -->
   <hds-select formControlName="tradeType" data-testid="trade-type-select">
     <hds-option value="buy">Buy</hds-option>
     <hds-option value="sell">Sell</hds-option>
   </hds-select>
   ```

   **Button to HDS Button:**
   ```html
   <!-- BEFORE -->
   <button class="btn btn-primary" (click)="submit()">Submit Trade</button>

   <!-- AFTER -->
   <hds-button variant="primary" (click)="submit()" data-testid="submit-trade-btn">
     Submit Trade
   </hds-button>
   ```

   **Input to HDS Form Field:**
   ```html
   <!-- BEFORE -->
   <label>Amount</label>
   <input type="number" formControlName="amount" />

   <!-- AFTER -->
   <hds-form-field label="Amount">
     <hds-input type="number" formControlName="amount" data-testid="amount-input"></hds-input>
   </hds-form-field>
   ```

   After wrapping, add the HDS component imports to the standalone component's `imports` array:
   ```typescript
   import { HdsDataGridModule } from '@yourorg/hds/data-grid';
   import { HdsSelectModule } from '@yourorg/hds/select';
   import { HdsButtonModule } from '@yourorg/hds/button';
   import { HdsFormFieldModule } from '@yourorg/hds/form-field';

   @Component({
     imports: [HdsDataGridModule, HdsSelectModule, HdsButtonModule, HdsFormFieldModule],
     // ...
   })
   ```

8. Run `ng build` to verify compilation.
9. Run `ng test` to verify tests pass.
10. Run `/angular-hds-audit` again to verify compliance improved.

## Output

### Changes Applied

| Action | Files Changed | Before | After |
|--------|--------------|--------|-------|
| Color token replacement | 14 | `color: #3b82f6` | `color: var(--hds-accent-primary)` |
| Spacing token replacement | 9 | `padding: 16px` | `padding: var(--hds-space-md)` |
| Deprecated token migration | 3 | `var(--hds-blue-500)` | `var(--hds-accent-primary)` |
| Theme setup | 1 | no theme import | `@use '@yourorg/hds/themes'` |
| Theme binding | 1 | no `[data-theme]` | `[attr.data-theme]="themeService.currentTheme()"` |
| Component wrap — table | 2 | `<table>` | `<hds-data-grid>` |
| Component wrap — select | 1 | `<select>` | `<hds-select>` |
| Component wrap — button | 4 | `<button>` | `<hds-button>` |

### Verification

| Check | Status |
|-------|--------|
| `ng build` | pass |
| `ng test` | pass (42 specs, 0 failures) |
| HDS audit compliance | 66% before -> 94% after |
| Unresolved mappings | 2 (marked with `/* TODO: verify HDS token mapping */`) |

Compliance: X% before -> Y% after. Build: pass. Tests: pass.

## Validation

- Build passes after all changes
- Tests pass after all changes
- Re-audit shows improved compliance %
- No unintended style changes (visual regression check recommended)
- All `/* TODO: verify HDS token mapping */` comments are documented in the output for manual review
- HDS component imports are added to every standalone component that uses wrapped elements
- Theme switching works in both light and dark modes after theme setup
- No raw `style="..."` attributes remain in templates
