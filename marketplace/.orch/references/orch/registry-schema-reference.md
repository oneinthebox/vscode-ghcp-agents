# Registry Schema Reference
Source: ORCH internal
Last refreshed: 2026-03-24

YAML schema for `.orch/registry.yaml` -- the central catalog of all documentation sources managed by ORCH. Read by `@docs` skills.

## File Location

```
.orch/registry.yaml
```

## Top-Level Structure

```yaml
version: 1

sources:
  - id: angular-overview-v19
    name: "Angular Overview v19"
    type: url
    origin: https://angular.dev/overview
    format: html
    output: .orch/references/angular/v19/overview-guide.md
    scope: frontend-ts-angular
    version: "19.x"
    managed_by: "pack:angular"
    last_refreshed: null
    status: draft
```

## Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier, kebab-case (e.g., `angular-signals-v19`) |
| `name` | string | yes | Human-readable display name |
| `type` | enum | yes | Source type (see table below) |
| `origin` | string \| null | yes | URL, file path, or null for curated docs |
| `format` | enum | yes | Source format (see table below) |
| `output` | string | yes | Path to converted markdown file (repo-relative) |
| `scope` | string | yes | Technology scope tag (e.g., `frontend-ts-angular`) |
| `version` | string | no | Version of the documented technology |
| `managed_by` | string | yes | Ownership: `pack:{name}` or `user` or `orch` |
| `last_refreshed` | ISO date \| null | yes | Date the doc was last fetched/converted; null if never |
| `status` | enum | yes | Document status (see table below) |
| `compatibility` | object | no | Version constraints (Angular, Node, TypeScript) |

## Supported Types

| Type | Description | Origin Value | Example |
|------|------------|-------------|---------|
| `url` | Web page to fetch and convert | Full URL | `https://angular.dev/overview` |
| `openapi` | OpenAPI/Swagger spec | URL or file path | `https://api.example.com/v3/openapi.json` |
| `pdf` | PDF document | URL or file path | `./docs/architecture.pdf` |
| `confluence` | Confluence wiki page | Confluence page URL | `https://wiki.corp.com/display/ARCH/API` |
| `storybook` | Storybook component docs | Storybook URL | `https://storybook.corp.com` |
| `codebase` | Source code analysis | Directory path | `src/libs/shared/` |
| `source-embedded` | JSDoc/TSDoc extraction | Directory path | `src/libs/ui/src/` |
| `curated` | Manually written reference | null | null (no external source) |

## Supported Formats

| Format | Description | Used With Types |
|--------|------------|-----------------|
| `html` | HTML web page | `url`, `confluence` |
| `json` | JSON document | `openapi` |
| `yaml` | YAML document | `openapi` |
| `jsdoc` | JavaScript JSDoc comments | `source-embedded` |
| `tsdoc` | TypeScript TSDoc comments | `source-embedded` |
| `compodoc` | Angular Compodoc output | `source-embedded`, `codebase` |
| `pydoc` | Python docstrings | `source-embedded` |
| `javadoc` | Java Javadoc comments | `source-embedded` |
| `markdown` | Markdown document | `curated`, `url` |

## Status Values

| Status | Meaning | Visual Indicator | Transition |
|--------|---------|-----------------|------------|
| `current` | Doc is fresh and up to date | `.tag-ok` | Set when `last_refreshed` is within `max_stale_days` |
| `stale` | Doc is past its freshness threshold | `.tag-warn` | Automatic when `last_refreshed + max_stale_days < today` |
| `draft` | Doc registered but never fetched | `.tag-info` | Initial state when `last_refreshed` is null |
| `error` | Last fetch/conversion failed | `.tag-bad` | Set by `/docs-fetch` on failure |

## managed_by Values

| Value | Description | Update Behavior |
|-------|------------|-----------------|
| `pack:{name}` | Centrally managed by a doc pack | Updated via `orch update`; pack name identifies the bundle (e.g., `pack:angular`, `pack:primeng`) |
| `user` | Project-specific, added by the team | Never overwritten by `orch update`; user is responsible for freshness |
| `orch` | ORCH platform internal reference | Updated when ORCH itself is updated; platform documentation |

### Pack Update Flow

