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

Run `/angular-elevate-audit` first to understand what needs fixing.

## Inputs

- `@angular /angular-elevate-apply` — fix all issues from most recent audit
- `@angular /angular-elevate-apply --lib auth,logging` — fix specific sub-libs only
- `@angular /angular-elevate-apply src/app/trade/` — fix specific directory
- `@angular /angular-elevate-apply --dry-run` — show what would change

## Steps

1. Read most recent `/angular-elevate-audit` report (or run audit if none exists).
2. For each sub-lib with findings, load its reference doc.
3. **Per sub-lib migration:**

   **auth:**
   - Install `@yourorg/elevate/auth` if not present
   - Replace custom auth service with `ElevateAuthService`
   - Add `ElevateAuthGuard` to routes
   - Remove manual JWT handling
   <!-- ADD-HERE: before/after code examples for auth migration -->

   **logging:**
   - Install `@yourorg/elevate/logging` if not present
   - Inject `LoggingService` into each service/component using `console.*`
   - Replace `console.log` → `this.logger.info()`, `console.error` → `this.logger.error()`, `console.warn` → `this.logger.warn()`
   - Configure log levels in `app.config.ts`
   <!-- ADD-HERE: before/after code examples for logging migration -->

   **config:**
   - Replace `localStorage.getItem/setItem` with `ConfigService.get/set`
   - Centralize scattered config values
   <!-- ADD-HERE: before/after examples -->

   **common-grid:**
   - Wrap `<ag-grid-angular>` with `<elevate-grid>`
   - Apply default column definitions and theme
   <!-- ADD-HERE: before/after template examples -->

   <!-- ADD-HERE: migration steps for other sub-libs -->

4. Install any missing packages: `npm install @yourorg/elevate/{sub-lib}`.
5. Run `ng build` to verify compilation.
6. Run `ng test` to verify tests pass.
7. Run `/angular-elevate-audit` again to verify compliance improved.

## Output

| Sub-lib | Action | Files changed | Before | After |
|---------|--------|--------------|--------|-------|
| logging | Replaced console.* | 12 | `console.log(data)` | `this.logger.info(data)` |
| auth | Integrated auth service | 3 | Custom JWT | ElevateAuthService |
| common-grid | Wrapped AG Grid | 2 | Raw ag-grid | elevate-grid wrapper |

Compliance: X% before → Y% after. Build: pass. Tests: pass.

## Validation

- Build passes after all changes
- Tests pass after all changes
- Re-audit shows improved compliance %
- Each migrated sub-lib is fully functional (auth flows work, logs appear, config loads)
