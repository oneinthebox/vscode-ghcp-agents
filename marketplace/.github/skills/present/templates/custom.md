# Custom Deck Template
# Used by /present when --template custom or when source is any markdown file

## Slide mapping

| Markdown element | Slide type | Notes |
|-----------------|-----------|-------|
| `# Heading` | title-slide | First H1 becomes title slide |
| `## Heading` | section-slide or content-slide | Each H2 starts a new slide |
| `### Heading` | sub-heading within slide | Does not create new slide |
| Table | styled table | HDS table styling |
| ```mermaid | diagram | Rendered as inline SVG |
| ```code | code block | Syntax highlighted |
| Bullet list | styled list | Max 6 items per slide, overflow to next |
| `---` (horizontal rule) | force new slide | Manual slide break |
| Image `![](path)` | image slide | Centered, max-width |

## Rules

- Max 6 bullet points per slide (split if more)
- Max 8 table rows per slide (split if more)
- Mermaid blocks always get their own slide (full-width)
- Code blocks under 10 lines stay inline; over 10 get their own slide
