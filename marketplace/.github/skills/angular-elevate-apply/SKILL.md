---
name: angular-elevate-apply
description: "Fix @yourorg/elevate compliance issues — migrate to platform services (auth, logging, config), replace raw components with elevate-common wrappers, integrate missing sub-libraries"
references:
  - references/internal/elevate/overview.md  # ADD-HERE: elevate platform overview
allowed-tools:
  - codebase
  - terminal
  - edit

# Same sub-library registry as angular-elevate-audit.
# The skill loads only references for sub-libs being fixed.
sub-libs:
  - id: auth
    package: "@yourorg/elevate/auth"
    reference: references/internal/elevate/auth.md              # ADD-HERE
    actions: "replace custom auth with ElevateAuthService, add AuthGuard, remove manual JWT"
  - id: authorization
    package: "@yourorg/elevate/authorization"
    reference: references/internal/elevate/authorization.md     # ADD-HERE
    actions: "replace hardcoded roles with permission directives, add RoleGuard"
  - id: logging
    package: "@yourorg/elevate/logging"
    reference: references/internal/elevate/logging.md           # ADD-HERE
    actions: "replace console.* with LoggingService, configure log levels"
  - id: config
    package: "@yourorg/elevate/config"
    reference: references/internal/elevate/config.md            # ADD-HERE
    actions: "replace localStorage with ConfigService, centralize config"
  - id: preferences
    package: "@yourorg/elevate/preferences"
    reference: references/internal/elevate/preferences.md       # ADD-HERE
    actions: "replace custom settings with PreferencesService"
  - id: common-grid
    package: "@yourorg/elevate-common/grid"
    reference: references/internal/elevate/common-grid.md       # ADD-HERE
    actions: "wrap AG Grid with elevate grid, apply default configs"
  - id: common-chart
    package: "@yourorg/elevate-common/chart"
    reference: references/internal/elevate/common-chart.md      # ADD-HERE
    actions: "wrap Plotly/Chart.js with elevate chart component"
  - id: common-dialog
    package: "@yourorg/elevate-common/dialog"
    reference: references/internal/elevate/common-dialog.md     # ADD-HERE
    actions: "replace custom modals with elevate dialog service"
  # ADD-HERE: new sub-libs as elevate grows
---

## Context

Fix elevate compliance issues found by `/angular-elevate-audit`. Migrates to platform services, wraps raw components with elevate-common, and integrates missing sub-libraries. Only loads references for sub-libs being fixed — no context bloat.

When reference docs are unavailable, the skill uses generic migration patterns documented below as fallbacks.

Run `/angular-elevate-audit` first to understand what needs fixing.

## Inputs

- `@angular /angular-elevate-apply` — fix all issues from most recent audit
- `@angular /angular-elevate-apply --lib auth,logging` — fix specific sub-libs only
- `@angular /angular-elevate-apply src/app/trade/` — fix specific directory
- `@angular /angular-elevate-apply --dry-run` — show what would change

## Steps

