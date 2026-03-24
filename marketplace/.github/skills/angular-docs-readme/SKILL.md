---
name: angular-docs-readme
description: "Generate or update README.md for the project — setup instructions, architecture overview, available scripts, tech stack, contributing guide, and ORCH agent usage. Reads actual project structure, not templates."
references: []
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates a comprehensive README.md (or updates an existing one) based on the actual project state. Reads package.json, angular.json, nx.json, route configs, and ORCH setup to produce accurate, up-to-date documentation. Not a generic template — every section reflects what's really in the project.

## Inputs

- `@angular /angular-docs-readme` — generate README for the project
- `@angular /angular-docs-readme --update` — update existing README, preserve custom sections
- `@angular /angular-docs-readme --sections setup,architecture,scripts` — generate specific sections only

## Steps

1. Read project metadata: `package.json` (name, version, description, scripts), `angular.json` or `nx.json` (projects, apps, libs).
2. Read tech stack: detect Angular version, TypeScript, RxJS, UI libraries (AG Grid, PrimeNG, Plotly), test frameworks (Jest, Playwright).
3. Read ORCH setup: `.github/agents/`, `.github/skills/`, `.orch/config.yaml` — what agents and skills are available.
4. Read existing README.md (if `--update`). Identify custom sections to preserve.
5. Generate sections:
   - **Project name + description** (from package.json)
   - **Tech stack** (table: library, version, how it's used)
   - **Prerequisites** (Node version, npm, Docker if docker-compose exists)
   - **Getting started** (install, serve, test commands from package.json scripts)
   - **Project structure** (directory tree with descriptions)
   - **Architecture overview** (apps, libs, their purpose — from scan-arch output if available)
   - **Available scripts** (table of npm/nx scripts with descriptions)
   - **Testing** (how to run unit, e2e tests, coverage)
   - **ORCH agents** (what agents are available, example commands)
   - **Contributing** (link to CONTRIBUTING.md if exists)
6. If `--update`: merge new sections with existing, preserve custom content marked with `<!-- custom -->` blocks.
7. Write README.md.

## Output

```markdown
## README Generated/Updated

Sections: {n}
Lines: {n}
Mode: {generate|update}
Custom sections preserved: {n} (if update)

### Sections included
- Project overview
- Tech stack (10 libraries detected)
- Prerequisites
- Getting started (5 scripts)
- Project structure
- Architecture (2 apps, 3 libs)
- Available scripts (12 detected)
- Testing
- ORCH agents (11 agents, 60 skills available)
```

## Validation

- All detected scripts are listed
- Tech stack versions match package.json
- Setup instructions actually work (npm install → ng serve)
- Links are valid (no broken references)
- No hallucinated content — everything comes from actual project files
