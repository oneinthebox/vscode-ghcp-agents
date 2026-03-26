<!-- Example output from /local-diagnose — see SKILL.md for usage -->
# Local Environment Diagnosis Report

**Generated:** 2026-03-25T14:30:00Z
**Machine:** macOS 15.3 (darwin-arm64)
**Project:** Acme Trading Platform

---

## Environment Check Results

| Check              | Expected       | Found          | Status |
|--------------------|----------------|----------------|--------|
| Node.js            | >= 20.11       | 20.18.1        | PASS   |
| npm                | >= 10.2        | 10.9.2         | PASS   |
| Angular CLI        | 19.2.x         | 19.2.1         | PASS   |
| TypeScript         | >= 5.6, < 5.8  | 5.6.3          | PASS   |
| Git                | >= 2.30        | 2.47.1         | PASS   |
| Docker             | >= 24.0        | 27.4.0         | PASS   |
| Docker Compose     | >= 2.20        | 2.31.0         | PASS   |
| Playwright         | 1.49.x         | Not installed   | FAIL   |

---

## Tool Versions

```
node       v20.18.1   (/opt/homebrew/bin/node)
npm        v10.9.2    (/opt/homebrew/bin/npm)
ng         v19.2.1    (./node_modules/.bin/ng)
tsc        v5.6.3     (./node_modules/.bin/tsc)
nx         v20.3.0    (./node_modules/.bin/nx)
git        v2.47.1    (/usr/bin/git)
docker     v27.4.0    (/usr/local/bin/docker)
jest       v29.7.0    (./node_modules/.bin/jest)
eslint     v9.18.0    (./node_modules/.bin/eslint)
```

---

## Port Conflicts Detected

| Port  | Expected Use         | Current Process         | PID   | Action Taken          |
|-------|----------------------|-------------------------|-------|-----------------------|
| 4200  | Angular dev server   | (free)                  | —     | None needed           |
| 3100  | Mock API server      | node (stale mock:server)| 48291 | Killed (SIGTERM)      |
| 6006  | Storybook            | node (stale Storybook)  | 47105 | Killed (SIGTERM)      |
| 5432  | PostgreSQL (Docker)  | postgres                | 12044 | None — expected       |
| 6379  | Redis (Docker)       | redis-server            | 12067 | None — expected       |

---

## Issues Found and Fixes Applied

### 1. Playwright browsers not installed (FIXED)

Playwright was in `devDependencies` but browser binaries were missing. This causes `npm run e2e` to fail with `browserType.launch: Executable doesn't exist`.

```bash
# Fix applied:
npx playwright install chromium firefox
```

### 2. Stale mock server on port 3100 (FIXED)

A previous `npm run mock:server` process (PID 48291) was still running, which would cause EADDRINUSE when starting the dev environment.

```bash
# Fix applied:
kill 48291
```

### 3. Stale Storybook on port 6006 (FIXED)

A previous Storybook process (PID 47105) was orphaned. Cleaned up to free the port.

```bash
# Fix applied:
kill 47105
```

### 4. npm audit: 2 moderate vulnerabilities

```
# Not auto-fixed — review before applying:
npm audit
# 2 moderate severity vulnerabilities in transitive dependencies
# Run `npm audit fix` to resolve, or `npm audit fix --force` if peer dep conflicts
```

---

## Disk and Cache

| Item                     | Size    | Notes                              |
|--------------------------|---------|------------------------------------|
| `node_modules/`          | 842 MB  | Normal for Angular + AG Grid       |
| `.angular/cache/`        | 312 MB  | Build cache — safe to clear        |
| `.nx/cache/`             | 156 MB  | Nx computation cache               |
| `dist/`                  | 48 MB   | Previous build output              |

> Total project disk usage: 1.36 GB. Run `npm run clean` to reclaim ~516 MB from caches.

---

## Summary

| Status | Count | Details                                       |
|--------|-------|-----------------------------------------------|
| PASS   | 7     | Node, npm, CLI, TypeScript, Git, Docker, Compose |
| FAIL   | 1     | Playwright browsers (now fixed)               |
| FIXED  | 3     | Playwright install, stale port 3100, stale port 6006 |
| WARN   | 1     | npm audit vulnerabilities (manual review)     |

**Environment is ready for development.** Run `npm start` to begin.
