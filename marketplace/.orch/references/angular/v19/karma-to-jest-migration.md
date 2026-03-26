# Karma to Jest Migration Guide
Source: Curated from Angular, Jest, and jest-preset-angular documentation
Last refreshed: 2026-03-25

## Overview

Migrate Angular unit tests from Karma + Jasmine to Jest using `jest-preset-angular`. Jest is faster (parallel workers, no browser), simpler to configure, and has better DX (snapshot testing, built-in mocking, watch mode).

## Dependency Changes

### Remove

```bash
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine \
  karma-jasmine-html-reporter @types/jasmine jasmine-core
```

### Remove Files

| File | Action |
|------|--------|
| `karma.conf.js` | Delete |
| `src/test.ts` | Delete (Karma bootstrap file) |

### Install

```bash
npm install -D jest jest-preset-angular @types/jest ts-node
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

## Config Migration

### Karma (karma.conf.js) -- Before
```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: { clearContext: false },
    coverageReporter: { dir: require('path').join(__dirname, './coverage'), reporters: [{ type: 'html' }, { type: 'text-summary' }] },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
```

### Jest (jest.config.ts) -- After
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterSetup: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.routes.ts',
    '!src/main.ts',
    '!src/**/*.d.ts'
  ],
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@env/(.*)': '<rootDir>/src/environments/$1'
  },
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)']
};

export default config;
```

### setup-jest.ts
```typescript
import 'jest-preset-angular/setup-jest';

// Optional: global mocks
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({ display: 'none', appearance: ['-webkit-appearance'] }),
});
```

## angular.json Changes

### Before (Karma)
```json
{
  "test": {
    "builder": "@angular-devkit/build-angular:karma",
    "options": {
      "polyfills": ["zone.js", "zone.js/testing"],
      "tsConfig": "tsconfig.spec.json",
      "karmaConfig": "karma.conf.js",
      "assets": ["src/assets"],
      "styles": ["src/styles.scss"],
      "scripts": []
    }
  }
}
```

### After (Jest)
```json
{
  "test": {
    "builder": "@angular-builders/jest:run",
    "options": {
      "tsConfig": "tsconfig.spec.json"
    }
  }
}
```

> Install `@angular-builders/jest` if using the Angular CLI builder approach:
> `npm install -D @angular-builders/jest`

Alternatively, run Jest directly via `npx jest` and skip the angular.json builder entirely.

## tsconfig.spec.json Changes

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

> Remove `"jasmine"` from the `types` array. Replace with `"jest"`.

## API Mapping: Karma/Jasmine to Jest

| Jasmine (Karma) | Jest | Notes |
|-----------------|------|-------|
| `describe()` | `describe()` | Same |
| `it()` | `it()` / `test()` | Same; `test()` is alias |
| `expect()` | `expect()` | Same (mostly compatible) |
| `beforeEach()` | `beforeEach()` | Same |
| `afterEach()` | `afterEach()` | Same |
| `beforeAll()` | `beforeAll()` | Same |
| `afterAll()` | `afterAll()` | Same |
| `jasmine.createSpy('name')` | `jest.fn()` | Jest mock function |
| `jasmine.createSpyObj('name', ['m1', 'm2'])` | See below | No direct equivalent |
| `spyOn(obj, 'method')` | `jest.spyOn(obj, 'method')` | Same concept |
| `spy.and.returnValue(val)` | `jest.spyOn(...).mockReturnValue(val)` | Different chaining |
| `spy.and.callFake(fn)` | `jest.spyOn(...).mockImplementation(fn)` | Different chaining |
| `spy.and.throwError(err)` | `jest.spyOn(...).mockImplementation(() => { throw err })` | Manual throw |
| `spy.calls.count()` | `mockFn.mock.calls.length` | Access via `.mock` |
| `spy.calls.mostRecent()` | `mockFn.mock.calls[mockFn.mock.calls.length - 1]` | Last call args |
| `spy.calls.reset()` | `mockFn.mockClear()` | Clear call history |
| `jasmine.anything()` | `expect.anything()` | Same |
| `jasmine.objectContaining({})` | `expect.objectContaining({})` | Same |
| `jasmine.arrayContaining([])` | `expect.arrayContaining([])` | Same |
| `expect().toHaveBeenCalled()` | `expect().toHaveBeenCalled()` | Same |
| `expect().toHaveBeenCalledWith()` | `expect().toHaveBeenCalledWith()` | Same |
| `expect().toHaveBeenCalledTimes(n)` | `expect().toHaveBeenCalledTimes(n)` | Same |
| `expect(x).toEqual(y)` | `expect(x).toEqual(y)` | Same |
| `expect(x).toBe(y)` | `expect(x).toBe(y)` | Same |
| `expect(x).toBeTruthy()` | `expect(x).toBeTruthy()` | Same |
| `expect(x).toThrow()` | `expect(x).toThrow()` | Same |
| N/A | `expect(x).toMatchSnapshot()` | Jest-only: snapshot testing |
| N/A | `expect(x).toMatchInlineSnapshot()` | Jest-only: inline snapshot |

