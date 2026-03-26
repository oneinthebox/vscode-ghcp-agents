---
name: angular-elevate-generate
description: "Create new Angular services and components using @yourorg/elevate platform from the start — correct auth, logging, config integration and elevate-common components"
references:
  - references/internal/elevate/overview.md  # ADD-HERE: elevate platform overview
allowed-tools:
  - codebase
  - terminal
  - edit

# Same sub-library registry. Only loads references for sub-libs
# relevant to what's being generated.
sub-libs:
  - id: auth
    package: "@yourorg/elevate/auth"
    reference: references/internal/elevate/auth.md              # ADD-HERE
  - id: logging
    package: "@yourorg/elevate/logging"
    reference: references/internal/elevate/logging.md           # ADD-HERE
  - id: config
    package: "@yourorg/elevate/config"
    reference: references/internal/elevate/config.md            # ADD-HERE
  - id: common-grid
    package: "@yourorg/elevate-common/grid"
    reference: references/internal/elevate/common-grid.md       # ADD-HERE
  - id: common-chart
    package: "@yourorg/elevate-common/chart"
    reference: references/internal/elevate/common-chart.md      # ADD-HERE
  - id: common-dialog
    package: "@yourorg/elevate-common/dialog"
    reference: references/internal/elevate/common-dialog.md     # ADD-HERE
  # ADD-HERE: new sub-libs
---

## Context

Generate new Angular services and components that use @yourorg/elevate platform correctly from the start. Unlike `/angular-generate-component` (structural scaffolding) or `/angular-hds-generate` (design tokens), this skill focuses on platform service integration: auth guards, logging, config, and elevate-common wrapped components.

Use this when building something that needs platform services wired in from day one. When reference docs are unavailable, the skill uses the generic patterns documented below.

## Inputs

- `@angular /angular-elevate-generate trade-service --uses auth,logging,config` — create service using 3 elevate sub-libs
- `@angular /angular-elevate-generate portfolio-grid --component common-grid` — create component with elevate grid wrapper
- `@angular /angular-elevate-generate settings-page --uses preferences,config` — create page with settings integration

## Steps

1. Determine which elevate sub-libs are needed based on the `--uses` flag or inferred from the component type:
   - Services typically need: logging, config
   - Auth-related: auth, authorization
   - Data display: common-grid or common-chart
   - User interaction: common-dialog, preferences
2. Load only the relevant reference docs from `.orch/references/internal/elevate/`.
   - If reference docs are unavailable, use the generic template patterns below.

3. **Generate service** (if applicable):
   - Inject `LoggingService` (not `console`)
   - Inject `ConfigService` (not `environment.ts`)
   - Add `ElevateAuthService` guard if auth-protected
   - Follow inject() pattern (not constructor injection)
   <!-- ADD-HERE: service template with elevate imports -->

   **Service template with full elevate integration:**
   ```typescript
   import { Injectable, inject } from '@angular/core';
   import { HttpClient } from '@angular/common/http';
   import { Observable, catchError, tap, throwError } from 'rxjs';
   import { LoggingService } from '@yourorg/elevate/logging';
   import { ConfigService } from '@yourorg/elevate/config';
   import { ElevateAuthService } from '@yourorg/elevate/auth';

   /** Trade execution service with full elevate platform integration. */
   @Injectable({ providedIn: 'root' })
   export class TradeService {
     private readonly http = inject(HttpClient);
     private readonly logger = inject(LoggingService);
     private readonly config = inject(ConfigService);
     private readonly auth = inject(ElevateAuthService);

     /** Base API URL loaded from centralized config. */
     private readonly apiUrl = this.config.get<string>('api.trades.baseUrl');

     /**
      * Execute a trade order.
      * @param trade - The trade order to execute.
      * @returns Observable of the trade result.
      */
     executeTrade(trade: Trade): Observable<TradeResult> {
       this.logger.info('Executing trade', { context: 'TradeService', data: { symbol: trade.symbol, type: trade.type } });

       return this.http.post<TradeResult>(`${this.apiUrl}/orders`, trade).pipe(
         tap(result => {
           this.logger.info('Trade executed successfully', { context: 'TradeService', data: { orderId: result.orderId } });
         }),
         catchError(error => {
           this.logger.error('Trade execution failed', { context: 'TradeService', error });
           return throwError(() => error);
         }),
       );
     }

     /**
      * Get trades for the current authenticated user.
      * @returns Observable of the user's trade history.
      */
     getUserTrades(): Observable<Trade[]> {
       const userId = this.auth.getCurrentUserId();
       this.logger.debug('Fetching trades for user', { context: 'TradeService', data: { userId } });

       return this.http.get<Trade[]>(`${this.apiUrl}/users/${userId}/trades`).pipe(
         tap(trades => this.logger.debug('Trades loaded', { context: 'TradeService', data: { count: trades.length } })),
         catchError(error => {
           this.logger.error('Failed to load trades', { context: 'TradeService', error });
           return throwError(() => error);
         }),
       );
     }
   }
   ```

