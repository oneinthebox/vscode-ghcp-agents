---
name: angular-elevate-add
description: "Add an optional elevate library to an existing Angular project — installs the package, configures providers, wires imports, generates usage example. Works with any elevate-lib or elevate-component."
references:
  - references/internal/elevate/overview.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Add an optional Elevate library to an existing Angular project. This skill handles the full lifecycle: package installation, provider configuration, import wiring, and usage example generation. It works with any Elevate core lib, optional component, or HDS.

Unlike `/angular-elevate-generate` (creates new services/components using Elevate from scratch) or `/angular-elevate-apply` (fixes compliance issues), this skill focuses on **adding a new Elevate library** to a project that already has some Elevate integration.

## Inputs

- `@angular /angular-elevate-add common-grid` — add the grid component
- `@angular /angular-elevate-add websocket` — add WebSocket support
- `@angular /angular-elevate-add hds` — add HDS design system
- `@angular /angular-elevate-add power-bi,tableau` — add multiple libs at once

### Known Libraries (23 total)

**Core (7):** client-core, angular-adapter, authentication, authorization, configuration, logging, preferences

**Optional (15):** common-grid, common-chart, common-search, common-chat, common-dialog, interop, data-connector, websocket, power-bi, tableau, document-renderer, notification-consumer, notification-publisher, platform-detection, usage-stats

**Design System (1):** hds

## Steps

### 1. Read user input

Parse the requested library name(s) from the user's message. Validate against the known list of 23 libraries above.

### 2. Detect current state

Run the detection script to check what is already installed:

```bash
node .orch/scripts/detect-elevate.js [project-root]
```

Outputs installed elevate libs as JSON. Use this to determine:
- Which libs are already installed (skip with "already installed" message)
- Which core libs are missing (may need to install prerequisites)

### 3. Validate the library name

Verify the requested lib is in the known list of 23. If not, report an error with the closest match and the full list of available libs.

### 4. Check if already installed

If the lib is already installed, report:
```
✓ {lib-name} is already installed (v{version}). No changes needed.
```
Skip to the next lib if multiple were requested.

### 5. Install the package

Determine the correct package scope and install:

```bash
# Core libs and most optional libs
npm install @yourorg/elevate/{lib-name}

# Component libs (common-grid, common-chart, common-search, common-chat, common-dialog)
npm install @yourorg/elevate-components/{lib-name}

# HDS design system
npm install @yourorg/hds
```

### Helper Script

Run the installer helper for automated package resolution:

```bash
node .github/skills/angular-elevate-add/scripts/add-elevate-lib.js {lib-name} [project-root]
```

Outputs JSON with install result: `{ installed, package, version, needsProvider, providerName }`.

### 6. Configure providers

Determine what configuration is needed based on the library type:

**Libraries needing provider setup** (add to `app.config.ts`):
- `client-core` -> `provideElevateCore()`
- `angular-adapter` -> `provideElevateAngular()`
- `authentication` -> `provideElevateAuth()`
- `authorization` -> `provideElevateAuthz()`
- `configuration` -> `provideElevateConfig()`
- `logging` -> `provideElevateLogging()`
- `preferences` -> `provideElevatePreferences()`
- `interop` -> `provideElevateInterop()`
- `data-connector` -> `provideElevateDataConnector()`
- `websocket` -> `provideElevateWebSocket()`
- `power-bi` -> `provideElevatePowerBI()`
- `tableau` -> `provideElevateTableau()`
- `document-renderer` -> `provideElevateDocumentRenderer()`
- `notification-consumer` -> `provideElevateNotificationConsumer()`
- `notification-publisher` -> `provideElevateNotificationPublisher()`
- `platform-detection` -> `provideElevatePlatformDetection()`
- `usage-stats` -> `provideElevateUsageStats()`

**Components needing import in consuming component** (no provider, just import where used):
- `common-grid` -> `ElevateGridModule`
- `common-chart` -> `ElevateChartModule`
- `common-search` -> `ElevateSearchModule`
- `common-chat` -> `ElevateChatModule`
- `common-dialog` -> `ElevateDialogModule`

**HDS needing theme setup** (add to `styles.scss`):
- `hds` -> `@use '@yourorg/hds/themes'` with `:root` and `[data-theme='dark']` blocks

### 7. Wire up the provider/import

- For providers: add the `provide*()` call to `app.config.ts` with sensible defaults
- For components: add the module import to the target component or a shared module
- For HDS: add the theme import to `styles.scss`

### 8. Load reference doc

Load the library's reference doc from `.orch/references/internal/elevate/{lib-name}.md` for patterns and API guidance.

### 9. Generate usage example

Create a usage example in a new or existing component demonstrating the library's primary use case:
- For services: inject and call the main API methods
- For components: add the component to a template with typical bindings
- For HDS: show themed component with token usage

### 10. Build verification

```bash
ng build
# or for Nx:
npx nx build {app-name}
```

### 11. Test verification

```bash
ng test
# or for Nx:
npx nx test {app-name}
```

## Output

### Installation Summary

| Aspect | Value |
|--------|-------|
| Library | {lib-name} |
| Package | `@yourorg/elevate/{lib-name}` |
| Version | {version} |
| Provider | `provide{Name}()` added to `app.config.ts` |
| Import | `{Module}` added to `{component}` |
| Example | `{example-file}` created/updated |
| Build | pass |
| Tests | pass |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `@yourorg/elevate/{lib-name}` |
| `app.config.ts` | Added `provide{Name}()` provider |
| `{component}.ts` | Added import and usage example |
| `{component}.spec.ts` | Added test with `provideElevateTesting()` |

## Validation

- Package installed and version recorded in `package.json`
- Provider configured in `app.config.ts` (for provider-based libs)
- Import added to consuming component (for component-based libs)
- Theme configured in `styles.scss` (for HDS)
- Usage example compiles and demonstrates primary API
- Build passes with no errors
- Tests pass with `provideElevateTesting()` mocks
- Detection script confirms the lib is now installed:
  ```bash
  node .orch/scripts/detect-elevate.js
  ```
