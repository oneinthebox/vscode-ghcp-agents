---
name: docs-fetch
description: "Fetch documentation from external sources (URL, PDF, Confluence, OpenAPI, Storybook), convert to token-efficient markdown, and register in the ORCH registry. Delegates heavy conversion to @doc-convert-worker."
references:
  - references/orch/token-efficiency-guidelines.md
  - references/orch/registry-schema-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Retrieves documentation from diverse external sources and converts it into compact, token-efficient markdown suitable for LLM context windows. Supports web pages, PDFs, Confluence pages, OpenAPI specs, and Storybook instances. Heavy conversion tasks are delegated to `@doc-convert-worker` for parallel processing. Converted docs are stored in `.orch/references/` and registered in `.orch/registry.yaml`.

## Inputs

- **source**: URL, file path, or source identifier to fetch
- **--type {url|pdf|confluence|openapi|storybook}** — source type (auto-detected if omitted)
- Optional: `--id {name}` — registry identifier (auto-generated from source if omitted)
- Optional: `--version {ver}` — version tag for the source
- Optional: `--max-tokens {n}` — target token budget for conversion (default: 4000)

## Token Budget Calculation

The `--max-tokens` budget controls conversion compression. The formula:

```
token_estimate = character_count / 4      # rough tokenizer approximation
compression_ratio = max_tokens / token_estimate
```

If `compression_ratio < 1.0`, the converter applies progressive reduction:
1. Strip boilerplate and navigation (typically saves 30-50%).
2. Collapse verbose prose to bullet summaries (saves 20-30%).
3. Truncate examples to first instance per pattern (saves 10-20%).
4. If still over budget, remove lowest-priority sections (appendices, changelogs).

## URL to Output Path Resolution

The skill derives the output path from the source URL or explicit `--id`:

```
Source URL: https://angular.dev/guide/signals
Auto-ID:   angular-dev-guide-signals
Path:      .orch/references/angular-dev-guide-signals.md

Source URL: https://primeng.org/autocomplete
Auto-ID:   primeng-org-autocomplete
Path:      .orch/references/primeng-org-autocomplete.md

Explicit:  --id angular-signals-v19
Path:      .orch/references/angular-signals-v19.md
```

Auto-ID generation: strip protocol, replace `/` and `.` with `-`, remove `www`, lowercase, truncate to 64 characters.

## Format-Specific Conversion Pipelines

### HTML to Markdown
1. Fetch with HTTP GET, follow redirects (max 5 hops).
2. Parse DOM, select `<main>` or `<article>` or largest content block via heuristic scoring.
3. Strip `<nav>`, `<footer>`, `<aside>`, `<header>`, cookie/consent overlays, ad containers.
4. Convert remaining HTML to markdown: `<h1-6>` to `#`, `<pre><code>` to fenced blocks, `<table>` to pipe tables, `<ul>/<ol>` to lists.
5. Collapse whitespace, normalize link references.

### PDF to Markdown
1. Extract text with layout preservation (columns, headers, tables).
2. Detect heading levels by font size: largest = `#`, second = `##`, etc.
3. Convert tabular regions to pipe tables using column boundary detection.
4. Preserve ordered/unordered list structure. Drop page numbers and repeated headers/footers.

### OpenAPI to Markdown
1. Parse YAML/JSON spec (`openapi: 3.x`).
2. For each path, generate a section:
   ```markdown
   ## GET /api/users
   **Summary:** List all users
   **Parameters:**
   | Name   | In    | Type   | Required | Description       |
   |--------|-------|--------|----------|-------------------|
   | limit  | query | integer | No      | Max results (100) |
   **Response 200:**
   ```json
   { "users": [{ "id": 1, "name": "string" }] }
   ```
   ```
3. Collect schema definitions into a `## Schemas` section with type tables.

### Confluence to Markdown
1. Fetch page via REST API: `GET /rest/api/content/{id}?expand=body.storage,children.page`.
2. Parse Confluence storage format (XHTML) to markdown.
3. Expand macros: `{code}` to fenced blocks, `{info}/{warning}` to blockquotes, `{toc}` stripped.
4. Optionally recurse into child pages (depth controlled by token budget).

## Steps

1. Detect source type from the input (URL pattern, file extension, or explicit `--type`).
2. Fetch the raw content using the appropriate format-specific pipeline above.
3. Delegate conversion to `@doc-convert-worker`:
   a. Strip boilerplate, navigation, and redundant content.
   b. Compress to fit within `--max-tokens` budget using the token budget formula.
   c. Preserve: headings, code examples, tables, key definitions.
   d. Remove: repeated headers/footers, cookie banners, sidebar content.
4. Validate converted output: readable, headings intact, code blocks preserved.
5. Write converted markdown to `.orch/references/{id}.md`.
6. Register in `.orch/registry.yaml` with source URL, version, fetch date, token count.

## Concrete Example: Fetching an Angular Guide

**Command:** `/docs-fetch https://angular.dev/guide/signals --version v19 --max-tokens 3000`

**Fetched-and-converted output** (saved to `.orch/references/angular-dev-guide-signals.md`):
```markdown
# Angular Signals (v19)

## Overview
Signals are reactive primitives that notify consumers when their value changes.

## Creating Signals
- `signal(initialValue)` — writable signal
- `computed(() => expr)` — derived read-only signal
- `effect(() => { ... })` — side-effect that re-runs on signal change

## Example
```typescript
const count = signal(0);
const double = computed(() => count() * 2);
effect(() => console.log('Count:', count()));
count.set(5); // logs "Count: 5", double() === 10
```

## Signal Inputs
```typescript
@Component({ ... })
export class UserCard {
  name = input.required<string>();   // required signal input
  age = input(0);                     // optional with default
}
```

## Comparison with RxJS
| Feature        | Signals          | RxJS Observables     |
|----------------|------------------|----------------------|
| Synchronous    | Yes              | No                   |
| Glitch-free    | Yes              | No                   |
| Template use   | Direct `count()` | Requires `async` pipe |
```

## Output

```markdown
## Doc Fetch — angular-dev-guide-signals

### Source
| Field           | Value                               |
|-----------------|-------------------------------------|
| Source          | https://angular.dev/guide/signals    |
| Type            | url (auto-detected)                  |
| Version         | v19                                  |
| Fetched         | 2026-03-25                           |

### Conversion
| Metric          | Value              |
|-----------------|--------------------|
| Raw size        | 12,400 tokens      |
| Converted size  | 2,860 tokens       |
| Compression     | 77%                |
| Output path     | `.orch/references/angular-dev-guide-signals.md` |

### Registry Entry
Added to `.orch/registry.yaml`:
```yaml
- id: angular-dev-guide-signals
  source: https://angular.dev/guide/signals
  type: url
  version: v19
  last_refreshed: "2026-03-25"
  tokens: 2860
  max_stale_days: 30
  status: current
  managed_by: docs-fetch
```
```

## Validation

- Converted markdown is under the token budget (`converted_tokens <= max_tokens`)
- Headings, code blocks, and tables preserved from source
- No boilerplate (navigation, cookie banners, footers) in output
- Registry entry created with correct source URL, version, and fetch date
- Output file exists at the declared path and is valid markdown
- Auto-ID generation is deterministic (same URL always produces the same ID)
- Token count in registry matches actual token estimate of the written file
