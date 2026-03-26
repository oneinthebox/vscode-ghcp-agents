# Testing Guide
Source: https://angular.dev/guide/testing
Last refreshed: 2026-03-24

## Test Runner Setup

Angular 19+ uses **Vitest** with **jsdom** by default. Older projects may use Karma/Jasmine or Jest.

```bash
ng test                        # Watch mode
ng test --no-watch             # Single run (CI)
ng test --coverage             # With coverage report
ng test --browsers=chromium    # Real browser (requires @vitest/browser-playwright)
```

### angular.json test options

| Option | Purpose |
|---|---|
| `include` | Glob patterns (default: `['**/*.spec.ts', '**/*.test.ts']`) |
| `exclude` | Patterns to skip |
| `setupFiles` | Global setup files |
| `providersFile` | File exporting test-wide Angular providers |
| `coverage` | Enable coverage |
| `browsers` | Real browser testing |

## TestBed Configuration

### Standalone Components

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;
  let component: UserCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],  // standalone: import directly
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });
});
```

Note: `compileComponents()` is only required when `@defer` blocks are used.

### Overriding Providers

```typescript
await TestBed.configureTestingModule({
  imports: [UserCardComponent],
  providers: [
    { provide: UserService, useValue: mockUserService },
  ],
}).compileComponents();
```

### Global Test Providers

```typescript
// src/test-providers.ts
import { Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

const testProviders: Provider[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
];
export default testProviders;
```

Reference in `angular.json`:
```json
{ "test": { "options": { "providersFile": "src/test-providers.ts" } } }
```

## Component Testing

### Rendering and Querying

```typescript
it('should display user name', async () => {
  fixture.componentRef.setInput('name', 'Alice');
  await fixture.whenStable();

  const el: HTMLElement = fixture.nativeElement;
  expect(el.querySelector('h1')?.textContent).toContain('Alice');
});
```

### Using DebugElement

```typescript
import { By } from '@angular/platform-browser';

it('should have a button', () => {
  const btn = fixture.debugElement.query(By.css('button'));
  expect(btn).toBeTruthy();
  expect(btn.nativeElement.textContent).toContain('Save');
});
```

### Testing Inputs

```typescript
// Signal inputs
fixture.componentRef.setInput('userId', '123');
await fixture.whenStable();

// Or set directly
component.userId = input.required<string>(); // Not recommended — use setInput
```

### Testing Outputs

```typescript
it('should emit on save', () => {
  const spy = vi.fn();  // Vitest
  component.saved.subscribe(spy);

  fixture.debugElement.query(By.css('button')).triggerEventHandler('click');

  expect(spy).toHaveBeenCalledWith(expectedUser);
});
```

### Testing Signals

```typescript
it('should update computed value', async () => {
  component.price.set(100);
  component.quantity.set(3);
  await fixture.whenStable();

  expect(fixture.nativeElement.textContent).toContain('300');
});
```

### Detecting Changes

```typescript
// Automatic (preferred in Angular 19+)
await fixture.whenStable();

// Manual
fixture.detectChanges();

// For zoneless or fine-grained control
component.someSignal.set('new value');
fixture.detectChanges();
```

## Service Testing

### Simple Service

```typescript
describe('CalculatorService', () => {
  let service: CalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalculatorService);
  });

  it('should add numbers', () => {
    expect(service.add(2, 3)).toBe(5);
  });
});
```

### Service with Dependencies

```typescript
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // No outstanding requests
  });

  it('should fetch user', () => {
    const mockUser: User = { id: '1', name: 'Alice' };

    service.getUser('1').subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });
});
```

## HTTP Testing

### Setup

```typescript
providers: [
  provideHttpClient(),
  provideHttpClientTesting(),
]
```

### HttpTestingController API

| Method | Purpose |
|---|---|
| `expectOne(url)` | Expect exactly one request to URL, return it |
| `expectOne(predicate)` | Expect one request matching predicate |
| `match(url)` | Match multiple requests |
| `expectNone(url)` | Assert no requests to URL |
| `verify()` | Assert no outstanding requests |

### Request Object

| Property | Purpose |
|---|---|
| `req.request.method` | HTTP method |
| `req.request.body` | Request body |
| `req.request.headers` | Request headers |
| `req.request.params` | Query parameters |

### Response Methods

| Method | Purpose |
|---|---|
| `req.flush(body)` | Respond with data |
| `req.flush(body, { status, statusText })` | Respond with status |
| `req.error(new ProgressEvent('error'))` | Simulate network error |

### Testing POST

```typescript
it('should create user', () => {
  const newUser = { name: 'Bob' };

  service.createUser(newUser).subscribe(user => {
    expect(user.id).toBeDefined();
  });

  const req = httpMock.expectOne('/api/users');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(newUser);
  req.flush({ id: '2', ...newUser });
});
```

### Testing Error Handling

```typescript
it('should handle 404', () => {
  service.getUser('999').subscribe({
    error: (err) => expect(err.status).toBe(404),
  });

  const req = httpMock.expectOne('/api/users/999');
  req.flush('Not found', { status: 404, statusText: 'Not Found' });
});
```

## Testing Interceptors

```typescript
it('should add auth header', () => {
  const authService = TestBed.inject(AuthService);
  vi.spyOn(authService, 'getToken').mockReturnValue('test-token');

  httpClient.get('/api/data').subscribe();

  const req = httpMock.expectOne('/api/data');
  expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  req.flush({});
});
```

## Testing @defer Blocks

```typescript
TestBed.configureTestingModule({
  deferBlockBehavior: DeferBlockBehavior.Manual,
});

const fixture = TestBed.createComponent(MyComponent);
const deferBlock = (await fixture.getDeferBlocks())[0];

// Test placeholder
await deferBlock.render(DeferBlockState.Placeholder);
expect(fixture.nativeElement.textContent).toContain('Loading...');

// Test complete
await deferBlock.render(DeferBlockState.Complete);
expect(fixture.nativeElement.textContent).toContain('Loaded content');
```

## Testing Guards

```typescript
describe('authGuard', () => {
  it('should allow authenticated users', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
  });
});
```

## Mocking Patterns

### Mock Service

```typescript
const mockUserService = {
  getUser: vi.fn().mockReturnValue(of({ id: '1', name: 'Alice' })),
  saveUser: vi.fn().mockReturnValue(of(true)),
};

providers: [{ provide: UserService, useValue: mockUserService }]
```

### Spy on inject()

```typescript
const service = TestBed.inject(UserService);
vi.spyOn(service, 'getUser').mockReturnValue(of(mockUser));
```

### Jest Equivalents (if using Jest)

| Vitest | Jest |
|---|---|
| `vi.fn()` | `jest.fn()` |
| `vi.spyOn()` | `jest.spyOn()` |
| `vi.mock()` | `jest.mock()` |
| `vi.mocked()` | `jest.mocked()` |

## Setup Function Pattern

```typescript
function setup(overrides?: { providers?: Provider[] }) {
  TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: overrides?.providers ?? [],
  });
  const fixture = TestBed.createComponent(MyComponent);
  return {
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

it('should work', async () => {
  const { fixture, element } = setup();
  await fixture.whenStable();
  expect(element.textContent).toContain('Expected');
});
```
