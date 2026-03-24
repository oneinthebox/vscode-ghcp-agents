---
name: local-setup-deps
description: "Install and verify project dependencies across all detected package managers (npm, yarn, pnpm, maven, gradle, pip, poetry). Validates lockfile consistency, checks for version mismatches, and scans for known vulnerability advisories."
allowed-tools:
  - codebase
  - terminal
  - edit
references: []
---

## Context

Ensures all project dependencies are correctly installed and consistent with their lockfiles. Detects the package manager(s) in use by examining project configuration files, runs the appropriate install commands, verifies that installed versions match lockfile expectations, and checks for known security vulnerabilities. Supports polyglot projects with multiple package managers active simultaneously.

## Inputs

- **--manager {npm|yarn|pnpm|maven|gradle|pip|poetry|all}** — which package manager to target (default: `all` detected from project files)
- Optional: `--frozen` — enforce frozen lockfile mode (fail if lockfile would change)
- Optional: `--audit` — run vulnerability audit after install (default: true)
- Optional: `--clean` — remove existing dependency directories before installing (e.g., `node_modules/`, `.venv/`, `target/`)

## Steps

1. **Detect package managers in use**
   a. Scan project root for marker files:
      - `package-lock.json` -> npm
      - `yarn.lock` -> yarn
      - `pnpm-lock.yaml` -> pnpm
      - `pom.xml` -> maven
      - `build.gradle` or `build.gradle.kts` -> gradle
      - `requirements.txt` or `setup.py` -> pip
      - `poetry.lock` or `pyproject.toml` (with `[tool.poetry]`) -> poetry
   b. If multiple managers detected, process each in order: Node.js managers first, then JVM, then Python.
   c. If `--manager` is specified, only process that manager.

2. **Verify package manager is installed**
   a. For each detected manager, check it is available on PATH:
      - `npm --version`, `yarn --version`, `pnpm --version`
      - `mvn --version`, `gradle --version`
      - `pip --version`, `poetry --version`
   b. If a manager is missing, attempt to install it:
      - npm: bundled with Node.js (suggest running `/local-setup-env` first)
      - yarn: `corepack enable && corepack prepare yarn@stable --activate`
      - pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
      - maven: `brew install maven` (macOS) / `sdk install maven` / distro package
      - gradle: `sdk install gradle` or Gradle wrapper (`./gradlew`)
      - pip: bundled with Python (suggest running `/local-setup-env` first)
      - poetry: `pip install poetry` or `pipx install poetry`

3. **Clean existing dependencies (if --clean)**
   a. **Node.js**: Remove `node_modules/` directory.
   b. **Java/Maven**: Remove `target/` directory.
   c. **Java/Gradle**: Run `./gradlew clean` or remove `build/` directory.
   d. **Python/pip**: Remove `.venv/` or deactivate virtualenv.
   e. **Python/poetry**: Run `poetry env remove --all`.

4. **Install dependencies**
   a. **npm**: `npm ci` (if lockfile exists and `--frozen`) or `npm install`.
   b. **yarn**: `yarn install --frozen-lockfile` (if `--frozen`) or `yarn install`.
   c. **pnpm**: `pnpm install --frozen-lockfile` (if `--frozen`) or `pnpm install`.
   d. **maven**: `mvn dependency:resolve` or `mvn install -DskipTests`.
   e. **gradle**: `./gradlew dependencies` or `./gradlew build -x test`.
   f. **pip**: Create virtualenv if not active, then `pip install -r requirements.txt`.
   g. **poetry**: `poetry install`.

5. **Verify installed versions match lockfile**
   a. **npm**: Run `npm ls --depth=0` and check for `WARN` or `ERR` entries.
   b. **yarn**: Run `yarn check --verify-tree` (yarn 1) or `yarn install --check-cache` (yarn 3+).
   c. **pnpm**: Run `pnpm ls --depth=0` and check for issues.
   d. **maven**: Run `mvn dependency:tree` and compare against expected versions.
   e. **gradle**: Run `./gradlew dependencies` and check for version conflicts.
   f. **pip**: Run `pip check` to verify compatibility.
   g. **poetry**: Run `poetry check` to verify lockfile consistency.

6. **Scan for vulnerability advisories (if --audit is true)**
   a. **npm**: `npm audit --production` (or `npm audit` for all).
   b. **yarn**: `yarn audit` (yarn 1) or `yarn npm audit` (yarn 3+).
   c. **pnpm**: `pnpm audit`.
   d. **maven**: Check for `org.owasp:dependency-check-maven` plugin, run if available.
   e. **pip**: `pip-audit` (install if not available: `pip install pip-audit`).
   f. **poetry**: `poetry audit` or `pip-audit` on the virtualenv.
   g. Classify vulnerabilities: critical, high, moderate, low.

## Output

```markdown
## Dependency Installation Report

### Detected Package Managers
| Manager | Version | Lockfile | Status |
|---------|---------|----------|--------|
| {name} | {version} | {lockfile path} | OK/INSTALLED/MISSING |

### Installation Results
| Manager | Dependencies | Time | Status |
|---------|-------------|------|--------|
| {name} | {count} packages | {duration} | OK/FAILED |

### Version Verification
| Manager | Check | Status | Issues |
|---------|-------|--------|--------|
| {name} | lockfile consistency | PASS/WARN/FAIL | {details} |

### Vulnerability Audit
| Manager | Critical | High | Moderate | Low | Status |
|---------|----------|------|----------|-----|--------|
| {name} | {n} | {n} | {n} | {n} | CLEAN/WARNINGS/CRITICAL |

### Critical Vulnerabilities (if any)
| Package | Severity | Advisory | Fix Available |
|---------|----------|----------|--------------|
| {name} | {level} | {CVE or advisory URL} | {yes/no, fix version} |

### Actions Taken
- [list of actions performed]

### Manual Steps Required
- [list of things the developer must do manually, if any]
```

## Validation

- All detected package managers are installed and functional
- Dependency install command completed with exit code 0 for each manager
- `npm ls` / `yarn check` / `pnpm ls` / `pip check` / `poetry check` reports no errors
- Lockfile was not modified (in `--frozen` mode)
- No critical vulnerabilities remain unacknowledged
- No application source files were modified
