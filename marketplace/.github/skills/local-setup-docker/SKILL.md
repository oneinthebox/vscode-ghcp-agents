---
name: local-setup-docker
description: "Set up Docker, docker-compose, localstack, and container networks for local development. Verifies Docker installation, manages compose files, pulls images, configures localstack for AWS service emulation, and ensures all containers start healthy."
allowed-tools:
  - codebase
  - terminal
  - edit
references: []
---

## Context

Prepares the Docker environment for local development. Ensures Docker Desktop or Docker Engine is installed and running, sets up docker-compose services defined by the project, configures localstack for AWS service emulation if needed, and verifies that all containers reach a healthy state. All commands are platform-aware and adapt to macOS (Docker Desktop), Linux (Docker Engine/Docker Desktop), and Windows (Docker Desktop with WSL2 backend).

## Inputs

- **--compose-file {path}** — path to docker-compose file (default: auto-detect `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml`)
- Optional: `--profile {name}` — docker-compose profile to activate (e.g., `dev`, `test`, `full`)
- Optional: `--localstack` — explicitly enable localstack setup (auto-detected from compose file if omitted)
- Optional: `--pull` — force pull latest images before starting (default: pull only if not cached)
- Optional: `--clean` — remove existing containers and volumes before starting (fresh start)

## Steps

1. **Check Docker installation**
   a. Run `docker --version` to verify Docker CLI is installed.
   b. If not installed:
      - **macOS**: Recommend installing Docker Desktop via `brew install --cask docker` or direct download.
      - **Linux**: Install Docker Engine via the official repository for the detected distro.
      - **Windows**: Recommend Docker Desktop with WSL2 backend.
   c. Run `docker compose version` to verify the compose plugin is available. If not, install it.

2. **Start Docker daemon**
   a. Run `docker info` to check if the daemon is running.
   b. If not running:
      - **macOS**: Run `open -a Docker` to start Docker Desktop. Wait up to 60 seconds, polling `docker info` every 5 seconds.
      - **Linux**: Run `sudo systemctl start docker`. Verify with `docker info`.
      - **Windows**: Start Docker Desktop. Wait up to 60 seconds.
   c. If daemon fails to start, report the error and suggest remediation steps.

3. **Locate and validate compose file**
   a. Search for compose files in project root: `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml`.
   b. If `--compose-file` is provided, use that path.
   c. Validate the compose file syntax: `docker compose -f <file> config --quiet`.
   d. If no compose file found, report and ask the developer if one should be created.

4. **Pull required images**
   a. Parse the compose file to extract all image references.
   b. Run `docker compose -f <file> pull` to pull images.
   c. Report which images were pulled and their sizes.
   d. If a pull fails (auth required, image not found), report the specific failure.

5. **Configure localstack (if needed)**
   a. Check if the compose file defines a `localstack` service.
   b. If localstack is present or `--localstack` flag is set:
      - Verify the localstack image version is compatible with the project.
      - Check for `localstack-init` scripts in the project (typically in `init/` or `localstack/`).
      - Ensure required AWS services are listed in the `SERVICES` environment variable.
      - Verify the localstack port mapping (default: `4566`).
   c. If localstack init scripts exist, validate they are executable.

6. **Configure container networks**
   a. Check for custom networks defined in the compose file.
   b. If services need to communicate across multiple compose files, verify shared networks exist.
   c. Create any missing external networks: `docker network create <name>`.

7. **Start containers**
   a. If `--clean` flag: run `docker compose -f <file> down -v` to remove existing containers and volumes.
   b. Run `docker compose -f <file> up -d` (with `--profile` if specified).
   c. Wait for containers to reach healthy state (up to 120 seconds).
   d. Poll container health: `docker compose -f <file> ps`.

8. **Verify containers**
   a. Check that all services are running: `docker compose -f <file> ps --format json`.
   b. For services with health checks, verify they report `healthy`.
   c. For localstack, verify the health endpoint: `curl -s http://localhost:4566/_localstack/health`.
   d. Report any containers that failed to start, with their logs (`docker compose logs <service> --tail 50`).

## Output

```markdown
## Docker Setup Report

### Docker Engine
| Field | Value |
|-------|-------|
| Docker version | {version} |
| Compose version | {version} |
| Daemon status | running |
| Platform | {macOS/Linux/Windows} |

### Compose File
| Field | Value |
|-------|-------|
| File | {path} |
| Profile | {profile or "default"} |
| Services | {count} |

### Images
| Image | Tag | Status | Size |
|-------|-----|--------|------|
| {image} | {tag} | pulled/cached/FAILED | {size} |

### Containers
| Service | Status | Health | Ports |
|---------|--------|--------|-------|
| {name} | running/failed | healthy/unhealthy/N/A | {port mappings} |

### Localstack (if applicable)
| Field | Value |
|-------|-------|
| Status | {running/not configured} |
| Services | {list of AWS services} |
| Health | {healthy/unhealthy} |
| Endpoint | http://localhost:4566 |

### Actions Taken
- [list of actions performed]

### Issues Found
- [list of issues, if any, with remediation suggestions]
```

## Validation

- Docker daemon is running and responsive (`docker info` succeeds)
- All services defined in the compose file are in `running` state
- Services with health checks report `healthy`
- Localstack health endpoint returns success (if localstack is configured)
- No port conflicts — all mapped ports are available
- Container logs show no critical errors on startup
- No application source files were modified
