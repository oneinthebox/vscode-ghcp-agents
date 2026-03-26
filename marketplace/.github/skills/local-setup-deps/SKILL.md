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

Manages dependency installation and verification across polyglot projects. Supports three primary ecosystems — Node.js, Java, and Python — each with their own configuration files, lock files, install commands, and corporate Artifactory integration patterns.

---

## Node.js

### Configuration

- **`.npmrc`** — controls registry URL, auth token, scope mapping, and cache settings
- Location: project root (per-project) or `~/.npmrc` (global)
- Key fields: `registry`, `//registry.npmjs.org/:_authToken`, `@scope:registry`

### Discovery

- `package.json` contains `dependencies` and `devDependencies`

### Lock Files

| Package Manager | Lock File |
|----------------|-----------|
| npm | `package-lock.json` |
| yarn | `yarn.lock` |
| pnpm | `pnpm-lock.yaml` |

### Install Commands

- **CI (clean install):** `npm ci` — installs exactly from lock file, removes existing `node_modules`
- **Development:** `npm install` — resolves and installs, may update lock file
- **yarn:** `yarn install --frozen-lockfile` (CI) or `yarn install` (dev)
- **pnpm:** `pnpm install --frozen-lockfile` (CI) or `pnpm install` (dev)

### Artifactory Integration

Set the registry in `.npmrc` to point to your organization's Artifactory instance:

```
registry=https://artifactory.yourorg.com/api/npm/npm-virtual/
//artifactory.yourorg.com/api/npm/npm-virtual/:_authToken=${NPM_TOKEN}
```

### Verification

```bash
npm ls --all          # Check for peer dependency conflicts and missing packages
npm audit             # Scan for known vulnerabilities
```

---

## Java

### Configuration

- **`~/.m2/settings.xml`** — Maven repositories, mirrors, server authentication, profiles
- **`gradle.properties`** — Gradle project-level or user-level (`~/.gradle/gradle.properties`) properties

### Discovery

| Build Tool | Config File |
|-----------|-------------|
| Maven | `pom.xml` |
| Gradle | `build.gradle` or `build.gradle.kts` |

### Install Commands

- **Maven:** `mvn dependency:resolve` — downloads all dependencies without building
- **Maven (full):** `mvn install -DskipTests` — install with all transitive deps
- **Gradle:** `gradle dependencies` or `./gradlew dependencies`

### Artifactory Integration

Add a `<mirror>` element in `~/.m2/settings.xml`:

```xml
<mirror>
  <id>artifactory</id>
  <mirrorOf>*</mirrorOf>
  <url>https://artifactory.yourorg.com/artifactory/maven-virtual</url>
</mirror>
```

### Verification

```bash
mvn dependency:tree            # Full dependency tree with conflict resolution
gradle dependencies --scan     # Dependency report with build scan
```

---

## Python

### Configuration

- **`pyproject.toml`** — used by uv, poetry, and modern pip for project metadata and dependencies
- **`pip.conf`** or **`~/.pip/pip.conf`** — pip configuration for index URL and trusted hosts
- **`~/.config/uv/uv.toml`** — uv-specific configuration

### Discovery

| Tool | Config File |
|------|-------------|
| pip | `requirements.txt` |
| poetry | `pyproject.toml` (with `[tool.poetry]`) |
| uv | `pyproject.toml` (with `[project]`) |
| setuptools | `setup.py` |
| pipenv | `Pipfile` |

### Install Commands

- **uv:** `uv sync` — installs from `uv.lock`, creating virtualenv automatically
- **poetry:** `poetry install` — installs from `poetry.lock`
- **pip:** `pip install -r requirements.txt` — installs from requirements file

### Artifactory Integration

Set the index URL in pip or uv configuration:

```
--index-url https://artifactory.yourorg.com/api/pypi/pypi-virtual/simple
--trusted-host artifactory.yourorg.com
```

For `pyproject.toml` (poetry):

```toml
[[tool.poetry.source]]
name = "artifactory"
url = "https://artifactory.yourorg.com/api/pypi/pypi-virtual/simple"
priority = "primary"
```

### Verification

```bash
pip check              # Verify installed packages have compatible dependencies
uv pip check           # Same check via uv
poetry check           # Validate pyproject.toml and lock file consistency
```

---

## Multi-Ecosystem Workflow

1. **Detect** — scan project root for `package.json`, `pom.xml`, `build.gradle`, `pyproject.toml`, `requirements.txt`
2. **Check config** — verify `.npmrc`, `settings.xml`, or `pyproject.toml` exists with correct registry settings
3. **Check lock file** — confirm lock file is present and committed to version control
4. **Install** — run the appropriate install command for each ecosystem
5. **Verify** — run verification commands to confirm no conflicts or missing dependencies

## Output

```json
{
  "ecosystems": [
    {
      "type": "node",
      "configFound": true,
      "lockFileFound": true,
      "installResult": "success",
      "verifyResult": "no issues"
    },
    {
      "type": "java",
      "configFound": true,
      "lockFileFound": false,
      "installResult": "success",
      "verifyResult": "2 version conflicts"
    },
    {
      "type": "python",
      "configFound": true,
      "lockFileFound": true,
      "installResult": "success",
      "verifyResult": "no issues"
    }
  ]
}
```

## Validation

- All detected ecosystems have their config files in place
- Lock files exist and are consistent with dependency declarations
- Install commands complete with exit code 0
- Verification commands report no critical conflicts or missing packages
- Artifactory URLs resolve correctly (if configured)
- No application source files were modified
