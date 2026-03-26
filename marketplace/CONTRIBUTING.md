# Contributing to ORCH

ORCH welcomes contributions from both internal team members and external teams building domain plugins.

---

## How to Contribute

1. **Internal team**: Clone the repo, create a branch, make changes, open a PR. All PRs require review by the ORCH team.
2. **External contributors**: Fork the repo, follow the structure conventions below, and open a PR with a clear description of what you are adding or changing.

All new agents and skills must integrate with the audit framework. Skills must be self-contained, reference docs must be under 500 lines, and agent boundaries must be explicitly declared.

---

## Adding a New Skill

Each skill lives in `.github/skills/<skill-name>/` and follows the [agentskills.io specification](https://agentskills.io/specification).

### Directory structure

```
.github/skills/<skill-name>/
  SKILL.md              # Skill definition (required)
  references/           # Skill-authored reference material (templates, checklists)
  scripts/              # Automation scripts (Node.js, bash)
  examples/             # Before/after examples
  variants/             # Version-specific step overrides (see below)
```

### SKILL.md template

```yaml
---
name: <domain>-<action>-<target>
description: "Clear description with trigger keywords. 10-1024 chars."
metadata:
  author: your-name
  version: "1.0"
references:
  - references/<domain>/<version>/<doc>.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context
What this skill does and when to use it.

## Inputs
What the user provides (flags, arguments, file paths).

## Steps
1. Imperative instructions the agent follows.
2. Each step is a concrete action with explicit file paths.

## Output
What the agent produces (files, reports, tables).

## Validation
How to verify the output is correct (build, tests, checks).
```

### Checklist

- [ ] SKILL.md has valid YAML frontmatter with name, description, references, and allowed-tools
- [ ] Steps use imperative voice and numbered lists
- [ ] Output section describes the deliverable format
- [ ] Validation section includes concrete verification steps
- [ ] References point to files that exist in `.orch/references/`
- [ ] The relevant agent file (`.github/agents/*.agent.md`) lists the new skill
- [ ] The skill is registered in `.orch/registry.yaml`

---

## Version-Aware Skills

When a skill's behavior differs by Angular version (different patterns for v17 vs v19), you CAN create version variants (this system is designed but not yet implemented for any skill):

```
.github/skills/<skill-name>/
  SKILL.md              # Base skill with common steps
  variants/
    modern.md           # Steps for v18+ (standalone, signals, control flow)
    legacy.md           # Steps for v16-v17 (NgModules, structural directives)
```

Update `.orch/references/angular/resolver.yaml` if the skill introduces new version-gated features. The resolver maps feature categories to version gates so the coordinator loads the correct variant at runtime.

---

## Adding a New Agent

Each domain follows a consistent pattern:

1. **Coordinator agent** (`@<domain>`) -- triage + loop owner
2. **3 sub-agents** -- `@<domain>-planner`, `@<domain>-engineer`, `@<domain>-verifier`
3. **Granular skills** -- domain-specific, one skill per task
4. **Reference docs** -- versioned in `.orch/references/<domain>/`
5. **Boundaries config** -- add the agent to `.orch/audit/config/boundaries.yaml`
6. **Adherence rules** -- add domain rules to `.orch/audit/config/adherence-rules.yaml`

Agent files live in `.github/agents/<name>.agent.md` with YAML frontmatter declaring name, description, model, tools, and sub-agents. Internal worker agents include `user-invocable: false` in the frontmatter.

---

## Adding Reference Docs

1. Add an entry to `doc-packs/<domain>.yaml` (the doc pack template).
2. Run `@docs /docs-fetch` to pull and convert the source to token-efficient markdown.
3. Place the output in `.orch/references/<domain>/<version>/`.
4. Keep each reference doc under 500 lines (token budget).
5. Use tables for API references, Mermaid for flows with 3+ interactions, and strip navigation/headers/footers.

---

## Testing Changes

1. **Run `orch doctor`** in a test project to verify config, reference paths, audit hooks, agents, and skills.
2. **Run `orch init`** in a clean test project to verify the full installation flow.
3. **Verify preflight** passes with `preflight.check_references: true` in `.orch/config.yaml`.
4. **Test skills in isolation** before integration testing with the full planner/engineer/verifier pipeline.
5. **Check integrity** with `orch status` to confirm all checksums match.

---

## Code Style

### Node.js scripts (`.orch/scripts/`, skill `scripts/`)

- Pure Node.js -- no external dependencies beyond the project's own `node_modules`
- Include a shebang line: `#!/usr/bin/env node`
- Use strict mode: `'use strict';`
- Output JSON to stdout for programmatic consumption
- Exit 0 on success, non-zero on failure

### YAML files

- 2-space indentation
- Comments above keys, not inline
- Quoted strings for values containing special characters

### Markdown files

- ATX headers (`#`, `##`, `###`)
- Tables for structured data
- Fenced code blocks with language identifiers
- Imperative voice in skill instructions

### All files

- Must work on macOS, Linux, and Windows (Git Bash)
- No hardcoded absolute paths
- No secrets or credentials
