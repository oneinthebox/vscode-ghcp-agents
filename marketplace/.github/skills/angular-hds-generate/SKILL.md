---
name: angular-hds-generate
description: "Create new Angular components with full HDS design system integration from the start — correct tokens, typography, spacing, theming, and wrapped components"
references:
  - references/internal/hds/tokens.md      # ADD-HERE: token catalog
  - references/internal/hds/theming.md     # ADD-HERE: theme configuration
  - references/internal/hds/components.md  # ADD-HERE: available HDS components
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generate new Angular components that are HDS-compliant from the start. Unlike `/angular-generate-component` (which scaffolds structure), this skill focuses specifically on design system integration: correct token usage, theming support, and HDS component selection.

Use this when the primary concern is "make it look right with our design system" rather than "scaffold the Angular boilerplate." When HDS references are unavailable, the skill uses generic token patterns that work with any CSS custom property-based design system.

## Inputs

- `@angular /angular-hds-generate data-table` — create HDS-styled data table component
- `@angular /angular-hds-generate dashboard-card --theme dark` — create with dark theme variant
- `@angular /angular-hds-generate chart-panel --component plotly` — using HDS-wrapped Plotly

## Steps

1. Read HDS component catalog from `.orch/references/internal/hds/components.md`.
   <!-- ADD-HERE: component catalog with available HDS-wrapped components -->
   If the catalog is unavailable, use the generic HDS component mapping:
   | Native Element | HDS Component | Import |
   |---------------|---------------|--------|
   | `<table>` | `<hds-data-grid>` | `@yourorg/hds/data-grid` |
   | `<select>` | `<hds-select>` | `@yourorg/hds/select` |
   | `<button>` | `<hds-button>` | `@yourorg/hds/button` |
   | `<input>` | `<hds-input>` inside `<hds-form-field>` | `@yourorg/hds/form-field` |
   | `<textarea>` | `<hds-textarea>` | `@yourorg/hds/textarea` |
   | `<dialog>` | `<hds-dialog>` | `@yourorg/hds/dialog` |
   | `<nav>` | `<hds-nav>` | `@yourorg/hds/nav` |
   | `<tabs>` | `<hds-tabs>` | `@yourorg/hds/tabs` |

2. Determine which HDS components fit the request (data grid, chart, card, form controls, etc.).

3. **Generate `.scss` file** using ONLY HDS tokens:
   <!-- ADD-HERE: examples of correct token usage patterns -->

   **Colors** — always use `var(--hds-*)` tokens, never hex/rgb:
   ```scss
   // Generic fallback token categories:
   // Text:    var(--hds-text-primary), var(--hds-text-secondary), var(--hds-text-tertiary)
   // Surface: var(--hds-surface-primary), var(--hds-surface-secondary), var(--hds-surface-elevated)
   // Border:  var(--hds-border-default), var(--hds-border-subtle)
   // Accent:  var(--hds-accent-primary), var(--hds-accent-hover), var(--hds-accent-active)
   // Feedback: var(--hds-feedback-error), var(--hds-feedback-success), var(--hds-feedback-warning)
   ```

   **Spacing** — use `var(--hds-space-*)` scale:
   ```scss
   // Generic fallback spacing scale:
   // var(--hds-space-xs)    — 4px
   // var(--hds-space-sm)    — 8px
   // var(--hds-space-sm-md) — 12px
   // var(--hds-space-md)    — 16px
   // var(--hds-space-lg)    — 24px
   // var(--hds-space-xl)    — 32px
   // var(--hds-space-2xl)   — 48px
   // var(--hds-space-3xl)   — 64px
   ```

   **Typography** — use `var(--hds-type-*)` tokens:
   ```scss
   // var(--hds-type-heading-lg)  — large headings
   // var(--hds-type-heading-md)  — section headings
   // var(--hds-type-heading-sm)  — subsection headings
   // var(--hds-type-body-lg)     — large body text
   // var(--hds-type-body-md)     — default body text
   // var(--hds-type-body-sm)     — small body text
   // var(--hds-type-caption)     — captions and labels
   ```

   **Borders** — use `var(--hds-border-*)` tokens:
   ```scss
   // var(--hds-border-radius-sm)  — small radius (4px)
   // var(--hds-border-radius-md)  — medium radius (8px)
   // var(--hds-border-radius-lg)  — large radius (12px)
   // var(--hds-border-width-sm)   — 1px
   // var(--hds-border-width-md)   — 2px
   ```

   **Full SCSS template example:**
   ```scss
   :host {
     display: block;
   }

   .dashboard-card {
     background-color: var(--hds-surface-primary);
     border: var(--hds-border-width-sm) solid var(--hds-border-default);
     border-radius: var(--hds-border-radius-md);
     padding: var(--hds-space-lg);
     color: var(--hds-text-primary);
   }

   .dashboard-card__header {
     font: var(--hds-type-heading-md);
     color: var(--hds-text-primary);
     margin-bottom: var(--hds-space-md);
     padding-bottom: var(--hds-space-sm);
     border-bottom: var(--hds-border-width-sm) solid var(--hds-border-subtle);
   }

   .dashboard-card__body {
     font: var(--hds-type-body-md);
     color: var(--hds-text-secondary);
   }

   .dashboard-card__footer {
     margin-top: var(--hds-space-lg);
     display: flex;
     gap: var(--hds-space-sm);
     justify-content: flex-end;
   }
   ```

