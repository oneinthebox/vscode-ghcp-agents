---
description: "Token efficiency and format rules for converting documentation into ORCH reference material"
applyTo: ".github/references/**/*.md"
---

## Token Efficiency Rules

All reference documentation must be optimized for LLM token consumption. Token efficiency directly impacts Copilot output quality.

### Format Selection

| Content type | Output format | Rationale |
|-------------|---------------|-----------|
| Conceptual docs, guides | Markdown prose + tables | Most token-efficient |
| API references, component props | Markdown tables | Compact, structured |
| Code patterns to mimic | Native code (.ts, .java, .py) | Preserves exact patterns |
| Workflows with 3+ steps | Mermaid inside markdown | Fewer tokens than prose |
| Architecture, service interactions | Mermaid diagrams | Precise, unambiguous |
| Config examples (< 20 lines) | Native format (.yaml, .json) | Fidelity matters |
| Config examples (large) | Markdown table | Token savings |

### Token Budget

- Maximum 500 lines per reference doc
- Prioritize API surface and usage examples over theory
- Use table format for props/parameters
- Strip: navigation, headers/footers, SEO content, ads, duplicates
- Keep: code examples, type signatures, gotchas/warnings

### Text-to-Mermaid Conversion

Convert prose to mermaid when ALL conditions are met:
1. Describes interactions between 2+ named entities
2. Has 3+ steps or interactions
3. Mermaid version uses fewer tokens than prose
4. Prose requires mentally tracking state across multiple steps

Diagram type selection:
- Request/response between services → `sequenceDiagram`
- Linear or branching steps → `flowchart`
- State transitions → `stateDiagram-v2`
- System dependencies (no flow) → `graph TD`

### Source-Embedded Documentation (JSDoc, TSDoc, Compodoc, PyDoc, Javadoc)

When converting documentation from source code, follow this two-step pipeline:

**Step 1: Extract** — Run the generator tool via terminal to produce intermediate output.
**Step 2: Convert** — Transform intermediate output to token-efficient markdown.

Never parse source comments manually — always use the generator tool.

| Format | When to use | Key extractions |
|--------|------------|-----------------|
| **JSDoc** | `.js` files with `/** */` comments | Functions, params (@param), returns (@returns), examples (@example) |
| **TSDoc** | `.ts` files with `/** */` comments, interfaces, type aliases | Classes, interfaces, methods, type params, generics, overloads |
| **Compodoc** | Angular projects with decorators | Components (@Input/@Output/selector), services (public methods), modules (declarations/imports), pipes, directives |
| **PyDoc** | `.py` files with triple-quote docstrings | Classes, functions, params (from type hints + docstring), returns, raises, module-level docstrings |
| **Javadoc** | `.java` files with `/** */` comments | Classes, methods, @param, @return, @throws, interfaces, enums |

Extraction output format — use this table structure for every class/interface:

```markdown
## ClassName

Brief description from class-level doc comment.

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `methodName` | `param1: Type` — description | `ReturnType` | What it does |
```

For Angular components (Compodoc), use this structure:

```markdown
## ComponentName

Selector: `<app-component-name>`

### Inputs
| Input | Type | Default | Description |
|-------|------|---------|-------------|

### Outputs
| Output | Type | Description |
|--------|------|-------------|

### Public Methods
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
```

### Do

- Use tables for every API reference (method, params, return type, description)
- Use code blocks with language tags for all examples
- Include one concise example per public method from @example tags if available
- Use mermaid for service interaction flows
- Start with a 2-3 sentence summary of what the doc covers
- For source-embedded docs: always run the generator tool, never parse manually
- For source-embedded docs: group output by module/package → class/interface → method
- For source-embedded docs: if >50 public APIs, split into multiple reference docs

### Don't

- Don't include full tutorial/guide prose — summarize the key points
- Don't duplicate content across reference docs
- Don't include version history or changelogs (just note the version)
- Don't use HTML in markdown — pure markdown only
- Don't include images (they consume tokens but Copilot can't see them)
- Don't extract private/internal methods from source-embedded docs
- Don't include inherited docs unless the subclass overrides them
- Don't include implementation details from source — only the API surface