### createSpyObj Replacement Pattern

```typescript
// Jasmine
const mockService = jasmine.createSpyObj('UserService', ['getUser', 'saveUser']);
mockService.getUser.and.returnValue(of({ name: 'Test' }));

// Jest
const mockService = {
  getUser: jest.fn().mockReturnValue(of({ name: 'Test' })),
  saveUser: jest.fn()
};
```

## Angular Testing Utilities (unchanged)

| Utility | Works in Jest? | Notes |
|---------|---------------|-------|
| `TestBed.configureTestingModule()` | Yes | No changes needed |
| `ComponentFixture` | Yes | Same API |
| `fakeAsync() / tick()` | Yes | Requires zone.js/testing |
| `waitForAsync()` | Yes | Same |
| `inject()` | Yes | Same |
| `HttpClientTestingModule` | Yes | Same |
| `RouterTestingModule` | Yes | Same (deprecated in v19, use `provideRouter`) |

## Coverage Configuration

| Aspect | Karma | Jest |
|--------|-------|------|
| Config location | `karma.conf.js` `coverageReporter` | `jest.config.ts` `coverageDirectory` + `coverageReporters` |
| Instrument code | `karma-coverage` plugin (Istanbul) | Built-in (Istanbul via `--coverage`) |
| Threshold enforcement | karma-coverage-istanbul-reporter | `coverageThreshold` in jest.config |
| CI reporter | `text-summary` | `text-summary`, `lcov`, `cobertura` |

### Jest Coverage Thresholds
```typescript
// jest.config.ts
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## CI Pipeline Changes

| Aspect | Karma | Jest |
|--------|-------|------|
| Browser needed | Yes (Chrome/ChromeHeadless) | No (runs in Node.js via jsdom) |
| Docker image | Needs Chrome installed | Standard Node.js image |
| CI command | `ng test --no-watch --browsers=ChromeHeadless` | `npx jest --ci --coverage` |
| Speed | Slower (browser startup) | Faster (no browser, parallel workers) |
| Parallel | Limited | `--maxWorkers=50%` (default) |

### GitHub Actions Example

```yaml
# Before (Karma)
- run: npm run test -- --no-watch --browsers=ChromeHeadless --code-coverage

# After (Jest)
- run: npx jest --ci --coverage --maxWorkers=50%
```

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|---------|
| `zone.js` errors | Missing zone.js test setup | Ensure `import 'jest-preset-angular/setup-jest'` in `setup-jest.ts` |
| `SyntaxError: Unexpected token 'export'` | ESM packages not transformed | Add package to `transformIgnorePatterns`: `node_modules/(?!package-name)` |
| Path aliases not resolving | `@app/*` etc. not mapped | Add `moduleNameMapper` in `jest.config.ts` matching `tsconfig.paths` |
| `document is not defined` | DOM API used without jsdom | `jest-preset-angular` sets `testEnvironment: 'jsdom'` by default |
| CSS/SCSS import errors | Jest cannot parse styles | `jest-preset-angular` handles this; ensure `stringifyContentPathRegex` is set |
| `Cannot find module './file.html'` | Template not resolved | Ensure `transform` config includes `.html` |
| Slow test startup | Large test suite compiling | Use `--maxWorkers=50%`; enable `isolatedModules: true` in tsconfig.spec |
| `ReferenceError: jest is not defined` | Missing `@types/jest` | `npm install -D @types/jest`; add `"jest"` to tsconfig `types` |
| Snapshot testing of components | New to team | Use `fixture.debugElement.nativeElement.innerHTML` with `toMatchSnapshot()` |
| `fakeAsync` not working | Missing zone.js/testing patch | `setup-jest.ts` must import `jest-preset-angular/setup-jest` which patches zone |