4. **Generate `.html` template** using HDS components where available:
   <!-- ADD-HERE: full component mapping table -->

   **Template example with HDS components:**
   ```html
   <div class="dashboard-card" data-testid="dashboard-card">
     <div class="dashboard-card__header">
       <h2>{{ title() }}</h2>
     </div>

     <div class="dashboard-card__body">
       @if (loading()) {
         <hds-spinner size="md" data-testid="card-loading"></hds-spinner>
       } @else {
         <hds-data-grid
           [data]="items()"
           [columns]="columns"
           [sortable]="true"
           data-testid="card-data-grid">
         </hds-data-grid>
       }
     </div>

     <div class="dashboard-card__footer">
       <hds-button variant="secondary" (click)="cancel.emit()" data-testid="cancel-btn">
         Cancel
       </hds-button>
       <hds-button variant="primary" (click)="confirm.emit()" data-testid="confirm-btn">
         Confirm
       </hds-button>
     </div>
   </div>
   ```

5. **Add `[data-theme]` support** for light/dark mode switching.

   **Theme-aware component example:**
   ```typescript
   import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
   import { HdsDataGridModule } from '@yourorg/hds/data-grid';
   import { HdsButtonModule } from '@yourorg/hds/button';
   import { HdsSpinnerModule } from '@yourorg/hds/spinner';
   import { ThemeService } from '@yourorg/hds/theming';

   @Component({
     selector: 'app-dashboard-card',
     standalone: true,
     imports: [HdsDataGridModule, HdsButtonModule, HdsSpinnerModule],
     templateUrl: './dashboard-card.component.html',
     styleUrl: './dashboard-card.component.scss',
     changeDetection: ChangeDetectionStrategy.OnPush,
     host: {
       '[attr.data-theme]': 'themeService.currentTheme()',
       'class': 'dashboard-card-host',
     },
   })
   export class DashboardCardComponent {
     /** Card title displayed in the header. */
     title = input.required<string>();

     /** Whether the card is loading data. */
     loading = input<boolean>(false);

     /** Data items displayed in the grid. */
     items = input<unknown[]>([]);

     /** Emitted when the user clicks Cancel. */
     cancel = output<void>();

     /** Emitted when the user clicks Confirm. */
     confirm = output<void>();

     protected themeService = inject(ThemeService);

     /** Column definitions for the data grid. */
     columns = [
       { field: 'name', header: 'Name', sortable: true },
       { field: 'value', header: 'Value', sortable: true },
       { field: 'status', header: 'Status' },
     ];
   }
   ```

