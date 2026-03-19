---
description: "Usage patterns for @yourorg internal libraries: elevate (auth, logging, config), elevate-common (components), and hds (design system). Always prefer internal lib components over raw third-party equivalents."
applyTo: "**/*.ts, **/*.html"
---

## @yourorg Library Ecosystem

```
@yourorg/elevate          → Platform services (auth, logging, config, preferences)
@yourorg/elevate-common   → Shared UI components
@yourorg/hds              → Design system (theming for PrimeNG, AG Grid, Plotly)
```

## @yourorg/elevate — Platform Services

### Authentication
```typescript
// ✅ Always use Elevate AuthService
import { AuthService } from '@yourorg/elevate';

export class AppComponent {
  private readonly auth = inject(AuthService);
  readonly user$ = this.auth.currentUser$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;
}

// ❌ Never implement custom auth
// ❌ Never call auth endpoints directly
// ❌ Never store tokens manually
```

### Logging
```typescript
// ✅ Structured logging via Elevate
import { LoggingService } from '@yourorg/elevate';

export class TradeService {
  private readonly logger = inject(LoggingService);

  createTrade(order: CreateTradeOrder) {
    this.logger.info('Creating trade', { instrument: order.instrument, side: order.side });
    // ...
    this.logger.error('Trade creation failed', { error, orderId: order.id });
  }
}

// ❌ Never use console.log/warn/error in production code
```

### Configuration
```typescript
// ✅ All config via Elevate ConfigService
import { ConfigService } from '@yourorg/elevate';

export class TradeService {
  private readonly config = inject(ConfigService);
  private readonly apiUrl = this.config.get('tradeApi.baseUrl');
  private readonly retryCount = this.config.get<number>('tradeApi.retryCount', 3);
}

// ❌ Never use environment.ts for API URLs
// ❌ Never hardcode config values
```

### Preferences
```typescript
// ✅ User preferences via Elevate
import { PreferencesService } from '@yourorg/elevate';

export class DashboardComponent {
  private readonly prefs = inject(PreferencesService);
  readonly theme$ = this.prefs.get<string>('ui.theme', 'light');
  readonly layout$ = this.prefs.get<DashboardLayout>('dashboard.layout');

  saveLayout(layout: DashboardLayout) {
    this.prefs.set('dashboard.layout', layout);
  }
}

// ❌ Never use localStorage/sessionStorage directly
```

## @yourorg/elevate-common — Shared Components

Use Elevate Common components for all standard UI elements. These wrap and extend base primitives with org-standard behavior.

```html
<!-- ✅ Use @yourorg/elevate-common components -->
<org-button variant="primary" [loading]="isSubmitting" (clicked)="onSubmit()">
  Submit Trade
</org-button>

<org-form-field label="Instrument" [required]="true" [errors]="instrumentErrors">
  <org-input formControlName="instrument" placeholder="Search instruments..." />
</org-form-field>

<org-data-table [data]="trades" [columns]="columns" [paginator]="true" />

<!-- ❌ Don't use raw HTML or third-party components directly -->
<button class="btn btn-primary">Submit</button>
<input type="text" />
<p-table [value]="trades">...</p-table>
```

### Import from public API
```typescript
// ✅
import { ButtonComponent, FormFieldComponent, DataTableComponent } from '@yourorg/elevate-common';

// ❌ Deep imports
import { ButtonComponent } from '@yourorg/elevate-common/src/lib/button/button.component';
```

## @yourorg/hds — Design System

HDS provides theming that wraps PrimeNG, AG Grid, and Plotly with org-standard look and feel.

### CSS Custom Properties (Design Tokens)
Always use HDS tokens — never hardcode colors, spacing, typography, or breakpoints.

```scss
// ✅ HDS tokens
.trade-card {
  background: var(--hds-surface-primary);
  color: var(--hds-text-primary);
  padding: var(--hds-spacing-md);
  border: 1px solid var(--hds-border-default);
  border-radius: var(--hds-border-radius-md);
  font-family: var(--hds-font-family);
  font-size: var(--hds-font-size-body);
  box-shadow: var(--hds-shadow-sm);
}

// ❌ Hardcoded values
.trade-card {
  background: #fff;
  color: #333;
  padding: 16px;
}
```

### Themed Components
```typescript
// ✅ HDS-themed PrimeNG (preferred component library)
import { HdsPrimeNgModule } from '@yourorg/hds';

// ✅ HDS-themed AG Grid (for advanced data grids)
import { HdsAgGridModule } from '@yourorg/hds';

// ✅ HDS-themed Plotly (for charts/visualizations)
import { HdsPlotlyModule } from '@yourorg/hds';

// ❌ Raw third-party — always use HDS-themed wrappers
import { ButtonModule } from 'primeng/button';
import { AgGridModule } from 'ag-grid-angular';
import { PlotlyModule } from 'angular-plotly.js';
```

### Theme Switching
```typescript
// ✅
import { HdsThemeService } from '@yourorg/hds';

export class AppComponent {
  private readonly theme = inject(HdsThemeService);

  toggleTheme() {
    this.theme.toggle(); // switches between light/dark
  }
}
```

## General Rules

1. **Always import from the public API** (`@yourorg/package`) — never deep imports
2. **Always prefer @yourorg components** over raw third-party equivalents
3. **Always use HDS design tokens** — never hardcode visual values
4. **Always use Elevate services** for auth, logging, config, preferences
5. **Check @yourorg package versions** against the compatibility matrix before upgrading Angular
