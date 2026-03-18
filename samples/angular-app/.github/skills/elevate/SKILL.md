---
name: elevate
description: "Work with @yourorg/elevate platform services (auth, logging, config, preferences) and @yourorg/elevate-common shared components. Ensures apps use the standard platform modules instead of custom implementations. Use when setting up auth, adding logging, configuring apps, managing preferences, or using shared UI components."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

Elevate is the organization's platform service layer:
- **@yourorg/elevate** — Auth, Logging, Config, Preferences services
- **@yourorg/elevate-common** — Shared UI components (buttons, forms, tables, modals)

## Capabilities

| Action | When to use |
|--------|------------|
| **Auth setup** | Adding authentication, guards, login flow |
| **Logging setup** | Adding structured logging |
| **Config setup** | Adding configuration management |
| **Preferences** | Adding user preference storage |
| **Components** | Using elevate-common UI components |
| **Audit** | Find custom implementations that should use Elevate |

## Steps

1. Check for overrides: `.github/skill-overrides/elevate/overrides.yaml`
2. Load references:
   - Auth: [references/auth.md](references/auth.md)
   - Logging: [references/logging.md](references/logging.md)
   - Config: [references/config.md](references/config.md)
   - Preferences: [references/preferences.md](references/preferences.md)
   - Components: [references/components.md](references/components.md)
3. Study examples: [examples/](examples/)
4. Determine action from user prompt.
5. Apply Elevate patterns.
6. Verify: no custom auth, no console.log, no hardcoded config, no localStorage.

## Key rules

- **Auth** — always `@yourorg/elevate` AuthService. Never custom auth, never direct token handling.
- **Logging** — always LoggingService. Never `console.log/warn/error` in production.
- **Config** — always ConfigService. Never `environment.ts`, never hardcoded URLs.
- **Preferences** — always PreferencesService. Never `localStorage`/`sessionStorage` directly.
- **Components** — always `@yourorg/elevate-common` for buttons, forms, inputs, tables. Never raw HTML or Material.
- **Imports** — always from public API (`@yourorg/elevate`). Never deep imports into `src/lib/`.

## Validation

- No `console.log` in generated code
- No hardcoded URLs
- No `localStorage`/`sessionStorage` direct access
- No raw HTML buttons/inputs (use elevate-common)
- All imports from public API
