---
name: local-create-workspace
description: "Scaffold a new development workspace — Nx Angular monorepo, standalone Angular CLI app, or empty project. Configures tooling: TypeScript strict, Jest, ESLint, Prettier, Docker, CI template. Runs orch init automatically after scaffolding."
references:
  - references/orch/docker-angular-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Creates a new project from scratch. Supports two Angular workspace types and an empty scaffold. After creating the workspace, automatically runs `orch init` to install ORCH agents, skills, and audit hooks.

This is a @local skill — it creates the workspace structure. Domain-specific configuration (components, services, HDS, elevate) is handled by @angular skills after the workspace exists.

## Inputs

- `@local /local-create-workspace nx-angular my-trade-app` — Nx Angular monorepo (recommended)
- `@local /local-create-workspace angular my-trade-app` — standalone Angular CLI app
- `@local /local-create-workspace empty my-project` — empty project (no framework)
- Options:
  - `--style scss` (default: scss)
  - `--prefix app` (default: app)
  - `--package-manager npm` (default: npm, also: yarn, pnpm)
  - `--docker` — add Dockerfile + docker-compose.yml
  - `--ci github-actions` — add CI pipeline template

## Steps

### For Nx Angular monorepo (recommended)

1. **Pre-check:** Verify Node.js 18+ installed (`node --version`). Verify target directory is empty.
2. **Create workspace:**
   ```bash
   npx create-nx-workspace@latest {name} \
     --preset=angular-monorepo \
     --appName={name} \
     --style={style} \
     --prefix={prefix} \
     --nxCloud=skip \
     --packageManager={package-manager} \
     --interactive=false
   ```
3. **Configure TypeScript strict mode:**
   - Verify `tsconfig.base.json` has `strict: true`, `noUncheckedIndexedAccess: true`
   - If not, add them
4. **Configure testing:**
   - Verify Jest is configured (Nx Angular preset includes it by default)
   - Add `jest.preset.js` if missing
5. **Configure linting:**
   - Verify ESLint is configured with `@angular-eslint`
   - Add `.eslintrc.json` boundary rules for Nx module boundaries
6. **Add shared libraries** (Nx monorepo only):
   ```bash
   npx nx generate @nx/angular:library shared-models --directory=libs/shared-models --standalone --prefix=shared
   npx nx generate @nx/angular:library shared-ui --directory=libs/shared-ui --standalone --prefix=shared
   npx nx generate @nx/angular:library data-access --directory=libs/data-access --standalone --prefix=data
   ```
7. **Configure module boundaries** (Nx monorepo only):
   - Set up `depConstraints` in `.eslintrc.json`:
     - `scope:app` can depend on `scope:shared`
     - `scope:shared` can depend on `scope:shared`
     - Apps cannot depend on each other
8. **Add Docker** (if `--docker` flag):
   - Create `Dockerfile` with multi-stage build (install → build → nginx)
   - Create `docker-compose.yml` with app + optional database + redis
   - Create `.dockerignore`
9. **Add CI template** (if `--ci github-actions` flag):
   - Create `.github/workflows/ci.yml` with: install → lint → test → build
   - Use Nx affected commands for efficient CI
10. **Run `orch init`:**
    ```bash
    npx @orch/cli init
    ```
    This installs ORCH agents, skills, hooks, config, and workflows.
11. **Run `orch doctor`** to verify everything is set up correctly.
12. **Run initial build + test** to verify workspace compiles:
    ```bash
    npx nx build {name}
    npx nx test {name}
    ```

### For standalone Angular CLI app

1. **Pre-check:** Same as above.
2. **Create app:**
   ```bash
   npx @angular/cli@latest new {name} \
     --style={style} \
     --prefix={prefix} \
     --routing=true \
     --standalone=true \
     --strict=true \
     --skip-git=false \
     --package-manager={package-manager}
   ```
3. **Configure testing:** Add Jest (Angular CLI defaults to Karma):
   ```bash
   npx ng add @angular-builders/jest
   ```
   Update `angular.json` to use jest builder.
4. **Steps 7-12** same as Nx monorepo (Docker, CI, orch init, verify).

### For empty project

1. Create directory, `npm init -y`, `git init`.
2. Run `orch init` — it will detect no framework and install only shared agents (@docs, @audit, @local).

## Output

```markdown
## Workspace Created — {name}

| Aspect | Value |
|--------|-------|
| Type | {nx-angular / angular / empty} |
| Directory | {path} |
| Angular version | {detected} |
| TypeScript | {version} (strict mode) |
| Test framework | Jest |
| Linter | ESLint + @angular-eslint |
| Package manager | {npm/yarn/pnpm} |
| Docker | {yes/no} |
| CI | {github-actions/none} |
| ORCH | Initialized (orch init complete) |

### What was created
- {n} files
- Shared libraries: {list if Nx}
- Module boundaries: configured (if Nx)

### Architecture Decision
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workspace type | {nx-angular/angular} | {Nx for monorepo, Angular CLI for simple apps} |
| Standalone | Yes (default) | Angular 19+ default. No NgModule overhead. |
| Strict mode | Enabled | Catches errors early. Org standard. |
| Test framework | Jest | Faster than Karma. Better DX. Org standard. |

### Next steps
1. `cd {name}`
2. `@angular recap this project` — understand what was created
3. `@angular /angular-generate-component` — create your first component
4. `@local /local-mock-generate "your data description"` — set up mock API
```

## Validation

- Workspace compiles: `nx build` / `ng build` passes
- Tests pass: `nx test` / `ng test` passes
- Lint passes: `nx lint` / `ng lint` passes
- TypeScript strict mode is enabled
- ORCH is initialized (`orch doctor` passes)
- Git repository is initialized with initial commit
- If Nx: shared libraries exist and module boundaries are configured
- If Docker: `docker-compose up` starts without errors
