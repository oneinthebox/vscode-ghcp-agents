---
name: angular-test-unit
description: "Generate Jest unit tests following org conventions. TestBed setup, ng-mocks patterns, one-assertion-per-test guideline. Produces spec files that pass on first run."
references:
  - references/angular/v19/testing-guide.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates Jest unit tests for Angular components, services, directives, and pipes. Uses TestBed for component tests and ng-mocks (MockRender, MockProvider, MockComponent) for dependency isolation. All tests follow the org convention: behavior-driven descriptions, data-testid selectors, no Karma.

## Inputs

- **target**: File path or component/service name to test
- Optional: `--coverage` — run coverage after generation
- Optional: `--edge-cases` — include boundary and error-path tests
- Optional: `--min-coverage {N}` — fail if coverage below threshold

## Steps

1. Read the target source file and its dependencies (imports, injected services).
2. Load testing conventions from `references/angular/v19/testing-guide.md`.
3. Determine the unit type: component, service, directive, pipe, guard, resolver.
4. For **components**:
   a. Create TestBed configuration with `MockComponent` for child components.
   b. Use `MockProvider` for injected services.
   c. Use `MockRender` to instantiate the component under test.
   d. Write tests for template bindings, event handlers, and lifecycle hooks.
5. For **services**:
   a. Use `TestBed.inject()` for the service under test.
   b. Mock HTTP calls with `provideHttpClientTesting()` (Angular 19 pattern).
   c. Test public methods, error handling, and observable chains.
6. For **pipes/directives**:
   a. Test transform logic directly (pipes) or host-element behavior (directives).
7. Generate the `.spec.ts` file adjacent to the source file.
8. Run `npx jest --testPathPattern {spec_file}` to verify all tests pass.
9. If `--coverage` specified, run coverage and report results.

### TestBed Configuration — Standalone Components (Angular 19 default)

Standalone components use `imports` directly on the component decorator. The TestBed configuration does NOT use a `declarations` array:

```typescript
// trade-blotter.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockProvider } from 'ng-mocks';
import { TradeBlotterComponent } from './trade-blotter.component';
import { TradeTableComponent } from '../trade-table/trade-table.component';
import { TradeService } from '../../services/trade.service';
import { of } from 'rxjs';

describe('TradeBlotterComponent', () => {
  let component: TradeBlotterComponent;
  let fixture: ComponentFixture<TradeBlotterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Standalone components go in 'imports', NOT 'declarations'
      imports: [
        TradeBlotterComponent,
        MockComponent(TradeTableComponent),
      ],
      providers: [
        MockProvider(TradeService, {
          getTrades: () => of([{ id: '1', symbol: 'AAPL', status: 'filled' }]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TradeBlotterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render trade table with loaded trades', () => {
    const table = fixture.nativeElement.querySelector('app-trade-table');
    expect(table).toBeTruthy();
  });
});
```

### TestBed Configuration — NgModule Components (legacy pattern)

For components that have NOT been migrated to standalone:

```typescript
await TestBed.configureTestingModule({
  // NgModule components go in 'declarations'
  declarations: [
    LegacyDashboardComponent,
    MockComponent(LegacySidebarComponent),
  ],
  imports: [SharedModule],
  providers: [MockProvider(DashboardService)],
}).compileComponents();
```

### Signal Testing Patterns (Angular 19)

Testing components that use `input()`, `output()`, and `computed()` signals:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { PriceBadgeComponent } from './price-badge.component';

describe('PriceBadgeComponent', () => {
  let fixture: ComponentFixture<PriceBadgeComponent>;
  let componentRef: ComponentRef<PriceBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceBadgeComponent);
    componentRef = fixture.componentRef;
  });

  it('should set input signal and check computed value', () => {
    // Set signal inputs via componentRef.setInput()
    componentRef.setInput('price', 150.25);
    componentRef.setInput('previousPrice', 148.00);
    fixture.detectChanges();

    // The computed 'changePercent' signal should derive from price inputs
    expect(fixture.componentInstance.changePercent()).toBeCloseTo(1.52, 1);

    // Verify rendered output
    const badge = fixture.nativeElement.querySelector('[data-testid="price-change"]');
    expect(badge.textContent).toContain('+1.52%');
    expect(badge.classList).toContain('price-up');
  });

  it('should emit output signal on click', () => {
    const spy = jest.fn();
    fixture.componentInstance.priceClicked.subscribe(spy);
    componentRef.setInput('price', 150.25);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="price-badge"]').click();
    expect(spy).toHaveBeenCalledWith(150.25);
  });
});
```

### Service Testing with HttpClientTestingModule

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TradeService } from './trade.service';

describe('TradeService', () => {
  let service: TradeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TradeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no unmatched HTTP requests remain
    httpMock.verify();
  });

  it('should fetch trades via GET', () => {
    const mockTrades = [{ id: '1', symbol: 'AAPL' }, { id: '2', symbol: 'GOOGL' }];

    service.getTrades().subscribe((trades) => {
      expect(trades).toHaveLength(2);
      expect(trades[0].symbol).toBe('AAPL');
    });

    const req = httpMock.expectOne('/api/trades');
    expect(req.request.method).toBe('GET');
    req.flush(mockTrades);
  });

  it('should handle 500 error with logging', () => {
    service.getTrades().subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/trades');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});
```

### ng-mocks Usage — MockRender for Component Integration

```typescript
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { OrderFormComponent } from './order-form.component';
import { OrderService } from '../../services/order.service';

describe('OrderFormComponent (ng-mocks)', () => {
  beforeEach(() =>
    MockBuilder(OrderFormComponent)
      .mock(OrderService, {
        submitOrder: jest.fn().mockReturnValue(of({ orderId: 'ORD-001' })),
      })
  );

  it('should call OrderService.submitOrder on form submit', () => {
    const fixture = MockRender(OrderFormComponent);
    const orderService = ngMocks.findInstance(OrderService);

    // Fill form fields via data-testid selectors
    ngMocks.change('[data-testid="symbol-input"]', 'AAPL');
    ngMocks.change('[data-testid="quantity-input"]', '100');
    ngMocks.trigger('[data-testid="submit-btn"]', 'click');

    expect(orderService.submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', quantity: 100 })
    );
  });
});
```

### Coverage Thresholds

Configure Jest coverage thresholds in `jest.config.ts` to enforce minimum standards:

```typescript
// jest.config.ts
export default {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Stricter thresholds for critical services
    './src/app/services/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

Run with coverage: `npx jest --coverage --coverageReporters=text-summary`.

## Output

```markdown
## Unit Tests Generated — {target}

### Stats
| Metric       | Value          |
|--------------|----------------|
| Test file    | `{path}.spec.ts` |
| Test count   | {n}            |
| All passing  | Yes / No       |
| Coverage     | {lines}% lines |

### Tests Created
- {describe block}: {test descriptions list}

### Mocking Summary
| Dependency       | Mock Strategy         |
|------------------|-----------------------|
| {ServiceName}    | MockProvider           |
| {ChildComponent} | MockComponent          |
```

## Validation

- All generated tests pass on first run
- ng-mocks used for all dependency mocking (no manual mock classes)
- Each test has a single primary assertion
- Test descriptions follow "should {verb} when {condition}" pattern
- No `fdescribe` or `fit` left in output
- Spec file is adjacent to source file with `.spec.ts` suffix
