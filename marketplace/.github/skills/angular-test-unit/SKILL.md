---
name: angular-test-unit
description: "Generate Jest unit tests following org conventions. TestBed setup, ng-mocks patterns, one-assertion-per-test guideline. Produces spec files that pass on first run."
references:
  - references/angular/v19/testing-guide.md
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
   b. Mock HTTP calls with `HttpClientTestingModule`.
   c. Test public methods, error handling, and observable chains.
6. For **pipes/directives**:
   a. Test transform logic directly (pipes) or host-element behavior (directives).
7. Generate the `.spec.ts` file adjacent to the source file.
8. Run `npx jest --testPathPattern {spec_file}` to verify all tests pass.
9. If `--coverage` specified, run coverage and report results.

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