4. **Generate component** (if applicable):
   - Use elevate-common components: `<elevate-grid>`, `<elevate-chart>`, `<elevate-dialog>`
   - Wire up HDS tokens for styling (delegate to `/angular-hds-generate` if design-heavy)
   - Add logging in lifecycle hooks where appropriate
   <!-- ADD-HERE: component template with elevate-common imports -->

   **Component template with elevate-common wrappers:**
   ```typescript
   import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
   import { ElevateGridModule } from '@yourorg/elevate-common/grid';
   import { ElevateDialogService } from '@yourorg/elevate-common/dialog';
   import { LoggingService } from '@yourorg/elevate/logging';
   import { TradeService } from '../services/trade.service';

   /** Portfolio grid displaying user's trade positions with elevate platform integration. */
   @Component({
     selector: 'app-portfolio-grid',
     standalone: true,
     imports: [ElevateGridModule],
     templateUrl: './portfolio-grid.component.html',
     styleUrl: './portfolio-grid.component.scss',
     changeDetection: ChangeDetectionStrategy.OnPush,
   })
   export class PortfolioGridComponent implements OnInit {
     private readonly tradeService = inject(TradeService);
     private readonly logger = inject(LoggingService);
     private readonly dialog = inject(ElevateDialogService);

     /** Trade data for the grid. */
     readonly trades = signal<Trade[]>([]);

     /** Whether the grid is loading. */
     readonly loading = signal<boolean>(true);

     /** Grid column definitions. */
     readonly columns = [
       { field: 'symbol', header: 'Symbol', sortable: true, filterable: true },
       { field: 'type', header: 'Type', sortable: true },
       { field: 'price', header: 'Price', format: 'currency', sortable: true },
       { field: 'quantity', header: 'Qty', sortable: true },
       { field: 'status', header: 'Status' },
     ];

     ngOnInit(): void {
       this.logger.info('PortfolioGrid initialized', { context: 'PortfolioGridComponent' });
       this.loadTrades();
     }

     /** Reload trade data from the service. */
     loadTrades(): void {
       this.loading.set(true);
       this.tradeService.getUserTrades().subscribe({
         next: trades => {
           this.trades.set(trades);
           this.loading.set(false);
           this.logger.debug('Grid data loaded', { context: 'PortfolioGridComponent', data: { count: trades.length } });
         },
         error: err => {
           this.loading.set(false);
           this.logger.error('Failed to load grid data', { context: 'PortfolioGridComponent', error: err });
         },
       });
     }

     /** Handle row selection — show trade details in dialog. */
     onRowSelect(trade: Trade): void {
       this.dialog.open({
         title: `Trade Details — ${trade.symbol}`,
         content: `${trade.type} ${trade.quantity} @ ${trade.price}`,
         actions: [{ label: 'Close', role: 'cancel' }],
       });
     }
   }
   ```

   **Component HTML template:**
   ```html
   <div class="portfolio-grid" data-testid="portfolio-grid-container">
     @if (loading()) {
       <div class="portfolio-grid__loading" data-testid="portfolio-loading">
         <hds-spinner size="lg"></hds-spinner>
       </div>
     } @else {
       <elevate-grid
         [data]="trades()"
         [columns]="columns"
         [paginate]="true"
         [pageSize]="25"
         [sortable]="true"
         [filterable]="true"
         (rowSelect)="onRowSelect($event)"
         data-testid="portfolio-grid">
       </elevate-grid>
     }
   </div>
   ```

   **Component SCSS (HDS tokens):**
   ```scss
   :host {
     display: block;
   }

   .portfolio-grid {
     background-color: var(--hds-surface-primary);
     border-radius: var(--hds-border-radius-md);
     padding: var(--hds-space-lg);
   }

   .portfolio-grid__loading {
     display: flex;
     justify-content: center;
     align-items: center;
     min-height: 200px;
   }
   ```

