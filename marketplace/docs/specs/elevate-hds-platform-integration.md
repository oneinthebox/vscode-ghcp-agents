# Elevate + HDS Platform Integration into ORCH

**Status:** Draft
**Authors:** orch-team
**Created:** 2026-03-26
**Last Updated:** 2026-03-26
**Target Release:** ORCH 2.x
**Dependencies:** [Event-Driven Workflow Execution](event-driven-workflow-execution.md), [Version-Aware Stack Resolution](version-aware-stack-resolution.md)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Integration with Event-Driven Relay](#3-integration-with-event-driven-relay)
4. [Integration with Version-Aware Resolution](#4-integration-with-version-aware-resolution)
5. [Reference Doc Strategy](#5-reference-doc-strategy)
6. [Detection Script: detect-elevate.js](#6-detection-script-detect-elevatejs)
7. [New Skill: /angular-elevate-add](#7-new-skill-angular-elevate-add)
8. [Existing Skill Enhancements](#8-existing-skill-enhancements)
9. [Resolver Entries for Platform Libraries](#9-resolver-entries-for-platform-libraries)
10. [Workflow Integration](#10-workflow-integration)
11. [Files Created and Modified](#11-files-created-and-modified)
12. [Verification](#12-verification)

---

## 1. Problem Statement

### 1.1 Empty Reference Docs Render Six Skills Ineffective

ORCH ships six platform-integration skills across two domains:

| Domain | Skills | Current State |
|--------|--------|---------------|
| **Elevate** | `/angular-elevate-audit`, `/angular-elevate-apply`, `/angular-elevate-generate` | Reference docs are `<!-- ADD-HERE -->` templates |
| **HDS** | `/angular-hds-audit`, `/angular-hds-apply`, `/angular-hds-generate` | Reference docs are `<!-- ADD-HERE -->` templates |

Each skill's `references:` frontmatter points to files in `.orch/references/internal/elevate/` and `.orch/references/internal/hds/` that contain placeholder tables and stub code examples. The AI falls back to generic detection patterns embedded in the SKILL.md body, which work for surface-level scanning (find `console.log`, find hardcoded hex values) but cannot produce correct API-level guidance.

Concrete impact:

- `/angular-elevate-generate` creates a service that calls `this.authService.getToken()`, but the actual Elevate API may use `getAccessToken()` returning an `Observable<string>` rather than a synchronous string. Without the real API surface in the reference doc, the generated code will not compile.
- `/angular-hds-apply` maps `#3b82f6` to `var(--hds-accent-primary)` using a hardcoded fallback table, but the org's actual HDS token for that color role may be `var(--hds-color-brand-500)`. Without the real token catalog, every replacement is a guess.
- `/angular-elevate-audit` detects `console.log` violations but cannot report the correct replacement signature because the `LoggingService` API shape is unknown.

### 1.2 Twenty-Three Platform Libraries with No AI Visibility

The Elevate + HDS ecosystem comprises 23 distinct libraries that an Angular project may depend on:

**Core libraries (8) -- expected in every Elevate project:**

| # | Library | Package | Reference Doc |
|---|---------|---------|---------------|
| 1 | Client Core | `@yourorg/elevate/client-core` | `elevate/client-core.md` |
| 2 | Angular Adapter | `@yourorg/elevate/angular-adapter` | `elevate/angular-adapter.md` |
| 3 | Authentication | `@yourorg/elevate/auth` | `elevate/auth.md` (exists, template) |
| 4 | Authorization | `@yourorg/elevate/authorization` | `elevate/authorization.md` (exists, template) |
| 5 | Configuration | `@yourorg/elevate/config` | `elevate/config.md` (exists, template) |
| 6 | Logging | `@yourorg/elevate/logging` | `elevate/logging.md` (exists, template) |
| 7 | Preferences | `@yourorg/elevate/preferences` | `elevate/preferences.md` (exists, template) |
| 8 | HDS (Design System) | `@yourorg/hds` | `hds/tokens.md`, `hds/components.md`, `hds/theming.md`, `hds/deprecated-tokens.md` (exist, templates) |

**Optional libraries (15) -- installed per project need:**

| # | Library | Package | Reference Doc |
|---|---------|---------|---------------|
| 9 | Common Grid | `@yourorg/elevate-common/grid` | `elevate/common-grid.md` (exists, template) |
| 10 | Common Chart | `@yourorg/elevate-common/chart` | `elevate/common-chart.md` (exists, template) |
| 11 | Common Search | `@yourorg/elevate-common/search` | `elevate/common-search.md` (new) |
| 12 | Common Chat | `@yourorg/elevate-common/chat` | `elevate/common-chat.md` (new) |
| 13 | Common Dialog | `@yourorg/elevate-common/dialog` | `elevate/common-dialog.md` (exists, template) |
| 14 | Interop | `@yourorg/elevate/interop` | `elevate/interop.md` (new) |
| 15 | Data Connector | `@yourorg/elevate/data-connector` | `elevate/data-connector.md` (new) |
| 16 | WebSocket | `@yourorg/elevate/websocket` | `elevate/websocket.md` (new) |
| 17 | Power BI | `@yourorg/elevate-common/power-bi` | `elevate/power-bi.md` (new) |
| 18 | Tableau | `@yourorg/elevate-common/tableau` | `elevate/tableau.md` (new) |
| 19 | Document Renderer | `@yourorg/elevate-common/document-renderer` | `elevate/document-renderer.md` (new) |
| 20 | Notification Consumer | `@yourorg/elevate/notification-consumer` | `elevate/notification-consumer.md` (new) |
| 21 | Notification Publisher | `@yourorg/elevate/notification-publisher` | `elevate/notification-publisher.md` (new) |
| 22 | Platform Detection | `@yourorg/elevate/platform-detection` | `elevate/platform-detection.md` (new) |
| 23 | Usage Stats | `@yourorg/elevate/usage-stats` | `elevate/usage-stats.md` (new) |

Of these 23, only 11 have template reference docs today. The remaining 12 have no reference doc at all. For the 11 that exist, every API table ends with `<!-- ADD-HERE -->`.

### 1.3 No Detection of Which Libraries Are Installed

The existing `check-stack.js` hook detects Angular version and a small set of third-party packages (`@ngrx/store`, `ag-grid-angular`, `primeng`, etc.) but does not scan for any `@yourorg/elevate/*`, `@yourorg/elevate-common/*`, or `@yourorg/hds` packages. Consequently:

- Skills cannot scope their work to installed libraries. `/angular-elevate-audit` loads the sub-lib registry from its SKILL.md frontmatter and scans `package.json` at runtime, but this detection is duplicated in every skill rather than centralized.
- The resolver (`resolver.yaml`) has no entries for platform libraries, so the prompt builder cannot conditionally load platform reference docs.
- Workflow phases for elevate integration (`phase 007` in `angular-new-feature.yaml`) receive no context about which libraries are already present.

### 1.4 Design Goals

| # | Goal | Measure |
|---|------|---------|
| 1 | **Correct API guidance** | Reference docs contain real API signatures; generated code compiles on first try |
| 2 | **Token efficiency** | Only load docs for installed libs; core: ~500 tokens each, optional: ~400 tokens each; worst case (all 23 installed): ~10,700 tokens |
| 3 | **Zero manual config** | `detect-elevate.js` auto-discovers installed libs from `package.json` |
| 4 | **Seamless workflow integration** | Elevate detection runs as a relay event like any other phase; no special handling |
| 5 | **Additive, non-breaking** | Existing skills and workflows continue to function; enhancements are opt-in via populated docs |

---

## 2. Solution Overview

The approach is **A + light B**: populate reference doc templates from org documentation sources, add a centralized detection script, introduce one new skill, and enhance existing skills to be library-aware.

### 2.1 Five Components

```
┌──────────────────────────────────────────────────────────────────────┐
│                  ELEVATE + HDS PLATFORM INTEGRATION                  │
│                                                                      │
│  1. Reference Docs (23 docs)                                         │
│     Templates populated from TypeDoc/Storybook via @docs /docs-fetch │
│                                                                      │
│  2. Detection Script (detect-elevate.js)                             │
│     Scans package.json → writes elevate profile to stack.yaml        │
│                                                                      │
│  3. Resolver Entries (resolver.yaml)                                 │
│     Maps (library + installed?) → reference doc path + token cost    │
│                                                                      │
│  4. New Skill (/angular-elevate-add)                                 │
│     Installs optional lib, configures providers, wires imports       │
│                                                                      │
│  5. Existing Skill Enhancements                                      │
│     6 skills become lib-aware: scope to installed libs only          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
package.json
    │
    ▼
detect-elevate.js  ──►  stack.yaml (elevate_libs section)
    │
    ▼
resolver.yaml  ──►  prompt builder loads only installed lib docs
    │
    ▼
SKILL.md (audit/apply/generate)  ──►  scoped to installed libs only
    │
    ▼
AI receives focused context: real API docs for installed libs, nothing else
```

---

## 3. Integration with Event-Driven Relay

The event-driven workflow execution spec ([event-driven-workflow-execution.md](event-driven-workflow-execution.md)) defines how ORCH workflows decompose into phases that the relay dispatches as events. Elevate integration fits naturally into this model.

### 3.1 Elevate as a Workflow Phase

In `angular-new-feature.yaml`, the elevate integration is already phase `007`:

```yaml
- name: Integrate elevate services
  id: elevate-integrate
  phase_id: "007"
  agent: engineer
  skill: /angular-elevate-generate
  execution_type: ai
  args: --uses auto-detect
  depends_on: ["004"]
```

With this spec implemented, the relay processes this phase as follows:

1. **Pre-check (script event):** The relay runs `detect-elevate.js` as part of the phase context setup, the same way `check-stack.js` runs before any skill invocation. The script writes the elevate library profile to `stack.yaml`.

2. **Prompt construction:** The prompt builder reads `stack.yaml`, finds the `elevate_libs` section, and uses `resolver.yaml` to load only the reference docs for installed libraries. If the project has `@yourorg/elevate/auth`, `@yourorg/elevate/logging`, and `@yourorg/elevate-common/grid` installed, only those three docs (plus the overview doc) are loaded -- roughly 2,000 tokens instead of 11,500 for all 23.

3. **Skill execution (AI event):** The AI receives a focused prompt: the `angular-elevate-generate` SKILL.md body with concrete API signatures for the three installed libraries. It generates code that compiles because the API surface is accurate.

4. **Completion:** The AI writes `.complete.json`, the relay detects it, and advances to phase `008` (generate tests).

### 3.2 Auto Mode vs. Safe Mode

| Mode | Core libs (8) | Optional libs (15) |
|------|--------------|-------------------|
| **Auto mode** | Installed without asking. If the project has `@yourorg/elevate/auth` in `package.json`, the skill uses it. If not and the project needs auth, the skill installs it automatically. | Listed in the plan. The relay includes them in the pre-execution plan that the user can review. In auto mode, the plan auto-approves if the workflow YAML sets `approval: auto=safe`. |
| **Safe mode** | User reviews the elevate setup plan before any installation. The relay pauses at the `checkpoint: true` marker and presents the plan: "This feature needs auth, logging, and config. Install these core libraries?" | User reviews the full library list. The relay presents each optional library with a rationale: "common-grid is recommended because this feature includes a data table." |

### 3.3 Parallel Execution

Phases `005` (mock setup), `006` (HDS apply), and `007` (elevate integrate) all depend only on `004` (generate route). The relay can dispatch them in parallel. The `detect-elevate.js` script runs as part of phase `007`'s pre-check and does not conflict with the HDS phase's pre-check. Both write to `stack.yaml` but to different sections (`elevate_libs` vs. `hds_installed`).

---

## 4. Integration with Version-Aware Resolution

The version-aware stack resolution spec ([version-aware-stack-resolution.md](version-aware-stack-resolution.md)) defines how `check-stack.js` detects Angular version and how `resolver.yaml` gates features by `available` and `recommended` version constraints. Elevate libraries integrate into this system with one key simplification: they are framework-agnostic.

### 4.1 Version Gating for Elevate Libraries

Elevate libraries are pure TypeScript packages with Angular adapters. They work with any Angular version that ORCH supports:

```yaml
# In resolver.yaml — elevate entries use a permissive gate
- category: elevate-auth
  available: ">=16"          # Works with any supported Angular version
  requires: "@yourorg/elevate/auth"   # Only loaded if this package is in package.json
  doc: internal/elevate/auth.md
  tokens: 500
```

The `requires` field is the critical gate. Unlike Angular features (where `available: ">=17"` means the feature does not exist before v17), elevate libraries are always *available* but only *relevant* when installed. The resolver checks `package.json` dependencies via the `requires` field:

- If `@yourorg/elevate/auth` is in `package.json` dependencies or devDependencies, load `auth.md`.
- If not, skip it. Zero tokens wasted.

### 4.2 Resolution Cascade

The existing cascade (`cache -> detect -> pin -> default`) extends to elevate detection:

```
1. Cache: stack.yaml has elevate_libs section with matching checksum → use cached list
2. Detect: detect-elevate.js scans package.json → writes elevate_libs to stack.yaml
3. Pin: .orch/config.yaml has elevate_libs override → use pinned list
4. Default: assume no elevate libraries installed → load zero platform docs
```

This follows the same pattern as Angular version detection. The default (no elevate) is safe because it matches the behavior of a project that does not use the Elevate platform.

### 4.3 Token Budget

| Scenario | Core docs loaded | Optional docs loaded | Total tokens |
|----------|-----------------|---------------------|-------------|
| No elevate installed | 0 | 0 | 0 |
| Core only (typical new project) | 8 x ~500 = 4,000 | 0 | ~4,000 |
| Core + 3 optional (typical mature project) | 8 x ~500 = 4,000 | 3 x ~400 = 1,200 | ~5,200 |
| All 23 installed (unlikely maximum) | 8 x ~500 = 4,000 | 15 x ~400 = 6,000 | ~10,000 |

Compared to loading all 23 docs unconditionally (~10,000 tokens), the typical project saves 50-60% of token budget by loading only installed library docs.

---

## 5. Reference Doc Strategy

### 5.1 Template Structure

Every reference doc follows a standard six-section structure. This is already the pattern used by the existing templates in `.orch/references/internal/elevate/` and `.orch/references/internal/hds/`:

```markdown
# {Library Name} API Reference

## Overview
One-paragraph description of what this library does and when to use it.

## Installation
npm install command and provider/module configuration for app.config.ts.

## Setup
Provider registration in app.config.ts (standalone) or NgModule imports (legacy).

## API
Table of public methods/inputs/outputs with types, defaults, and descriptions.

## Examples
2-3 concrete code examples showing the most common usage patterns.

## Patterns
Do/don't list: correct usage vs. common mistakes the AI should avoid.
```

### 5.2 Population Strategy

Reference docs are templates that organizations populate from their own internal documentation sources:

| Method | Source | Command | When to Use |
|--------|--------|---------|------------|
| **TypeDoc extraction** | Published npm package TypeDoc output | `@docs /docs-fetch --source tsdoc --origin src/libs/elevate/auth/` | Library source is in the same monorepo |
| **Storybook scrape** | HDS Storybook instance | `@docs /docs-fetch --source storybook --origin https://hds-storybook.corp.com` | HDS has a live Storybook |
| **Confluence pull** | Internal wiki pages | `@docs /docs-fetch --source confluence --origin https://wiki.corp.com/display/ELEVATE/Auth` | Documentation lives in Confluence |
| **Manual curation** | Developer knowledge | Edit the template directly | No automated source available |

Each method uses the existing `@docs /docs-fetch` skill, which is already integrated with the registry (`registry.yaml`). New registry entries are added for each library (see section 9).

### 5.3 Token Budgets per Doc

| Category | Target size | Rationale |
|----------|------------|-----------|
| Core lib doc | ~500 tokens | Loaded for every skill invocation in an elevate project. Must be compact: overview + setup + API table + 1 example. |
| Optional lib doc | ~400 tokens | Loaded only when installed. Can be slightly smaller because optional libs have narrower scope. |
| HDS token catalog | ~500 tokens | Loaded for all HDS skills. Contains the full token-to-value mapping table. |
| HDS component catalog | ~400 tokens | Loaded for generate/apply skills. Contains the component selector-to-module mapping. |

### 5.4 Doc Freshness

Platform library docs are registered in `registry.yaml` with `managed_by: "pack:elevate"` or `managed_by: "pack:hds"`. This means:

- `orch update` checks for newer pack versions and marks stale docs as `status: draft` for re-fetch.
- `/docs-status` shows freshness across all platform docs.
- `/docs-drift` detects when the installed package version diverges from the documented version.

---

## 6. Detection Script: detect-elevate.js

### 6.1 Purpose

Centralized detection of all `@yourorg/elevate/*`, `@yourorg/elevate-common/*`, and `@yourorg/hds` packages installed in the project. Replaces the per-skill `package.json` scanning currently duplicated in `angular-elevate-audit`, `angular-elevate-apply`, and `angular-elevate-generate` SKILL.md files.

### 6.2 File Location

```
.orch/hooks/detect-elevate.js    (~120 lines)
```

### 6.3 Behavior

```
Input:  package.json (at PROJECT_ROOT)
Output: Appends elevate_libs section to .orch/cache/stack.yaml

Cascade:
  1. Cache: if stack.yaml already has elevate_libs and checksum matches → exit 0
  2. Detect: read package.json, find all @yourorg/elevate/*, @yourorg/elevate-common/*, @yourorg/hds
  3. Classify: tag each as core or optional
  4. Write: append to stack.yaml
  5. Exit 0 always (never blocks the orchestrator)
```

### 6.4 Output Format

The script appends the following to the existing `stack.yaml`:

```yaml
# Appended by detect-elevate.js
elevate_installed: true
elevate_libs:
  - name: "@yourorg/elevate/auth"
    version: "^4.2.0"
    tier: core
  - name: "@yourorg/elevate/logging"
    version: "^4.2.0"
    tier: core
  - name: "@yourorg/elevate/config"
    version: "^4.2.0"
    tier: core
  - name: "@yourorg/elevate-common/grid"
    version: "^3.1.0"
    tier: optional
  - name: "@yourorg/hds"
    version: "^5.0.0"
    tier: core
hds_installed: true
elevate_core_missing:
  - "@yourorg/elevate/client-core"
  - "@yourorg/elevate/angular-adapter"
```

The `elevate_core_missing` field lists core libraries that are not installed. This enables the `/angular-elevate-add` skill and workflow auto-install logic.

### 6.5 Integration with check-stack.js

`detect-elevate.js` is designed to run after `check-stack.js` and extend its output. Two options:

**Option A (preferred): Inline into check-stack.js.** Add elevate detection to the `detectStack()` function in `check-stack.js`. This keeps a single hook that produces a complete stack profile.

**Option B: Separate hook.** Run `detect-elevate.js` as a second hook in the pipeline. It reads the existing `stack.yaml` and appends the elevate section. This is more modular but adds 20ms to hook execution.

Recommendation: Option A. The `check-stack.js` `interesting` array already lists packages to detect. Extending it with the 23 elevate/HDS packages is straightforward and maintains the single-file, single-pass design.

---

## 7. New Skill: /angular-elevate-add

### 7.1 Purpose

Add any Elevate or HDS library to an existing Angular project. Handles the full installation lifecycle: npm install, provider configuration, module/import wiring, and usage example generation.

### 7.2 File Location

```
.github/skills/angular-elevate-add/
  SKILL.md                          # Skill definition
  scripts/add-elevate-lib.js        # Helper script for mechanical install
  examples/add-logging-example.ts   # Example output for logging integration
```

### 7.3 SKILL.md Frontmatter

```yaml
---
name: angular-elevate-add
description: "Add an Elevate platform library to an existing Angular project — install package, configure providers, wire imports, generate usage example"
references:
  - references/internal/elevate/overview.md
allowed-tools:
  - codebase
  - terminal
  - edit
---
```

### 7.4 Inputs

```
@angular /angular-elevate-add logging              # Add logging library
@angular /angular-elevate-add common-grid           # Add common grid wrapper
@angular /angular-elevate-add auth,logging,config   # Add multiple libraries
@angular /angular-elevate-add --core                # Install all core libraries
@angular /angular-elevate-add --list                # Show available libraries and install status
```

### 7.5 Steps

1. **Detect current state:** Run `detect-elevate.js` (or read cached `stack.yaml`) to determine which libraries are already installed.
2. **Validate request:** Check that the requested library ID maps to a known package. Report error for unknown IDs.
3. **Install package:** Run `npm install @yourorg/elevate/{lib-id}` (or `@yourorg/elevate-common/{lib-id}` for common components, or `@yourorg/hds` for the design system).
4. **Configure provider:** Add the provider registration to `app.config.ts` (standalone) or `app.module.ts` (NgModule). Load the library's reference doc for the correct provider function name and configuration shape.
5. **Wire imports:** Add the module import to the target component or shared module.
6. **Generate usage example:** Create a small example in a comment block or separate file showing correct usage of the library's primary API.
7. **Update stack.yaml:** Re-run detection so subsequent skills see the newly installed library.
8. **Verify:** Run `ng build` to confirm compilation succeeds.

### 7.6 Helper Script: add-elevate-lib.js

```
.github/skills/angular-elevate-add/scripts/add-elevate-lib.js    (~150 lines)
```

The script handles the mechanical aspects that do not require AI judgment:

- Read `package.json`, verify the package is not already installed.
- Run `npm install --save @yourorg/elevate/{lib}`.
- Locate `app.config.ts` (or `app.module.ts`) using standard Angular project structure conventions.
- Insert the provider import and registration at the correct position (after existing elevate providers if any, or at the end of the providers array).
- Exit with JSON output indicating success/failure and the files modified.

The AI handles the context-dependent parts: choosing configuration values, wiring the library into the specific feature being built, and generating the usage example.

### 7.7 Ad-Hoc vs. Workflow Mode

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Ad-hoc** | User types `@angular /angular-elevate-add logging` | Skill runs standalone. Installs, configures, verifies. |
| **Workflow** | Phase `007` in `angular-new-feature.yaml` determines a library is needed | The `angular-elevate-generate` skill delegates to `/angular-elevate-add` for libraries that are needed but not yet installed. The relay sees this as a sub-task within the phase. |

---

## 8. Existing Skill Enhancements

### 8.1 Changes to All Six Platform Skills

Each of the six existing skills receives two enhancements:

**Enhancement 1: Library-aware scoping.** Instead of scanning for all sub-libraries listed in the SKILL.md frontmatter, the skill reads `stack.yaml` to determine which libraries are installed and scopes its work to those libraries only.

Before (current behavior):
```
SKILL.md lists 8 sub-libs in frontmatter
→ Skill reads package.json at runtime to filter
→ Duplicated detection logic in every skill
→ No integration with resolver or prompt builder
```

After (proposed behavior):
```
detect-elevate.js populates stack.yaml with installed libs
→ Resolver filters reference docs to installed libs only
→ Prompt builder loads only relevant docs
→ Skill body references stack.yaml for scoping
→ Zero duplicated detection logic
```

**Enhancement 2: Real API references.** Once reference docs are populated (section 5), the skills' `references:` frontmatter points to docs that contain actual API signatures instead of `<!-- ADD-HERE -->` placeholders. No SKILL.md code changes are needed for this -- the improvement comes from the doc content.

### 8.2 Per-Skill Changes

| Skill | Change | Impact |
|-------|--------|--------|
| `/angular-elevate-audit` | Replace inline `package.json` scanning (Steps 1-2) with `stack.yaml` read. Add `elevate_core_missing` to report (flag missing core libs as `info` severity). | Simpler logic; report includes missing-core-lib findings. |
| `/angular-elevate-apply` | Read `stack.yaml` for installed libs. If a fix requires a library that is not installed, delegate to `/angular-elevate-add` before applying the fix. | Fixes are self-contained; no manual install step needed. |
| `/angular-elevate-generate` | Read `stack.yaml` for `--uses auto-detect` mode. Auto-detect determines which elevate libs to inject based on the generated component's needs AND what is installed. If a needed lib is not installed, invoke `/angular-elevate-add`. | Generated code is complete; all dependencies are installed. |
| `/angular-hds-audit` | Read `stack.yaml` for `hds_installed` flag. If HDS is not installed, report a single `critical` finding: "HDS not installed." Otherwise, load HDS token/component/theming docs from resolver. | Avoids scanning for HDS tokens in a project that does not use HDS. |
| `/angular-hds-apply` | Same as audit: gate on `hds_installed`. Load real token mapping from `hds/tokens.md` instead of fallback table. | Replacements use correct token names. |
| `/angular-hds-generate` | Same as audit: gate on `hds_installed`. Load real component catalog from `hds/components.md` instead of generic mapping table. | Generated templates use correct HDS selectors and inputs. |

### 8.3 Frontmatter Reference Update

The `references:` field in each skill's frontmatter remains static (it lists the maximum set of docs the skill may need). The resolver dynamically filters this list based on `stack.yaml` at runtime. No frontmatter changes are required, but the `# ADD-HERE` comments in the existing sub-libs registry sections are replaced with the complete library list from section 1.2.

---

## 9. Resolver Entries for Platform Libraries

### 9.1 New Section in resolver.yaml

The following entries are added to `.orch/references/angular/resolver.yaml` under a new `platform_libs` section:

```yaml
platform_libs:
  # ── Elevate Core ──
  - category: elevate-overview
    available: ">=16"
    requires: "@yourorg/elevate/client-core"
    doc: internal/elevate/overview.md
    tokens: 500

  - category: elevate-client-core
    available: ">=16"
    requires: "@yourorg/elevate/client-core"
    doc: internal/elevate/client-core.md
    tokens: 500

  - category: elevate-angular-adapter
    available: ">=16"
    requires: "@yourorg/elevate/angular-adapter"
    doc: internal/elevate/angular-adapter.md
    tokens: 500

  - category: elevate-auth
    available: ">=16"
    requires: "@yourorg/elevate/auth"
    doc: internal/elevate/auth.md
    tokens: 500

  - category: elevate-authorization
    available: ">=16"
    requires: "@yourorg/elevate/authorization"
    doc: internal/elevate/authorization.md
    tokens: 500

  - category: elevate-config
    available: ">=16"
    requires: "@yourorg/elevate/config"
    doc: internal/elevate/config.md
    tokens: 500

  - category: elevate-logging
    available: ">=16"
    requires: "@yourorg/elevate/logging"
    doc: internal/elevate/logging.md
    tokens: 500

  - category: elevate-preferences
    available: ">=16"
    requires: "@yourorg/elevate/preferences"
    doc: internal/elevate/preferences.md
    tokens: 500

  # ── HDS ──
  - category: hds-tokens
    available: ">=16"
    requires: "@yourorg/hds"
    doc: internal/hds/tokens.md
    tokens: 500

  - category: hds-components
    available: ">=16"
    requires: "@yourorg/hds"
    doc: internal/hds/components.md
    tokens: 400

  - category: hds-theming
    available: ">=16"
    requires: "@yourorg/hds"
    doc: internal/hds/theming.md
    tokens: 400

  - category: hds-deprecated
    available: ">=16"
    requires: "@yourorg/hds"
    doc: internal/hds/deprecated-tokens.md
    tokens: 300

  # ── Elevate Optional (common components) ──
  - category: elevate-common-grid
    available: ">=16"
    requires: "@yourorg/elevate-common/grid"
    doc: internal/elevate/common-grid.md
    tokens: 400

  - category: elevate-common-chart
    available: ">=16"
    requires: "@yourorg/elevate-common/chart"
    doc: internal/elevate/common-chart.md
    tokens: 400

  - category: elevate-common-search
    available: ">=16"
    requires: "@yourorg/elevate-common/search"
    doc: internal/elevate/common-search.md
    tokens: 400

  - category: elevate-common-chat
    available: ">=16"
    requires: "@yourorg/elevate-common/chat"
    doc: internal/elevate/common-chat.md
    tokens: 400

  - category: elevate-common-dialog
    available: ">=16"
    requires: "@yourorg/elevate-common/dialog"
    doc: internal/elevate/common-dialog.md
    tokens: 400

  # ── Elevate Optional (services) ──
  - category: elevate-interop
    available: ">=16"
    requires: "@yourorg/elevate/interop"
    doc: internal/elevate/interop.md
    tokens: 400

  - category: elevate-data-connector
    available: ">=16"
    requires: "@yourorg/elevate/data-connector"
    doc: internal/elevate/data-connector.md
    tokens: 400

  - category: elevate-websocket
    available: ">=16"
    requires: "@yourorg/elevate/websocket"
    doc: internal/elevate/websocket.md
    tokens: 400

  - category: elevate-power-bi
    available: ">=16"
    requires: "@yourorg/elevate-common/power-bi"
    doc: internal/elevate/power-bi.md
    tokens: 400

  - category: elevate-tableau
    available: ">=16"
    requires: "@yourorg/elevate-common/tableau"
    doc: internal/elevate/tableau.md
    tokens: 400

  - category: elevate-document-renderer
    available: ">=16"
    requires: "@yourorg/elevate-common/document-renderer"
    doc: internal/elevate/document-renderer.md
    tokens: 400

  - category: elevate-notification-consumer
    available: ">=16"
    requires: "@yourorg/elevate/notification-consumer"
    doc: internal/elevate/notification-consumer.md
    tokens: 400

  - category: elevate-notification-publisher
    available: ">=16"
    requires: "@yourorg/elevate/notification-publisher"
    doc: internal/elevate/notification-publisher.md
    tokens: 400

  - category: elevate-platform-detection
    available: ">=16"
    requires: "@yourorg/elevate/platform-detection"
    doc: internal/elevate/platform-detection.md
    tokens: 400

  - category: elevate-usage-stats
    available: ">=16"
    requires: "@yourorg/elevate/usage-stats"
    doc: internal/elevate/usage-stats.md
    tokens: 400
```

### 9.2 Resolver Logic Enhancement

The `resolveReferences()` function in `.orch/hooks/resolve-references.js` currently checks the `requires` field against `stack.yaml` packages. This same mechanism works for elevate libraries without modification, provided `detect-elevate.js` (or the enhanced `check-stack.js`) adds elevate packages to the `packages` array in `stack.yaml`.

The only change to `resolve-references.js` is extending the parser to handle the `platform_libs` section in addition to the existing `features` section:

```javascript
// In parseResolverYaml():
if (line.match(/^platform_libs:/)) { section = 'platform_libs'; continue; }

// platform_libs entries use the same schema as features:
// category, available, requires, doc, tokens
```

### 9.3 Registry Entries

Each of the 23 library docs is registered in `.orch/registry.yaml` so that `@docs` skills can manage their freshness. Example entries:

```yaml
# Elevate core — auth
- id: elevate-auth-api
  name: "Elevate Auth Service API"
  type: source-embedded
  origin: node_modules/@yourorg/elevate/auth/
  format: tsdoc
  output: .orch/references/internal/elevate/auth.md
  scope: frontend-ts-angular
  version: "4.x"
  managed_by: "pack:elevate"
  last_refreshed: null
  status: draft

# HDS — token catalog
- id: hds-tokens
  name: "HDS Design Token Catalog"
  type: storybook
  origin: https://hds-storybook.corp.com
  format: html
  output: .orch/references/internal/hds/tokens.md
  scope: frontend-ts-angular
  version: "5.x"
  managed_by: "pack:hds"
  last_refreshed: null
  status: draft
```

---

## 10. Workflow Integration

### 10.1 Enhanced angular-new-feature.yaml

The existing `angular-new-feature.yaml` workflow already has phases for HDS (`006`) and Elevate (`007`). The enhancements are:

**Phase 007 enhancement:** Add a `pre-check` field that runs `detect-elevate.js`:

```yaml
- name: Integrate elevate services
  id: elevate-integrate
  phase_id: "007"
  agent: engineer
  skill: /angular-elevate-generate
  execution_type: ai
  args: --uses auto-detect
  depends_on: ["004"]
  pre-check:
    script: .orch/hooks/detect-elevate.js
    timeout: 5000
  checkpoint: true
  verify: false
  approval: auto=safe
  collect:
    - sub-libs-integrated
    - config-keys-used
    - elevate-core-missing
  report-section: "Elevate Integration"
  on-failure: continue
```

**New phase 006.5 (optional, for projects adding Elevate for the first time):** Auto-install core libraries:

```yaml
- name: Install elevate core
  id: elevate-core-install
  phase_id: "006.5"
  agent: engineer
  skill: /angular-elevate-add
  execution_type: ai
  args: --core
  depends_on: ["004"]
  pre-check:
    script: .orch/hooks/detect-elevate.js
    timeout: 5000
  skip-if: "stack.yaml:elevate_installed == true"
  checkpoint: true
  verify: true
  approval: safe
  collect:
    - packages-installed
    - providers-configured
  report-section: "Elevate Setup"
  on-failure: stop
```

The `skip-if` field is a new workflow feature: the relay reads `stack.yaml` and skips the phase if the condition is already met. This avoids re-installing core libraries on a project that already has them.

### 10.2 Workflow State Example

After `detect-elevate.js` runs, the workflow state for a project with three elevate libraries looks like:

```
.orch/workflow-state/events/run-20260326-143022/
  001-scan-context-before.complete.json
  002-generate-component.complete.json
  003-generate-service.complete.json
  004-generate-route.complete.json
  005-mock-setup.running.json
  006-hds-apply.running.json
  007-elevate-integrate.ready.json        ← waiting for 004 completion
  007-elevate-integrate.context.json      ← contains: {"elevate_libs": ["auth","logging","common-grid"]}
```

The `.context.json` file is written by the `pre-check` script and consumed by the prompt builder when constructing the AI prompt for phase `007`.

---

## 11. Files Created and Modified

### 11.1 New Files

| File | Purpose | Size |
|------|---------|------|
| `.orch/hooks/detect-elevate.js` | Centralized elevate/HDS library detection hook | ~120 lines |
| `.github/skills/angular-elevate-add/SKILL.md` | New skill: add elevate library to existing project | ~200 lines |
| `.github/skills/angular-elevate-add/scripts/add-elevate-lib.js` | Helper script: mechanical install, provider wiring | ~150 lines |
| `.github/skills/angular-elevate-add/examples/add-logging-example.ts` | Example output: logging library integration | ~40 lines |
| `.orch/references/internal/elevate/client-core.md` | Reference doc template: client core library | ~100 lines |
| `.orch/references/internal/elevate/angular-adapter.md` | Reference doc template: Angular adapter | ~100 lines |
| `.orch/references/internal/elevate/common-search.md` | Reference doc template: search component | ~80 lines |
| `.orch/references/internal/elevate/common-chat.md` | Reference doc template: chat component | ~80 lines |
| `.orch/references/internal/elevate/interop.md` | Reference doc template: interop service | ~80 lines |
| `.orch/references/internal/elevate/data-connector.md` | Reference doc template: data connector | ~80 lines |
| `.orch/references/internal/elevate/websocket.md` | Reference doc template: WebSocket service | ~80 lines |
| `.orch/references/internal/elevate/power-bi.md` | Reference doc template: Power BI wrapper | ~80 lines |
| `.orch/references/internal/elevate/tableau.md` | Reference doc template: Tableau wrapper | ~80 lines |
| `.orch/references/internal/elevate/document-renderer.md` | Reference doc template: document renderer | ~80 lines |
| `.orch/references/internal/elevate/notification-consumer.md` | Reference doc template: notification consumer | ~80 lines |
| `.orch/references/internal/elevate/notification-publisher.md` | Reference doc template: notification publisher | ~80 lines |
| `.orch/references/internal/elevate/platform-detection.md` | Reference doc template: platform detection | ~80 lines |
| `.orch/references/internal/elevate/usage-stats.md` | Reference doc template: usage statistics | ~80 lines |

**New file count:** 18 files (1 hook, 1 skill + 1 script + 1 example, 14 reference doc templates)

### 11.2 Modified Files

| File | Change | Impact |
|------|--------|--------|
| `.orch/hooks/check-stack.js` | Add elevate/HDS package detection to `detectStack()` function and `interesting` array. Add `elevate_libs`, `hds_installed`, `elevate_core_missing` fields to `stackToYaml()`. | ~40 lines added |
| `.orch/hooks/resolve-references.js` | Add `platform_libs` section parsing to `parseResolverYaml()`. | ~15 lines added |
| `.orch/references/angular/resolver.yaml` | Add `platform_libs:` section with 23 entries (section 9.1). | ~120 lines added |
| `.orch/registry.yaml` | Add 23 registry entries for elevate/HDS library docs with `managed_by: "pack:elevate"` or `"pack:hds"`. | ~150 lines added |
| `.orch/workflows/angular-new-feature.yaml` | Add `pre-check` to phase 007. Add optional phase 006.5 for core library install. | ~20 lines added |
| `.orch/scripts/relay/prompt-builder.js` | Read `elevate_libs` from stack profile and pass to resolver. | ~10 lines added |
| `.orch/references/internal/elevate/overview.md` | Populate template with complete service catalog (all 23 libs). | Content replacement |
| `.orch/references/internal/elevate/auth.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/authorization.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/logging.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/config.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/preferences.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/common-grid.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/common-chart.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/elevate/common-dialog.md` | Populate template with real API. | Content replacement |
| `.orch/references/internal/hds/tokens.md` | Populate template with real token catalog. | Content replacement |
| `.orch/references/internal/hds/components.md` | Populate template with real component catalog. | Content replacement |
| `.orch/references/internal/hds/theming.md` | Populate template with real theming guide. | Content replacement |
| `.orch/references/internal/hds/deprecated-tokens.md` | Populate template with real deprecated token map. | Content replacement |
| `.github/skills/angular-elevate-audit/SKILL.md` | Update sub-libs registry to include all 23 libs. Remove duplicated `package.json` scanning from Steps 1-2; replace with `stack.yaml` read. | ~30 lines changed |
| `.github/skills/angular-elevate-apply/SKILL.md` | Same sub-libs registry update. Add delegation to `/angular-elevate-add` for missing-but-needed libs. | ~30 lines changed |
| `.github/skills/angular-elevate-generate/SKILL.md` | Same sub-libs registry update. Support `--uses auto-detect` mode via `stack.yaml`. | ~20 lines changed |
| `.github/skills/angular-hds-audit/SKILL.md` | Add `hds_installed` gate at Step 1. | ~5 lines changed |
| `.github/skills/angular-hds-apply/SKILL.md` | Add `hds_installed` gate at Step 1. | ~5 lines changed |
| `.github/skills/angular-hds-generate/SKILL.md` | Add `hds_installed` gate at Step 1. | ~5 lines changed |

**Modified file count:** 25 files

### 11.3 Summary

| Category | New | Modified | Total |
|----------|-----|----------|-------|
| Hooks/Scripts | 1 | 2 | 3 |
| Skills | 3 (SKILL.md + script + example) | 6 | 9 |
| Reference docs (templates) | 14 | 15 | 29 |
| Config (resolver, registry, workflow) | 0 | 3 | 3 |
| Relay (prompt builder) | 0 | 1 | 1 |
| **Total** | **18** | **25** | **43** |

---

## 12. Verification

### 12.1 Unit Tests

| Test | File | Validates |
|------|------|-----------|
| `detect-elevate.js` detects core libs | `.orch/hooks/__tests__/detect-elevate.test.js` | Given a `package.json` with `@yourorg/elevate/auth`, `@yourorg/elevate/logging`, and `@yourorg/hds`, the script writes correct `elevate_libs` entries to `stack.yaml`. |
| `detect-elevate.js` detects optional libs | `.orch/hooks/__tests__/detect-elevate.test.js` | Given a `package.json` with `@yourorg/elevate-common/grid`, the script writes a `tier: optional` entry. |
| `detect-elevate.js` identifies missing core | `.orch/hooks/__tests__/detect-elevate.test.js` | Given a `package.json` with auth but not client-core, the `elevate_core_missing` array includes `@yourorg/elevate/client-core`. |
| `detect-elevate.js` handles no elevate | `.orch/hooks/__tests__/detect-elevate.test.js` | Given a `package.json` with no elevate packages, the script writes `elevate_installed: false` and an empty `elevate_libs` array. |
| Resolver loads platform_libs | `.orch/hooks/__tests__/resolve-references.test.js` | Given a `stack.yaml` with `@yourorg/elevate/auth` in packages, the resolver returns `internal/elevate/auth.md` in the resolved doc list. |
| Resolver skips uninstalled libs | `.orch/hooks/__tests__/resolve-references.test.js` | Given a `stack.yaml` without `@yourorg/elevate/websocket`, the resolver does not return `internal/elevate/websocket.md`. |
| Prompt builder includes elevate docs | `.orch/scripts/relay/__tests__/prompt-builder.test.js` | Given a resolved doc list including `internal/elevate/auth.md`, the prompt builder includes its content in the assembled prompt. |

### 12.2 Integration Tests

| Test | Validates |
|------|-----------|
| **End-to-end: audit a project with 3 elevate libs** | Create a sample project with `@yourorg/elevate/auth`, `@yourorg/elevate/logging`, `@yourorg/elevate-common/grid`. Run `/angular-elevate-audit`. Verify: (a) only 3 lib docs loaded into context, (b) report includes findings for all 3, (c) report does not reference uninstalled libs. |
| **End-to-end: generate a service in an elevate project** | Create a sample project with core libs installed. Run `/angular-elevate-generate trade-service --uses auth,logging,config`. Verify: (a) generated service imports `ElevateAuthService`, `LoggingService`, `ConfigService`, (b) generated test uses `provideElevateTesting()`, (c) `ng build` passes. |
| **End-to-end: add a new library** | Start with a project with only core libs. Run `/angular-elevate-add common-grid`. Verify: (a) `@yourorg/elevate-common/grid` added to `package.json`, (b) `ElevateGridModule` imported in target component, (c) `stack.yaml` updated to include the new library, (d) `ng build` passes. |
| **End-to-end: workflow with elevate phase** | Run `angular-new-feature` workflow on a sample project. Verify: (a) phase 007 pre-check runs `detect-elevate.js`, (b) prompt for phase 007 includes only installed lib docs, (c) generated code uses correct elevate API signatures, (d) phase 009 (verification) runs `/angular-elevate-audit` and reports compliance. |
| **Token budget verification** | Run the prompt builder for a project with all 23 libs installed. Measure total token count of platform lib docs. Verify it is under 11,000 tokens. Run for a project with 3 libs. Verify under 2,500 tokens. |

### 12.3 Regression Tests

| Test | Validates |
|------|-----------|
| **No elevate project unchanged** | Run any Angular skill (`/angular-generate-component`, `/angular-review`, etc.) on a project with zero elevate packages. Verify: (a) no elevate docs loaded, (b) no elevate-related content in prompts, (c) skill output is identical to pre-integration behavior. |
| **Existing workflow unchanged** | Run `angular-project-recap` and `angular-migration` workflows. Verify they complete successfully with no elevate-related side effects. |
| **Fallback behavior preserved** | Remove all `.orch/references/internal/elevate/*.md` files. Run `/angular-elevate-audit`. Verify the skill falls back to pattern-based detection (the `detects` field in SKILL.md frontmatter) and produces a valid compliance report, matching current behavior. |

### 12.4 Manual Verification Checklist

- [ ] `node .orch/hooks/detect-elevate.js` exits 0 and produces correct `stack.yaml` output
- [ ] `resolver.yaml` parses without errors (run `node .orch/hooks/resolve-references.js`)
- [ ] All 23 registry entries in `registry.yaml` pass schema validation
- [ ] `/angular-elevate-add logging` installs the package and configures the provider
- [ ] `/angular-elevate-audit` scopes to installed libs only (verify by checking which reference docs appear in the prompt)
- [ ] `/angular-hds-audit` skips scanning when `hds_installed: false`
- [ ] Workflow `angular-new-feature.yaml` parses without errors
- [ ] Phase 007 `pre-check` runs `detect-elevate.js` before the AI phase
- [ ] Token count for a 3-lib project is under 2,500 tokens
- [ ] Token count for a 23-lib project is under 11,000 tokens
- [ ] No existing tests in the repository break after these changes
