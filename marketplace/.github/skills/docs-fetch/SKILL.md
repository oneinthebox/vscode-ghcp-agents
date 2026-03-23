---
name: docs-fetch
description: "Fetch documentation from external sources (URL, PDF, Confluence, OpenAPI, Storybook), convert to token-efficient markdown, and register in the ORCH registry. Delegates heavy conversion to @doc-convert-worker."
references: []
---

## Context

Retrieves documentation from diverse external sources and converts it into compact, token-efficient markdown suitable for LLM context windows. Supports web pages, PDFs, Confluence pages, OpenAPI specs, and Storybook instances. Heavy conversion tasks are delegated to `@doc-convert-worker` for parallel processing. Converted docs are stored in `.orch/references/` and registered in `.orch/registry.yaml`.

## Inputs

- **source**: URL, file path, or source identifier to fetch
- **--type {url|pdf|confluence|openapi|storybook}** — source type (auto-detected if omitted)
- Optional: `--id {name}` — registry identifier (auto-generated from source if omitted)
- Optional: `--version {ver}` — version tag for the source
- Optional: `--max-tokens {n}` — target token budget for conversion (default: 4000)

## Steps

1. Detect source type from the input (URL pattern, file extension, or explicit `--type`).
2. Fetch the raw content:
   a. **URL**: HTTP GET, follow redirects, extract main content (strip nav, ads, boilerplate).
   b. **PDF**: Extract text, tables, and structure. Preserve headings and lists.
   c. **Confluence**: Use Confluence API to fetch page content and child pages.
   d. **OpenAPI**: Parse spec, extract endpoints, schemas, and descriptions.
   e. **Storybook**: Crawl component stories, extract props, usage examples, and descriptions.
3. Delegate conversion to `@doc-convert-worker`:
   a. Strip boilerplate, navigation, and redundant content.
   b. Compress to fit within `--max-tokens` budget.
   c. Preserve: headings, code examples, tables, key definitions.
   d. Remove: repeated headers/footers, cookie banners, sidebar content.
4. Validate converted output: readable, headings intact, code blocks preserved.
5. Write converted markdown to `.orch/references/{id}.md`.
6. Register in `.orch/registry.yaml` with source URL, version, fetch date, token count.

## Output

```markdown
## Doc Fetch — {id}

### Source
| Field           | Value              |
|-----------------|--------------------|
| Source          | {url or path}       |
| Type            | {detected type}     |
| Version         | {version}           |
| Fetched         | {date}              |

### Conversion
| Metric          | Value              |
|-----------------|--------------------|
| Raw size        | {n} tokens         |
| Converted size  | {n} tokens         |
| Compression     | {pct}%             |
| Output path     | `.orch/references/{id}.md` |

### Registry Entry
Added to `.orch/registry.yaml`:
- id: {id}
- source: {url}
- version: {version}
- last_refreshed: {date}
- tokens: {n}
- status: current
```

## Validation

- Converted markdown is under the token budget
- Headings, code blocks, and tables preserved from source
- No boilerplate (navigation, cookie banners, footers) in output
- Registry entry created with correct source URL and date
- Output file exists at the declared path and is valid markdown