5. **Generate tests:**
   - Mock elevate services using `provideElevateTesting()` utilities
   - Test auth guard integration
   - Test logging calls
   <!-- ADD-HERE: test template patterns -->

   **Test template for service:**
   ```typescript
   import { TestBed } from '@angular/core/testing';
   import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
   import { TradeService } from './trade.service';
   import { provideElevateTesting } from '@yourorg/elevate/testing';
   import { LoggingService } from '@yourorg/elevate/logging';
   import { ConfigService } from '@yourorg/elevate/config';

   describe('TradeService', () => {
     let service: TradeService;
     let httpMock: HttpTestingController;
     let loggerSpy: jest.Mocked<LoggingService>;

     beforeEach(() => {
       TestBed.configureTestingModule({
         imports: [HttpClientTestingModule],
         providers: [
           provideElevateTesting(),  // provides mock LoggingService, ConfigService, AuthService
           TradeService,
         ],
       });

       service = TestBed.inject(TradeService);
       httpMock = TestBed.inject(HttpTestingController);
       loggerSpy = TestBed.inject(LoggingService) as jest.Mocked<LoggingService>;
     });

     afterEach(() => httpMock.verify());

     it('should log info when executing a trade', () => {
       const trade: Trade = { symbol: 'AAPL', type: 'buy', price: 150, quantity: 10 };
       service.executeTrade(trade).subscribe();

       const req = httpMock.expectOne(r => r.url.includes('/orders'));
       req.flush({ orderId: '123', status: 'filled' });

       expect(loggerSpy.info).toHaveBeenCalledWith(
         'Executing trade',
         expect.objectContaining({ context: 'TradeService' }),
       );
     });

     it('should log error when trade fails', () => {
       const trade: Trade = { symbol: 'AAPL', type: 'buy', price: 150, quantity: 10 };
       service.executeTrade(trade).subscribe({ error: () => {} });

       const req = httpMock.expectOne(r => r.url.includes('/orders'));
       req.error(new ErrorEvent('Network error'));

       expect(loggerSpy.error).toHaveBeenCalledWith(
         'Trade execution failed',
         expect.objectContaining({ context: 'TradeService' }),
       );
     });
   });
   ```

   **Test template for component:**
   ```typescript
   import { ComponentFixture, TestBed } from '@angular/core/testing';
   import { PortfolioGridComponent } from './portfolio-grid.component';
   import { provideElevateTesting } from '@yourorg/elevate/testing';
   import { TradeService } from '../services/trade.service';
   import { of } from 'rxjs';

   describe('PortfolioGridComponent', () => {
     let component: PortfolioGridComponent;
     let fixture: ComponentFixture<PortfolioGridComponent>;
     let tradeServiceSpy: jest.Mocked<TradeService>;

     beforeEach(async () => {
       const mockTradeService = {
         getUserTrades: jest.fn().mockReturnValue(of([
           { symbol: 'AAPL', type: 'buy', price: 150, quantity: 10, status: 'filled' },
         ])),
       };

       await TestBed.configureTestingModule({
         imports: [PortfolioGridComponent],
         providers: [
           provideElevateTesting(),
           { provide: TradeService, useValue: mockTradeService },
         ],
       }).compileComponents();

       fixture = TestBed.createComponent(PortfolioGridComponent);
       component = fixture.componentInstance;
       tradeServiceSpy = TestBed.inject(TradeService) as jest.Mocked<TradeService>;
     });

     it('should create', () => {
       expect(component).toBeTruthy();
     });

     it('should load trades on init', () => {
       fixture.detectChanges();
       expect(tradeServiceSpy.getUserTrades).toHaveBeenCalled();
       expect(component.trades()).toHaveLength(1);
       expect(component.loading()).toBe(false);
     });

     it('should show spinner while loading', () => {
       component.loading.set(true);
       fixture.detectChanges();
       const spinner = fixture.nativeElement.querySelector('[data-testid="portfolio-loading"]');
       expect(spinner).toBeTruthy();
     });

     it('should show grid when loaded', () => {
       fixture.detectChanges();
       const grid = fixture.nativeElement.querySelector('[data-testid="portfolio-grid"]');
       expect(grid).toBeTruthy();
     });
   });
   ```

6. Run `ng build` to verify compilation.
7. Run `ng test` to verify tests pass.

## Output

Generated files:
- `{name}.service.ts` / `{name}.component.ts` — with elevate services injected via `inject()`
- `{name}.component.html` — with elevate-common components (`<elevate-grid>`, `<elevate-chart>`, etc.)
- `{name}.component.scss` — HDS tokens (delegates to HDS skills for styling)
- `{name}.spec.ts` — tests with `provideElevateTesting()` mocks

### Elevate Integration Summary

| Sub-lib | Usage | Import |
|---------|-------|--------|
| logging | `inject(LoggingService)` — info, error, debug calls | `@yourorg/elevate/logging` |
| config | `inject(ConfigService)` — API URLs, feature flags | `@yourorg/elevate/config` |
| auth | `inject(ElevateAuthService)` — token, user ID | `@yourorg/elevate/auth` |
| common-grid | `<elevate-grid>` — data display | `@yourorg/elevate-common/grid` |
| common-dialog | `inject(ElevateDialogService)` — confirmations | `@yourorg/elevate-common/dialog` |

## Validation

- All elevate imports resolve correctly
- No `console.log` in generated code (uses LoggingService)
- No `localStorage` in generated code (uses ConfigService)
- No `environment.ts` direct imports (uses ConfigService)
- Auth-protected routes have ElevateAuthGuard
- All DI uses `inject()` function, not constructor injection
- LoggingService calls include `context` parameter for traceability
- Build passes
- Tests pass with `provideElevateTesting()` mocks
- Component uses standalone + OnPush + signals patterns
