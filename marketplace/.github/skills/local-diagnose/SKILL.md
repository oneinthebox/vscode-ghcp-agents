---
name: local-diagnose
description: "Diagnose local environment issues: port conflicts, version mismatches, missing tools, permission problems, disk space, and connectivity. Produces a structured diagnostic report with severity levels and remediation steps."
allowed-tools:
  - codebase
  - terminal
references: []
---

## Context

Runs a comprehensive diagnostic sweep of the developer's local environment to identify issues that may prevent successful development, building, or running of the project. Checks ports, tool versions, disk space, file permissions, Docker health, and connectivity. Produces a consolidated report with severity-ranked findings and actionable remediation steps for each issue.

## Inputs

- **--scope {full|quick|ports|versions|docker|permissions}** — diagnostic scope (default: `full`)
- Optional: `--fix` — attempt automatic remediation for fixable issues (default: false, report-only)
- Optional: `--port-range {start-end}** — custom port range to check (default: derived from project config)

## Steps

1. **Check ports in use**
   a. Parse project configuration files for required ports:
      - `package.json` scripts (look for `--port` flags, `PORT=` env vars)
      - `docker-compose.yml` port mappings
      - `angular.json` / `vite.config.*` / `webpack.config.*` for dev server ports
      - `.env` or `.env.example` for `PORT`, `API_PORT`, etc.
   b. Check each required port:
      - **macOS/Linux**: `lsof -i :<port>` or `ss -tlnp` to identify the process using the port.
      - **Windows**: `netstat -ano | findstr :<port>`.
   c. For each occupied port, identify the process (name, PID).
   d. If `--fix`: offer to kill the blocking process (with confirmation) or suggest an alternative port.

2. **Verify tool versions match project requirements**
   a. Read version requirements from:
      - `.nvmrc`, `.node-version`, `.tool-versions` for Node.js
      - `.java-version`, `.sdkmanrc` for Java
      - `.python-version` for Python
      - `engines` field in `package.json`
      - `pom.xml` / `build.gradle` for Java/build tool versions
   b. Compare installed versions against requirements:
      - `node --version`, `npm --version`
      - `java --version`, `mvn --version`, `gradle --version`
      - `python --version`, `pip --version`
      - `docker --version`, `docker compose version`
      - `git --version`
   c. Flag mismatches with severity:
      - **Major version mismatch**: CRITICAL
      - **Minor version mismatch**: WARNING
      - **Patch version mismatch**: INFO
   d. If `--fix`: suggest commands to switch versions (e.g., `nvm use`, `sdk use`, `pyenv local`).

3. **Check disk space**
   a. Run `df -h .` to check available space on the project volume.
   b. Check `node_modules/` size if present: `du -sh node_modules/`.
   c. Check Docker disk usage: `docker system df`.
   d. Flag issues:
      - Available space below 5 GB: WARNING
      - Available space below 1 GB: CRITICAL
      - Docker using more than 50 GB: WARNING (suggest `docker system prune`)

4. **Check file permissions**
   a. Verify project directory is writable: test write access to project root.
   b. Check script executability:
      - `node_modules/.bin/*` should be executable.
      - Shell scripts in the project (`.sh` files) should be executable.
      - Git hooks in `.git/hooks/` or `.husky/` should be executable.
   c. Check Docker socket permissions (`/var/run/docker.sock` on Linux).
   d. If `--fix`: run `chmod +x` on scripts that need it, fix Docker group membership suggestion.

5. **Check Docker health (if Docker is used)**
   a. Verify Docker daemon is running: `docker info`.
   b. Check running containers: `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`.
   c. Check for unhealthy containers: `docker ps --filter health=unhealthy`.
   d. Check Docker resource allocation (memory, CPU limits in Docker Desktop).
   e. Check for dangling images and volumes: `docker images -f dangling=true`, `docker volume ls -f dangling=true`.

6. **Check network connectivity**
   a. Verify npm registry access: `npm ping` or `curl -s https://registry.npmjs.org/`.
   b. Verify git remote access: `git ls-remote --exit-code origin HEAD`.
   c. If Docker is used, verify container-to-host connectivity.
   d. Check proxy settings if `HTTP_PROXY` or `HTTPS_PROXY` is set.

7. **Produce diagnostic report**
   a. Aggregate all findings.
   b. Sort by severity: CRITICAL > WARNING > INFO.
   c. Include remediation steps for each finding.
   d. If `--fix` was used, note which issues were auto-remediated.

## Output

```markdown
## Environment Diagnostic Report

### Summary
| Field | Value |
|-------|-------|
| Platform | {macOS/Linux/Windows} |
| Scope | {full/quick/ports/versions/docker/permissions} |
| Timestamp | {ISO 8601} |
| Findings | {X critical, Y warnings, Z info} |
| Status | HEALTHY / ISSUES FOUND / CRITICAL ISSUES |

### Port Availability
| Port | Required By | Status | Process (if blocked) |
|------|------------|--------|---------------------|
| {port} | {service} | FREE/BLOCKED | {process name, PID} |

### Tool Versions
| Tool | Required | Installed | Status |
|------|----------|-----------|--------|
| {name} | {version} | {version} | OK/MISMATCH/MISSING |

### Disk Space
| Volume | Available | Total | Status |
|--------|-----------|-------|--------|
| {mount} | {free} | {total} | OK/WARNING/CRITICAL |

### Docker Health
| Check | Status | Details |
|-------|--------|---------|
| Daemon | running/stopped | {version} |
| Containers | {n running}/{n total} | {unhealthy list if any} |
| Disk usage | {size} | {prune suggested if large} |

### Permissions
| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| {path} | {expected perm} | {actual perm} | OK/FAILED |

### Connectivity
| Target | Status | Latency |
|--------|--------|---------|
| npm registry | OK/FAILED | {ms} |
| git remote | OK/FAILED | {ms} |

### Remediation Steps
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | {CRITICAL/WARNING/INFO} | {description} | {command or instructions} |

### Auto-Remediated (if --fix was used)
- [list of issues that were automatically fixed]
```

## Validation

- All diagnostic checks completed without the diagnostic tool itself failing
- Every finding has a severity level and a remediation step
- Port check covers all ports referenced in project configuration
- Version check covers all runtimes referenced in project version files
- Report is structured and machine-parseable
- No application source files were modified
- No destructive actions were taken (unless `--fix` was explicitly passed)