1. Read most recent `/angular-elevate-audit` report (or run audit if none exists).
2. For each sub-lib with findings, load its reference doc. If unavailable, use the fallback patterns below.
3. **Per sub-lib migration:**

   ---

   **auth:**
   - Install `@yourorg/elevate/auth` if not present
   - Replace custom auth service with `ElevateAuthService`
   - Add `ElevateAuthGuard` to routes
   - Remove manual JWT handling
   <!-- ADD-HERE: before/after code examples for auth migration -->

   **Before/after — auth service migration:**
   ```typescript
   // BEFORE — custom auth service with manual JWT
   @Injectable({ providedIn: 'root' })
   export class AuthService {
     private tokenKey = 'auth_token';

     login(username: string, password: string): Observable<string> {
       return this.http.post<{ token: string }>('/api/auth/login', { username, password }).pipe(
         tap(res => localStorage.setItem(this.tokenKey, res.token)),
         map(res => res.token),
       );
     }

     getToken(): string | null {
       return localStorage.getItem(this.tokenKey);
     }

     isAuthenticated(): boolean {
       const token = this.getToken();
       if (!token) return false;
       const payload = JSON.parse(atob(token.split('.')[1]));
       return payload.exp > Date.now() / 1000;
     }

     logout(): void {
       localStorage.removeItem(this.tokenKey);
     }
   }

   // AFTER — ElevateAuthService
   import { ElevateAuthService } from '@yourorg/elevate/auth';

   @Injectable({ providedIn: 'root' })
   export class AuthService {
     private elevateAuth = inject(ElevateAuthService);

     login(username: string, password: string): Observable<string> {
       return this.elevateAuth.login({ username, password });
     }

     getToken(): string | null {
       return this.elevateAuth.getToken();
     }

     isAuthenticated(): boolean {
       return !this.elevateAuth.isTokenExpired();
     }

     logout(): void {
       this.elevateAuth.logout();
     }
   }
   ```

   **Before/after — route guard migration:**
   ```typescript
   // BEFORE — custom guard
   export const authGuard: CanActivateFn = (route, state) => {
     const authService = inject(AuthService);
     if (authService.isAuthenticated()) return true;
     inject(Router).navigate(['/login']);
     return false;
   };

   // AFTER — ElevateAuthGuard
   import { elevateAuthGuard } from '@yourorg/elevate/auth';

   // In app.routes.ts:
   export const routes: Routes = [
     {
       path: 'dashboard',
       canActivate: [elevateAuthGuard()],
       loadComponent: () => import('./dashboard/dashboard.component'),
     },
   ];
   ```

   ---

   **logging:**
   - Install `@yourorg/elevate/logging` if not present
   - Inject `LoggingService` into each service/component using `console.*`
   - Replace `console.log` -> `this.logger.info()`, `console.error` -> `this.logger.error()`, `console.warn` -> `this.logger.warn()`
   - Configure log levels in `app.config.ts`
   <!-- ADD-HERE: before/after code examples for logging migration -->

   **Before/after — logging migration in a service:**
   ```typescript
   // BEFORE — console.log scattered through service
   @Injectable({ providedIn: 'root' })
   export class TradeService {
     private http = inject(HttpClient);

     executeTrade(trade: Trade): Observable<TradeResult> {
       console.log('Executing trade:', trade);
       return this.http.post<TradeResult>('/api/trades', trade).pipe(
         tap(result => console.log('Trade executed:', result)),
         catchError(err => {
           console.error('Trade execution failed:', err);
           return throwError(() => err);
         }),
       );
     }
   }

   // AFTER — LoggingService
   import { LoggingService } from '@yourorg/elevate/logging';

   @Injectable({ providedIn: 'root' })
   export class TradeService {
     private http = inject(HttpClient);
     private logger = inject(LoggingService);

     executeTrade(trade: Trade): Observable<TradeResult> {
       this.logger.info('Executing trade', { context: 'TradeService', data: trade });
       return this.http.post<TradeResult>('/api/trades', trade).pipe(
         tap(result => this.logger.info('Trade executed', { context: 'TradeService', data: result })),
         catchError(err => {
           this.logger.error('Trade execution failed', { context: 'TradeService', error: err });
           return throwError(() => err);
         }),
       );
     }
   }
   ```

   **Configure log levels in `app.config.ts`:**
   ```typescript
   import { provideElevateLogging } from '@yourorg/elevate/logging';

   export const appConfig: ApplicationConfig = {
     providers: [
       provideElevateLogging({
         level: environment.production ? 'warn' : 'debug',
         enableConsole: !environment.production,
         enableRemote: environment.production,
         remoteEndpoint: '/api/logs',
       }),
       // ... other providers
     ],
   };
   ```

   **Mapping reference:**
   | Before | After |
   |--------|-------|
   | `console.log(msg)` | `this.logger.info(msg, { context })` |
   | `console.error(msg, err)` | `this.logger.error(msg, { context, error: err })` |
   | `console.warn(msg)` | `this.logger.warn(msg, { context })` |
   | `console.debug(msg)` | `this.logger.debug(msg, { context })` |
   | `console.info(msg)` | `this.logger.info(msg, { context })` |

   ---

   **config:**
   - Replace `localStorage.getItem/setItem` with `ConfigService.get/set`
   - Centralize scattered config values
   - Remove direct `environment.ts` imports where ConfigService should be used
   <!-- ADD-HERE: before/after examples -->

   **Before/after — config migration:**
   ```typescript
   // BEFORE — scattered localStorage and hardcoded values
   @Injectable({ providedIn: 'root' })
   export class SettingsService {
     getApiUrl(): string {
       return localStorage.getItem('api_url') || 'https://api.yourorg.com/v2';
     }

     getUserPreferences(): UserPrefs {
       const raw = localStorage.getItem('user_prefs');
       return raw ? JSON.parse(raw) : { theme: 'light', locale: 'en' };
     }

     saveUserPreferences(prefs: UserPrefs): void {
       localStorage.setItem('user_prefs', JSON.stringify(prefs));
     }
   }

   // AFTER — ConfigService
   import { ConfigService } from '@yourorg/elevate/config';

   @Injectable({ providedIn: 'root' })
   export class SettingsService {
     private config = inject(ConfigService);

     getApiUrl(): string {
       return this.config.get<string>('api.baseUrl');
     }

     getUserPreferences(): UserPrefs {
       return this.config.get<UserPrefs>('user.preferences', { theme: 'light', locale: 'en' });
     }

     saveUserPreferences(prefs: UserPrefs): void {
       this.config.set('user.preferences', prefs);
     }
   }
   ```

   **Configure in `app.config.ts`:**
   ```typescript
   import { provideElevateConfig } from '@yourorg/elevate/config';

   export const appConfig: ApplicationConfig = {
     providers: [
       provideElevateConfig({
         sources: [
           { type: 'remote', url: '/api/config', refreshInterval: 300000 },
           { type: 'environment', value: environment },
         ],
       }),
     ],
   };
   ```

   ---

   **common-grid:**
   - Wrap `<ag-grid-angular>` with `<elevate-grid>`
   - Apply default column definitions and theme
   <!-- ADD-HERE: before/after template examples -->

   **Before/after — grid migration:**
   ```html
   <!-- BEFORE — raw AG Grid -->
   <ag-grid-angular
     class="ag-theme-alpine"
     [rowData]="rowData"
     [columnDefs]="columnDefs"
     [pagination]="true"
     [paginationPageSize]="25"
     (gridReady)="onGridReady($event)"
     (cellClicked)="onCellClicked($event)">
   </ag-grid-angular>

   <!-- AFTER — elevate grid wrapper -->
   <elevate-grid
     [data]="rowData()"
     [columns]="columnDefs"
     [paginate]="true"
     [pageSize]="25"
     (rowSelect)="onRowSelect($event)"
     data-testid="portfolio-grid">
   </elevate-grid>
   ```

   ```typescript
   // BEFORE — component with raw AG Grid
   import { AgGridModule } from 'ag-grid-angular';

   @Component({
     imports: [AgGridModule],
     // ...
   })
   export class PortfolioComponent {
     columnDefs: ColDef[] = [
       { field: 'symbol', sortable: true, filter: true },
       { field: 'price', sortable: true, valueFormatter: params => `$${params.value}` },
       { field: 'quantity', sortable: true },
     ];
   }

   // AFTER — component with elevate grid
   import { ElevateGridModule } from '@yourorg/elevate-common/grid';

   @Component({
     imports: [ElevateGridModule],
     // ...
   })
   export class PortfolioComponent {
     columnDefs = [
       { field: 'symbol', sortable: true, filterable: true },
       { field: 'price', sortable: true, format: 'currency' },
       { field: 'quantity', sortable: true },
     ];
   }
   ```

   ---

   **common-dialog:**
   <!-- ADD-HERE: migration steps for other sub-libs -->

   **Before/after — dialog migration:**
   ```typescript
   // BEFORE — custom modal or MatDialog
   import { MatDialog } from '@angular/material/dialog';

   export class TradeComponent {
     private dialog = inject(MatDialog);

     confirmTrade(trade: Trade): void {
       const dialogRef = this.dialog.open(ConfirmDialogComponent, {
         data: { title: 'Confirm Trade', message: `Execute ${trade.type} for ${trade.symbol}?` },
       });
       dialogRef.afterClosed().subscribe(result => {
         if (result) this.executeTrade(trade);
       });
     }
   }

   // AFTER — ElevateDialogService
   import { ElevateDialogService } from '@yourorg/elevate-common/dialog';

   export class TradeComponent {
     private dialogService = inject(ElevateDialogService);

     confirmTrade(trade: Trade): void {
       this.dialogService.confirm({
         title: 'Confirm Trade',
         message: `Execute ${trade.type} for ${trade.symbol}?`,
         confirmLabel: 'Execute',
         cancelLabel: 'Cancel',
       }).subscribe(confirmed => {
         if (confirmed) this.executeTrade(trade);
       });
     }
   }
   ```

