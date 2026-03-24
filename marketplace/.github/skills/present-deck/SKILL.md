---
name: present-deck
description: "Convert any markdown to a branded reveal.js HTML slide deck or PPTX. Bundled reveal.js (no CDN), HDS themed via deck-tokens.css. Logo, cover, and theme overridable from .orch/config.yaml."
references: []
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Takes structured markdown and produces a polished, branded slide deck. Each `##` heading becomes a slide. Code blocks get syntax highlighting, tables become styled HTML, and mermaid blocks render as inline SVG. The output is a self-contained file — no external CDN dependencies, works offline, and can be shared as an email attachment or deployed to an internal site.

## Inputs

- **source**: Markdown file path, or "from clipboard" to use current content
- Optional: `--format {html|pptx}` — output format (default: html)
- Optional: `--theme {dark|light|custom}` — theme selection (default: from `.orch/config.yaml` or dark)
- Optional: `--logo {path}` — override logo image (default: from `.orch/config.yaml`)
- Optional: `--cover {title}` — override cover slide title
- Optional: `--output {path}` — output file path

## Steps

1. Read the source markdown content.
2. Read theming configuration:
   a. Load `deck-tokens.css` for HDS color tokens, typography, and spacing.
   b. Read `.orch/config.yaml` for org overrides: logo path, default theme, cover template.
   c. Apply `--theme`, `--logo`, `--cover` overrides if specified.
3. Parse markdown into slide structure:
   a. `#` heading — title/cover slide with logo and date.
   b. `##` heading — content slide or section divider.
   c. `###` heading — sub-content within a slide.
   d. Tables — styled HTML tables with HDS borders and colors.
   e. Mermaid code blocks — render to inline SVG.
   f. Code blocks — syntax-highlighted with HDS code theme.
   g. Bullet lists — styled with HDS spacing.
4. Generate output:
   a. **HTML**: self-contained reveal.js file. Reveal.js library bundled inline (not CDN). Theme CSS inlined. SVG diagrams embedded.
   b. **PPTX**: PowerPoint via pptxgenjs. Mermaid diagrams as embedded PNG. HDS colors applied to slide master.
5. Write the output file.

## Output

```markdown
## Deck Generated — {title}

### Details
| Field        | Value               |
|--------------|---------------------|
| Source       | {markdown path}      |
| Format       | {html / pptx}       |
| Slides       | {n}                  |
| Theme        | {dark / light}       |
| Logo         | {included / none}    |
| Output       | {output path}        |
| Size         | {file size}          |

### Slide Outline
| #  | Type     | Title                  |
|----|----------|------------------------|
| 1  | Cover    | {title}                |
| 2  | Content  | {heading}              |
| 3  | Diagram  | {heading} (mermaid)    |
```

## Validation

- Output opens in browser (HTML) or PowerPoint (PPTX) without errors
- reveal.js is bundled inline — no external CDN requests (verify with network tab)
- HDS theme applied: colors, fonts, and spacing match deck-tokens.css
- Mermaid diagrams render as SVG (not raw text)
- Every `##` heading from source has a corresponding slide
- Logo appears on cover slide (if configured)
- File is fully self-contained — works offline
