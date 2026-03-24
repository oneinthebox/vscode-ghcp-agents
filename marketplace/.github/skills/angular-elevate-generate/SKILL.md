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

Use this when building something that needs platform services wired in from day one.

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
3. **Generate service** (if applicable):
   - Inject `LoggingService` (not `console`)
   - Inject `ConfigService` (not `environment.ts`)
   - Add `ElevateAuthService` guard if auth-protected
   - Follow inject() pattern (not constructor injection)
   <!-- ADD-HERE: service template with elevate imports -->
4. **Generate component** (if applicable):
   - Use elevate-common components: `<elevate-grid>`, `<elevate-chart>`, `<elevate-dialog>`
   - Wire up HDS tokens for styling (delegate to `/angular-hds-generate` if design-heavy)
   - Add logging in lifecycle hooks where appropriate
   <!-- ADD-HERE: component template with elevate-common imports -->
5. **Generate tests:**
   - Mock elevate services using `provideElevateTesting()` utilities
   - Test auth guard integration
   - Test logging calls
   <!-- ADD-HERE: test template patterns -->
6. Run `ng build` to verify compilation.
7. Run `ng test` to verify tests pass.

## Output

Generated files:
- `{name}.service.ts` / `{name}.component.ts` — with elevate services injected
- `{name}.component.html` — with elevate-common components (if applicable)
- `{name}.component.scss` — HDS tokens (delegates to HDS skills for styling)
- `{name}.spec.ts` — tests with elevate mocks

Elevate sub-libs used: [list of sub-libs integrated]

## Validation

- All elevate imports resolve correctly
- No `console.log` in generated code (uses LoggingService)
- No `localStorage` in generated code (uses ConfigService)
- Auth-protected routes have ElevateAuthGuard
- Build passes
- Tests pass