```
orch update
  --> Check installed packs
    --> For each pack entry (managed_by: "pack:{name}"):
        If pack has a newer version:
          Update origin URL (if changed)
          Set status: "draft" (needs re-fetch)
          Set last_refreshed: null
    --> SKIP entries where managed_by: "user"
    --> SKIP entries where managed_by: "orch" (updated separately)
```

## Staleness Calculation

A doc is stale when:

```
today - last_refreshed > max_stale_days
```

Where `max_stale_days` comes from `.orch/config.yaml`:

```yaml
preflight:
  max_stale_days: 30
```

| Condition | Status |
|-----------|--------|
| `last_refreshed` is null | `draft` (never fetched) |
| `today - last_refreshed <= max_stale_days` | `current` |
| `today - last_refreshed > max_stale_days` | `stale` |
| Last fetch failed | `error` |

## Example Entries

### URL Source

```yaml
- id: angular-signals-v19
  name: "Angular Signals Guide v19"
  type: url
  origin: https://angular.dev/guide/signals
  format: html
  output: .orch/references/angular/v19/signals-guide.md
  scope: frontend-ts-angular
  version: "19.x"
  managed_by: "pack:angular"
  last_refreshed: "2026-03-24"
  status: current
```

### OpenAPI Source

```yaml
- id: trading-api-v3
  name: "Trading API v3 Spec"
  type: openapi
  origin: https://api.corp.com/v3/openapi.json
  format: json
  output: .orch/references/internal/trading-api-v3-guide.md
  scope: backend-api
  version: "3.0"
  managed_by: "user"
  last_refreshed: "2026-03-10"
  status: current
```

### Source-Embedded (TSDoc)

```yaml
- id: shared-lib-api
  name: "@corp/shared Library API"
  type: source-embedded
  origin: src/libs/shared/src/
  format: tsdoc
  output: .orch/references/internal/shared-lib-api.md
  scope: frontend-ts-angular
  version: "2.x"
  managed_by: "user"
  last_refreshed: "2026-03-20"
  status: current
```

### Curated (ORCH Internal)

```yaml
- id: orch-audit-record-schema
  name: "ORCH Audit Record Schema"
  type: curated
  origin: null
  format: markdown
  output: .orch/references/orch/audit-record-schema.md
  scope: orch-platform
  managed_by: "orch"
  last_refreshed: "2026-03-24"
  status: current
```

### PDF Source

```yaml
- id: architecture-decision-records
  name: "Architecture Decision Records"
  type: pdf
  origin: ./docs/ADR-collection.pdf
  format: html
  output: .orch/references/internal/adr-guide.md
  scope: architecture
  managed_by: "user"
  last_refreshed: "2026-02-15"
  status: stale
```

### Confluence Source

```yaml
- id: onboarding-wiki
  name: "Developer Onboarding Guide"
  type: confluence
  origin: https://wiki.corp.com/display/DEV/Onboarding
  format: html
  output: .orch/references/internal/onboarding-guide.md
  scope: general
  managed_by: "user"
  last_refreshed: null
  status: draft
```

### Storybook Source

```yaml
- id: hds-components-storybook
  name: "HDS Component Library"
  type: storybook
  origin: https://hds-storybook.corp.com
  format: html
  output: .orch/references/internal/hds/components-guide.md
  scope: frontend-ts-angular
  version: "4.x"
  managed_by: "pack:hds"
  last_refreshed: "2026-03-22"
  status: current
```

### Codebase Analysis

```yaml
- id: app-module-map
  name: "Application Module Map"
  type: codebase
  origin: src/app/
  format: compodoc
  output: .orch/references/internal/app-module-map.md
  scope: frontend-ts-angular
  managed_by: "user"
  last_refreshed: "2026-03-24"
  status: current
```

## Naming Convention

Output files use the `-guide.md` suffix by convention:

```
.orch/references/{domain}/{optional-version}/{name}-guide.md
```

Examples:
- `.orch/references/angular/v19/signals-guide.md`
- `.orch/references/primeng/v17/table-guide.md`
- `.orch/references/internal/trading-api-v3-guide.md`
- `.orch/references/orch/audit-record-schema.md` (platform docs omit `-guide`)