6. **Generate `.spec.ts`** with visual regression test stubs.
   <!-- ADD-HERE: visual test patterns -->

   **Test file template:**
   ```typescript
   import { ComponentFixture, TestBed } from '@angular/core/testing';
   import { DashboardCardComponent } from './dashboard-card.component';
   import { ThemeService } from '@yourorg/hds/theming';

   describe('DashboardCardComponent', () => {
     let component: DashboardCardComponent;
     let fixture: ComponentFixture<DashboardCardComponent>;

     beforeEach(async () => {
       await TestBed.configureTestingModule({
         imports: [DashboardCardComponent],
         providers: [
           { provide: ThemeService, useValue: { currentTheme: () => 'light' } },
         ],
       }).compileComponents();

       fixture = TestBed.createComponent(DashboardCardComponent);
       component = fixture.componentInstance;
       fixture.componentRef.setInput('title', 'Test Card');
       fixture.detectChanges();
     });

     it('should create', () => {
       expect(component).toBeTruthy();
     });

     it('should display the title', () => {
       const header = fixture.nativeElement.querySelector('.dashboard-card__header h2');
       expect(header.textContent).toContain('Test Card');
     });

     it('should show spinner when loading', () => {
       fixture.componentRef.setInput('loading', true);
       fixture.detectChanges();
       const spinner = fixture.nativeElement.querySelector('[data-testid="card-loading"]');
       expect(spinner).toBeTruthy();
     });

     it('should emit cancel event', () => {
       const spy = jest.fn();
       component.cancel.subscribe(spy);
       const btn = fixture.nativeElement.querySelector('[data-testid="cancel-btn"]');
       btn.click();
       expect(spy).toHaveBeenCalled();
     });

     it('should emit confirm event', () => {
       const spy = jest.fn();
       component.confirm.subscribe(spy);
       const btn = fixture.nativeElement.querySelector('[data-testid="confirm-btn"]');
       btn.click();
       expect(spy).toHaveBeenCalled();
     });

     // Visual regression test stubs — integrate with your screenshot tool
     it('should match visual snapshot (light theme)', () => {
       // TODO: integrate with Chromatic, Percy, or Playwright visual comparison
       // expect(await takeScreenshot(fixture)).toMatchSnapshot('dashboard-card-light');
     });

     it('should match visual snapshot (dark theme)', () => {
       // TODO: switch theme and compare
       // fixture.componentRef.setInput('theme', 'dark');
       // fixture.detectChanges();
       // expect(await takeScreenshot(fixture)).toMatchSnapshot('dashboard-card-dark');
     });
   });
   ```

7. Run `ng build` to verify compilation.

## Output

Generated files:
- `{name}.component.ts` — standalone, OnPush, signals, theme-aware via `host` binding
- `{name}.component.html` — HDS components, `@if`/`@for` control flow, `data-testid` attributes
- `{name}.component.scss` — 100% HDS tokens, theme-aware, `:host { display: block }`
- `{name}.component.spec.ts` — tests including visual regression stubs

### Token Compliance Summary

| Category | Token Pattern Used | Count |
|----------|-------------------|-------|
| Colors | `var(--hds-text-*)`, `var(--hds-surface-*)` | {n} |
| Spacing | `var(--hds-space-*)` | {n} |
| Typography | `var(--hds-type-*)` | {n} |
| Borders | `var(--hds-border-*)` | {n} |
| Hardcoded values | — | 0 |

## Validation

- Zero hardcoded color/spacing values in generated `.scss`
- All interactive elements use HDS components (no raw `<button>`, `<select>`, `<table>`)
- Theme switching works (light/dark) via `[data-theme]` host binding
- Build passes
- All tests pass, including rendering and event emission tests
- `data-testid` attributes are present on all key interactive elements
- Component follows standalone + OnPush + signals conventions
