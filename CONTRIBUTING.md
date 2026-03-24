# Contributing to ORCH

ORCH welcomes contributions from both internal team members and external teams building domain plugins for the marketplace.

---

## Quick Links

- [Product Requirements (PRD)](docs/prd.md) — Vision, scope, capabilities
- [Technical Design](docs/tech.md) — Architecture, schemas, file structure, agent/skill specs
- [Delivery Plan](docs/delivery.md) — Phased rollout, tasks, estimates
- [Executive Overview](docs/executive-overview.md) — Vision, features, marketplace
- [User Guide](docs/user-guide.md) — Hands-on guide for developers

---

## Types of Contributions

### New Domain (e.g., `@springboot`, `@fastapi`)

Each domain follows the same pattern:

1. **Coordinator agent** (`@<domain>`) — triage + loop owner
2. **3 sub-agents** — `@<domain>-planner`, `@<domain>-engineer`, `@<domain>-verifier`
3. **Granular skills** — domain-specific, one skill per task (e.g., `/springboot-scan-deps`, `/springboot-generate-endpoint`)
4. **Reference docs** — versioned in `.orch/references/<domain>/`
5. **Boundaries config** — add agent to `.orch/config/boundaries.yaml`
6. **Adherence rules** — add domain rules to `.orch/config/adherence-rules.yaml`

See [tech.md Section 7](docs/tech.md) for agent specification templates.

### New Skill

Skills must follow the [agentskills.io specification](https://agentskills.io/specification).

```
.github/skills/<skill-name>/
  ├── SKILL.md              # Skill definition (see template below)
  ├── references/            # Skill-authored material (examples, templates, checklists)
  ├── scripts/               # Automation scripts
  └── examples/              # Before/after examples
```

**SKILL.md template:**

```yaml
---
name: <domain>-<action>-<target>
description: "10-1024 chars. Clear trigger keywords."
references:
  - orch://references/<domain>/<version>/<doc>.md
---

## Context
What this skill does and when to use it.

## Inputs
What the user provides.

## Steps
1. Imperative instructions the agent follows.

## Output
What the agent produces.

## Validation
How to verify the output is correct.
```

### New Reference Docs

Reference docs are managed by `@docs` via the registry (`.orch/registry.yaml`). To add a new source:

1. Add entry to the doc-pack template (`marketplace/doc-packs/<domain>.yaml`)
2. Run `@docs /docs-fetch` to convert to token-efficient markdown
3. Reference from skills via `orch://references/<domain>/<version>/<doc>.md`

### Audit Rules

Add adherence rules to `.orch/config/adherence-rules.yaml`. Each rule needs:
- `id` — unique kebab-case identifier
- `description` — what it checks
- `check` — grep/command to verify
- `severity` — critical / high / medium / low

---

## Development Setup

```bash
# Clone the repo
git clone <repo-url>
cd vscode-ghcp-agents

# Set up the CLI for local development
cd cli
npm install
npm link
cd ..

# Verify
orch --version
```

---

## PR Process

1. All contributions require review by the ORCH team
2. New agents and skills must integrate with the audit framework
3. Skills must declare reference dependencies in SKILL.md
4. Agent boundaries must be defined in boundaries.yaml
5. Include tests or validation steps for new skills

---

## Quality Bar

- Skills must be self-contained (no hidden dependencies)
- Reference docs must be under 500 lines (token budget)
- Agent boundaries must be explicitly declared
- All scripts must work on macOS, Linux, and Windows (Git Bash)
