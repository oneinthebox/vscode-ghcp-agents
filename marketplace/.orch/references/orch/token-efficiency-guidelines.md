# Token Efficiency Guidelines
Source: ORCH internal
Last refreshed: 2026-03-24

Rules for creating token-efficient reference documentation. All docs stored in `.orch/references/` must follow these guidelines. Read by `@docs` and `/docs-fetch`.

## The 500-Line Rule

Every reference doc in `.orch/references/` must be under 500 lines. This constraint exists because:

| Reason | Impact |
|--------|--------|
| Context window budget | Each skill may load 2-5 reference docs; at 500 lines each, that is 1000-2500 lines |
| Marginal value drops after 500 lines | First 200 lines carry ~80% of useful information |
| Agent attention degrades | Models lose recall accuracy for content past ~4000 tokens in a single doc |
| Parallelism | Smaller docs enable loading only what is needed per skill |

If a source exceeds 500 lines after conversion, split into multiple focused docs (e.g., `angular-signals-guide.md` + `angular-signals-migration-guide.md`).

## Format Selection Matrix

| Content Type | Best Format | Token Cost | When to Use |
|-------------|------------|------------|-------------|
| API reference (methods, params, returns) | Table | ~40 tokens/row | Always for structured data with 3+ fields per item |
| Configuration reference | Table | ~40 tokens/row | Settings with name, type, default, description |
| Step-by-step instructions | Numbered list | ~20 tokens/step | Ordered procedures, max 15 steps |
| Code examples | Fenced code block | ~1 token/char | Actual runnable code the agent should produce |
| Architecture / flow | Mermaid diagram | ~30 tokens/diagram | Relationships, sequences, state machines |
| Decision logic | Table or flowchart | ~40 tokens/row | If/then rules, decision trees |
| Prose explanation | Short paragraphs | ~1.3 tokens/word | Only for context that does not fit tables |
| Type definitions | TypeScript interface | ~1 token/char | API types the agent needs to generate |

## Token Cost Comparison

The same content expressed in different formats:

### Example: 5 API Endpoints

**Table format (~200 tokens):**

```markdown
| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | /funds | ?page,size | Fund[] |
| GET | /funds/:id | -- | Fund |
| POST | /funds | body: CreateFund | Fund |
| PUT | /funds/:id | body: UpdateFund | Fund |
| DELETE | /funds/:id | -- | 204 |
```

**OpenAPI YAML (~600 tokens):**

```yaml
paths:
  /funds:
    get:
      summary: List funds
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: size
          in: query
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Fund'
  # ... 4 more endpoints ...
```

**Prose (~400 tokens):**

```
The API exposes five endpoints for fund management. GET /funds returns a paginated
list of funds, accepting optional page and size query parameters. GET /funds/:id
returns a single fund by its identifier. POST /funds creates a new fund...
```

**Verdict:** Table is 3x more efficient than OpenAPI YAML and 2x more efficient than prose for the same information density.

## What to Strip

When converting external documentation to reference format:

| Strip | Reason | Token Savings |
|-------|--------|---------------|
| Navigation bars / sidebars | Not content | 200-500 tokens |
| Page headers / footers | Repeated on every page | 50-100 tokens |
| SEO metadata / descriptions | For search engines, not agents | 100-200 tokens |
| Cookie banners / legal notices | Irrelevant | 50-100 tokens |
| "Getting Started" boilerplate | Agent already has context | 200-400 tokens |
| Duplicate content across pages | Deduplicate at conversion time | 500+ tokens |
| Marketing language | No technical value | 100-300 tokens |
| Version announcement banners | Captured in doc metadata | 50-100 tokens |
| Social links / community links | Not actionable by agents | 20-50 tokens |
| "Was this page helpful?" widgets | UI-only | 10-20 tokens |

## What to Keep

| Keep | Reason | Priority |
|------|--------|----------|
| Code examples | Agents need exact syntax to generate code | Critical |
| Type signatures / interfaces | Define the contract agents must implement | Critical |
| Gotchas / caveats / warnings | Prevent common mistakes | High |
| Breaking changes | Needed for migration skills | High |
| Default values | Agents must know what to set and what to omit | High |
| Error messages and codes | Agents need to handle/report these | Medium |
| Version constraints | Compatibility information | Medium |
| Diagrams (convert to mermaid) | Architecture understanding | Medium |
| Performance notes | Influence implementation choices | Low |
| Changelog entries | Useful for migration but can be summarized | Low |

## Text-to-Mermaid Conversion Rules

### When to Convert

| Source Content | Convert? | Diagram Type |
|---------------|----------|-------------|
| Architecture diagrams (boxes and arrows) | Yes | `graph TD` or `graph LR` |
| Sequence of API calls | Yes | `sequenceDiagram` |
| State machines / lifecycle | Yes | `stateDiagram-v2` |
| Class hierarchies | Yes | `classDiagram` |
| Timeline / Gantt | Yes | `gantt` |
| Screenshots of UI | No | Describe in prose |
| Flowcharts with >15 nodes | No | Simplify or split |
| Simple 2-3 step processes | No | Use numbered list |

### Diagram Type Selection

| Pattern in Source | Mermaid Type | Example Use |
|-------------------|-------------|-------------|
| Components communicating | `graph TD` | Angular module dependencies |
| Request/response flows | `sequenceDiagram` | API call chains |
| Lifecycle hooks | `stateDiagram-v2` | Component lifecycle |
| Inheritance trees | `classDiagram` | Service hierarchies |
| Build pipeline stages | `graph LR` | CI/CD flow |
| Time-based phases | `gantt` | Migration timeline |

### Mermaid Syntax Rules

- No HTML entities inside mermaid blocks (`&lt;`, `&gt;`, `&amp;`)
- Use `\n` for line breaks in node labels, not `<br/>`
- Quote labels containing special characters: `A["Signal<Trade[]>"]`
- Keep diagrams under 20 nodes for readability
- Use meaningful node IDs: `compA["AppComponent"]` not `A`

## Source-Embedded Doc Extraction Pipeline

For codebases with inline documentation (JSDoc, TSDoc):

```
Source code
  --> TypeScript compiler API / ts-morph
    --> Extract: exports, interfaces, classes, methods
      --> For each exported symbol:
          - Name, type signature, JSDoc comment
          - @param tags -> parameter table
          - @returns tag -> return type
          - @example tags -> code blocks
          - @deprecated tag -> warning callout
  --> typedoc --json output.json
    --> Parse JSON, extract per-module summaries
  --> Convert to markdown tables + code blocks
    --> Write to .orch/references/{lib-name}-api.md
```

### Extraction Priority

| Symbol Type | Include | Format |
|-------------|---------|--------|
| Exported interfaces | Always | TypeScript code block |
| Exported classes (public API) | Always | Table of methods |
| Public methods | Always | Table: name, params, return, description |
| Private/protected members | Never | -- |
| Internal utilities | Never | -- |
| Type aliases | If referenced by public API | Inline in tables |
| Enums / const objects | If referenced by public API | Table of values |
| Re-exports | Only if adding context | Note the source module |

### Target Token Budgets

| Doc Type | Target Tokens | Max Lines |
|----------|--------------|-----------|
| API reference (small lib, <20 exports) | 2000 | 300 |
| API reference (medium lib, 20-50 exports) | 3500 | 450 |
| API reference (large lib, 50+ exports) | 4000 | 500 (split if needed) |
| Migration guide | 2500 | 350 |
| Configuration reference | 1500 | 200 |
| Conceptual overview | 1000 | 150 |