4. Install any missing packages: `npm install @yourorg/elevate/{sub-lib}`.
5. Run `ng build` to verify compilation.
6. Run `ng test` to verify tests pass.
7. Run `/angular-elevate-audit` again to verify compliance improved.

## Output

### Changes Applied

| Sub-lib | Action | Files Changed | Before | After |
|---------|--------|--------------|--------|-------|
| logging | Replaced console.* | 12 | `console.log(data)` | `this.logger.info(data, { context })` |
| logging | Configured provider | 1 | no provider | `provideElevateLogging({ level: 'debug' })` |
| auth | Integrated auth service | 3 | Custom JWT | `ElevateAuthService` |
| auth | Route guards | 1 | custom `authGuard` | `elevateAuthGuard()` |
| config | Replaced localStorage | 4 | `localStorage.getItem(...)` | `this.config.get(...)` |
| config | Configured provider | 1 | no provider | `provideElevateConfig({ sources: [...] })` |
| common-grid | Wrapped AG Grid | 2 | `<ag-grid-angular>` | `<elevate-grid>` |
| common-dialog | Replaced MatDialog | 1 | `MatDialog.open(...)` | `ElevateDialogService.confirm(...)` |

### Verification

| Check | Status |
|-------|--------|
| `ng build` | pass |
| `ng test` | pass (87 specs, 0 failures) |
| Elevate audit compliance | 45% before -> 92% after |
| Packages installed | `@yourorg/elevate/logging`, `@yourorg/elevate/auth` |

Compliance: X% before -> Y% after. Build: pass. Tests: pass.

## Validation

- Build passes after all changes
- Tests pass after all changes
- Re-audit shows improved compliance %
- Each migrated sub-lib is fully functional (auth flows work, logs appear, config loads)
- `console.log` count in source files is zero after logging migration
- No `localStorage` direct access remains after config migration
- All route guards use `elevateAuthGuard()` after auth migration
- Provider configuration is added to `app.config.ts` for each newly integrated sub-lib
- Test files are updated to use elevate testing utilities where needed
