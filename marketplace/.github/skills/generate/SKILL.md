---
name: generate
description: "Scaffold new code — components, services, routes, endpoints, models, pipes, directives. Detects the active domain (Angular, Spring Boot, FastAPI) from agent context or project files and applies the right patterns, templates, and conventions. Like ng generate but with org standards built in. Use when creating new files or features."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(ng:*) Bash(nx:*) Read Edit
---

## Domain Detection

Determine the domain from:
1. **Active agent** — @angular, @springboot, @fastapi
2. **Project files** — `package.json` with `@angular/core` → Angular; `pom.xml` → Spring; `pyproject.toml` with `fastapi` → FastAPI
3. **File context** — `.ts` → Angular/TS; `.java` → Spring; `.py` → FastAPI

## Steps

1. Detect domain.
2. Load domain-specific reference: [references/{domain}.md](references/)
4. Load domain-specific templates: [templates/{domain}/](templates/)
5. Study domain-specific examples: [examples/{domain}/](examples/)
6. Ask user what to generate (component, service, route, etc.) if not clear from prompt.
7. Apply the active agent's instructions (coding standards, internal lib usage).
8. Generate files using templates as starting point, adapting to user's request.
9. Run appropriate build/lint to verify generated code compiles.

## What it generates

### Angular (@angular)
| Type | Files created | Key patterns applied |
|------|--------------|---------------------|
| Component | `.ts`, `.html`, `.scss`, `.spec.ts` | Standalone, OnPush, inject(), TSDoc, HDS tokens, data-testid |
| Service | `.ts`, `.spec.ts` | Injectable root, error handling, @yourorg/elevate logging |
| Pipe | `.ts`, `.spec.ts` | Standalone, pure |
| Directive | `.ts`, `.spec.ts` | Standalone |
| Route | route config in `routes.ts` | Lazy-loaded, guards if applicable |
| Feature | component + service + route + tests | Full feature scaffold |

### Spring Boot (@springboot — future)
| Type | Files created |
|------|-------------|
| Controller | `Controller.java`, `ControllerTest.java` |
| Service | `Service.java`, `ServiceTest.java` |
| Repository | `Repository.java` |
| DTO | `Dto.java` |

### FastAPI (@fastapi — future)
| Type | Files created |
|------|-------------|
| Route | `route.py`, `test_route.py` |
| Service | `service.py`, `test_service.py` |
| Model | `model.py` |

## Workflow Integration

### Prerequisites

None required. `/generate` can run standalone at any time.

### Post-actions (recommended)

After generating code:
1. `/code-comment generate` on the new files — ensure TSDoc/JSDoc is present on all public APIs
2. `/test generate` for the new files — ensure test coverage from day one

### Quality chain (post-generation)

After generating files:
1. Run build verification (existing step 9)
2. Run `/code-comment audit` on generated files — report if any public APIs lack docs
3. Recommend `/test generate` if test files were not already part of the scaffold

List these as "Recommended next steps" in the summary. Do not prompt for each one.

Update `.orch/workflow/` stage status to `completed` if running within a workflow.

## Validation

- Generated files compile (`ng build` / `mvn compile` / `python -m py_compile`)
- Linter passes
- Test file is included and passes
- Follows active agent's instruction rules
