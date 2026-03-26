# Jest Migration for Angular
Source: https://jestjs.io/docs/getting-started
Last refreshed: 2026-03-24

## Installation

```bash
npm install --save-dev jest @types/jest jest-preset-angular ts-jest
```

## jest.config.ts

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterSetup: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/+(*.)+(spec|test).+(ts)'],
  transform: {
    '^.+\\.(ts|html)$': ['jest-preset-angular', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
    }],
  },
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@env/(.*)': '<rootDir>/src/environments/$1',
  },
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
```

## setup-jest.ts

```typescript
import 'jest-preset-angular/setup-jest';

// Optional: extend matchers
import '@testing-library/jest-dom';
```

## tsconfig.spec.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest"],
    "esModuleInterop": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

## Karma to Jest Migration

### Files to Remove

| Remove | Notes |
|--------|-------|
| `karma.conf.js` | Karma config |
| `src/test.ts` | Karma test entry |
| `@types/jasmine` | Jasmine types |
| `karma`, `karma-*` packages | All karma deps |
| `jasmine-core`, `@types/jasmine` | Jasmine deps |

### angular.json Changes

```jsonc
// BEFORE (Karma)
"test": {
  "builder": "@angular-devkit/build-angular:karma",
  "options": {
    "main": "src/test.ts",
    "karmaConfig": "karma.conf.js"
  }
}

// AFTER (Jest)
"test": {
  "builder": "@angular-builders/jest:run",
  "options": {
    "configPath": "jest.config.ts"
  }
}
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## TestBed Configuration with Jest

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';
import { MyService } from './my.service';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let mockService: jest.Mocked<MyService>;

  beforeEach(async () => {
    mockService = {
      getData: jest.fn().mockReturnValue(of(['item1', 'item2'])),
      save: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: MyService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

## Mocking with jest.fn()

### Basic Mock Function

```typescript
const mockCallback = jest.fn((x: number) => x * 2);
mockCallback(5);

expect(mockCallback).toHaveBeenCalledWith(5);
expect(mockCallback).toHaveBeenCalledTimes(1);
expect(mockCallback.mock.results[0].value).toBe(10);
```

### Mock Return Values

```typescript
const myMock = jest.fn();

// Single return value
myMock.mockReturnValue(42);

// Chained once-values then default
myMock
  .mockReturnValueOnce(10)
  .mockReturnValueOnce('x')
  .mockReturnValue(true);

// Async return values
myMock.mockResolvedValue({ data: 'result' });
myMock.mockRejectedValue(new Error('fail'));
```

### Mock Implementation

```typescript
const myMock = jest.fn()
  .mockImplementation(() => 'default')
  .mockImplementationOnce(() => 'first call')
  .mockImplementationOnce(() => 'second call');
```

## Mocking with jest.spyOn()

```typescript
import * as utils from './utils';

it('should spy on existing method', () => {
  const spy = jest.spyOn(utils, 'calculate').mockReturnValue(100);

  const result = utils.calculate(1, 2);

  expect(result).toBe(100);
  expect(spy).toHaveBeenCalledWith(1, 2);

  spy.mockRestore(); // restore original
});
```

### Spying on Service Methods

```typescript
it('should call service on init', () => {
  const spy = jest.spyOn(mockService, 'getData');
  component.ngOnInit();
  expect(spy).toHaveBeenCalled();
});
```

## Mocking Modules with jest.mock()

```typescript
// Full module mock
jest.mock('./my-service');

// Partial module mock
jest.mock('./utils', () => {
  const original = jest.requireActual('./utils');
  return {
    ...original,
    fetchData: jest.fn(() => Promise.resolve([])),
  };
});
```

## Async Testing

### Promise-based

```typescript
it('fetches data', async () => {
  const data = await service.fetchData();
  expect(data).toEqual(['item1']);
});
```

### Observable-based

```typescript
import { firstValueFrom } from 'rxjs';

it('emits values', async () => {
  const result = await firstValueFrom(service.getData());
  expect(result).toEqual({ id: 1 });
});
```

### fakeAsync / tick (Angular)

```typescript
import { fakeAsync, tick } from '@angular/core/testing';

it('debounces input', fakeAsync(() => {
  component.searchControl.setValue('test');
  tick(300); // advance debounce timer
  fixture.detectChanges();
  expect(component.results.length).toBeGreaterThan(0);
}));
```

## Snapshot Testing

### Component Snapshot

```typescript
it('should match snapshot', () => {
  const fixture = TestBed.createComponent(MyComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement).toMatchSnapshot();
});
```

### Inline Snapshot

```typescript
it('should match inline', () => {
  expect(component.getTitle()).toMatchInlineSnapshot(`"My App Title"`);
});
```

### Property Matchers

```typescript
it('handles dynamic values', () => {
  expect(component.getData()).toMatchSnapshot({
    id: expect.any(Number),
    createdAt: expect.any(Date),
  });
});
```

### Update Snapshots

```bash
jest --updateSnapshot    # update all
jest -u                  # shorthand
jest -u --testNamePattern="MyComponent"  # update specific
```

## Coverage Configuration

```typescript
// jest.config.ts
const config: Config = {
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/environments/**',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './src/app/core/': { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};
```

## Common Jest Matchers

| Matcher | Usage |
|---------|-------|
| `toBe(value)` | Strict equality (===) |
| `toEqual(value)` | Deep equality |
| `toBeTruthy()` | Truthy check |
| `toBeFalsy()` | Falsy check |
| `toContain(item)` | Array/string contains |
| `toThrow(error?)` | Throws error |
| `toHaveBeenCalled()` | Mock was called |
| `toHaveBeenCalledWith(args)` | Mock called with args |
| `toHaveBeenCalledTimes(n)` | Call count check |
| `toMatchSnapshot()` | Snapshot match |
| `toMatchInlineSnapshot()` | Inline snapshot |

## Jasmine to Jest Cheat Sheet

| Jasmine | Jest |
|---------|------|
| `jasmine.createSpy()` | `jest.fn()` |
| `jasmine.createSpyObj()` | `{ method: jest.fn() }` |
| `spyOn(obj, 'method').and.returnValue(v)` | `jest.spyOn(obj, 'method').mockReturnValue(v)` |
| `spyOn(obj, 'method').and.callThrough()` | `jest.spyOn(obj, 'method')` |
| `spyOn(obj, 'method').and.callFake(fn)` | `jest.spyOn(obj, 'method').mockImplementation(fn)` |
| `expect().toHaveBeenCalledWith(jasmine.any(Number))` | `expect().toHaveBeenCalledWith(expect.any(Number))` |
| `jasmine.objectContaining({})` | `expect.objectContaining({})` |
| `jasmine.arrayContaining([])` | `expect.arrayContaining([])` |
