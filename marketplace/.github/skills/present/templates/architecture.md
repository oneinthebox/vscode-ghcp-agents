# Architecture Deck Template
# Used by /present when --template architecture is specified
# Each section maps to slide(s) in the output

## Slide mapping

| Source section | Slide type | Notes |
|---------------|-----------|-------|
| # {Project Name} | title-slide | Centered, logo, date |
| ## System Context | section-slide | Blue divider |
| ### Context diagram | diagram-slide | Full-width mermaid SVG |
| ### External Systems | content-slide | Styled table |
| ## Containers | section-slide | Blue divider |
| ### Container diagram | diagram-slide | Full-width mermaid SVG |
| ### Applications | content-slide | Table: app, path, purpose, serve command |
| ### Libraries | content-slide | Table: lib, path, purpose, consumers |
| ## Components | section-slide | Blue divider |
| ### {App name} | content-slide | Per-app: routes, services table |
| ### Data Flow | diagram-slide | Sequence diagram |
| ## Design Principles | section-slide | Blue divider |
| ### Architecture Patterns | content-slide | Table: pattern, usage, status |
| ### State Management | content-slide | Table: approach, where |
| ### Tech Stack | content-slide | Table: lib, version, how used, where |
| ## Code Health | section-slide | Blue divider |
| ### Metrics | metrics-slide | KPI cards: doc coverage, anti-patterns, tests, migration |
| ## Getting Started | content-slide | Numbered list: install, serve, test, ORCH skills |

## Layout rules

- Title slide: always first, centered
- Section dividers: between major C4 levels
- Diagrams: full width, no side content
- Tables: full width, HDS styled
- Metrics: card grid (2x2 or 3x1)
- Content slides: heading + body (max 6 bullet points or 8 table rows per slide)
- If a table exceeds 8 rows, split across multiple slides
