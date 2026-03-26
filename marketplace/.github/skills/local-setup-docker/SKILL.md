---
name: local-setup-docker
description: "Set up Docker, docker-compose, localstack, and container networks for local development. Verifies Docker installation, manages compose files, pulls images, configures localstack for AWS service emulation, and ensures all containers start healthy."
allowed-tools:
  - codebase
  - terminal
  - edit
references:
  - references/orch/docker-angular-reference.md
---

## Context

Prepares the Docker container runtime for local development using Colima as the recommended runtime on macOS instead of Docker Desktop. Provides platform-specific installation instructions for macOS, Windows (WSL2), and Linux. Includes a standard docker-compose configuration for common local services.

---

## macOS (Colima via Homebrew)

Colima provides a lightweight Docker-compatible runtime on macOS without requiring Docker Desktop.

### Installation

```bash
brew install colima docker docker-compose
```

### Start Colima

```bash
colima start --cpu 4 --memory 8 --disk 60
```

This allocates 4 CPU cores, 8 GB RAM, and 60 GB disk to the Colima VM.

### Verify

```bash
docker info              # Should show Colima as the runtime context
docker compose version   # Verify compose plugin is available
```

### Stop / Restart

```bash
colima stop              # Gracefully stop the VM
colima start             # Restart with previous settings
colima delete            # Remove the VM entirely (data lost)
```

---

## Windows (Colima via WSL2)

On Windows, Docker runs inside WSL2. Colima can be installed within the WSL2 Linux environment.

### Installation

```bash
# In WSL2 Ubuntu terminal
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin

# OR install Docker CLI on Windows host via winget
winget install Docker.DockerCLI
```

### Colima on WSL2

```bash
curl -LO https://github.com/abiosoft/colima/releases/latest/download/colima-Linux-x86_64
sudo install colima-Linux-x86_64 /usr/local/bin/colima
colima start
```

### Verify

```bash
docker info
docker compose version
```

---

## Linux

On Linux, Docker Engine can be installed directly without Colima.

### Installation (Debian/Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

After adding your user to the `docker` group, log out and back in for the change to take effect.

### Verify

```bash
docker info
docker compose version
```

---

## Docker Compose for Local Services

A standard `docker-compose.yml` should define the local services needed for development. Common services include:

### PostgreSQL

- Image: `postgres:16-alpine`
- Health check: `pg_isready -U postgres`
- Volume: persistent data mount for database files
- Port: `5432`

### Redis

- Image: `redis:7-alpine`
- Health check: `redis-cli ping`
- Port: `6379`

### Localstack (AWS Emulation)

- Image: `localstack/localstack:latest`
- Services: S3, SQS, SNS, DynamoDB, Lambda, Secrets Manager
- Health check: `curl -f http://localhost:4566/_localstack/health`
- Port: `4566`

### Mock API Server

- Any lightweight mock server (e.g., WireMock, json-server)
- Port: configurable via environment variable

### Configuration Best Practices

- Use **health checks** on all services so `docker compose up --wait` works correctly
- Use **named volumes** for database persistence across restarts
- Use **custom networks** to isolate service groups
- Use **`.env` file** for ports, passwords, and image tags to avoid hardcoding
- Use **profiles** to group optional services (e.g., `--profile monitoring`)

---

## Workflow

1. **Detect OS** — determine macOS, Linux, or Windows/WSL2
2. **Install runtime** — Colima + Docker CLI (macOS), Docker Engine (Linux), Docker in WSL2 (Windows)
3. **Start runtime** — `colima start` (macOS/WSL2) or `systemctl start docker` (Linux)
4. **Verify** — `docker info` confirms the daemon is reachable
5. **Start services** — `docker compose up -d` with the project compose file
6. **Health check** — poll until all containers report healthy

## Output

```json
{
  "os": "darwin",
  "dockerVersion": "24.0.7",
  "colimaVersion": "0.6.8",
  "composeVersion": "2.24.5",
  "status": "running",
  "services": [
    { "name": "postgres", "status": "healthy", "port": 5432 },
    { "name": "redis", "status": "healthy", "port": 6379 },
    { "name": "localstack", "status": "healthy", "port": 4566 }
  ]
}
```

## Validation

- Docker daemon is running and responsive (`docker info` succeeds)
- Colima VM is running with expected resource allocation (macOS)
- `docker compose version` returns a valid version
- All services defined in the compose file reach `running` state
- Services with health checks report `healthy`
- No port conflicts on mapped ports
- Container logs show no critical errors on startup
- No application source files were modified
