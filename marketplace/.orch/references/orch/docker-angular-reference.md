# Docker Angular Reference
Source: ORCH internal
Last refreshed: 2026-03-24

Docker best practices for Angular and Nx-based applications. Read by `/local-setup-docker` and `/local-create-workspace`.

## Multi-Stage Dockerfile

```dockerfile
# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# ── Stage 2: Build ──
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_NAME=app
ARG CONFIGURATION=production
RUN npx ng build ${APP_NAME} --configuration=${CONFIGURATION}

# ── Stage 3: Serve ──
FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist/${APP_NAME}/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf for Angular SPA

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

## docker-compose.yml for Local Dev

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps          # Stop at deps stage for dev
    volumes:
      - .:/app
      - node_modules:/app/node_modules  # Named volume prevents overwrite
    ports:
      - "4200:4200"
    command: npx ng serve --host 0.0.0.0 --poll 2000
    environment:
      - NODE_ENV=development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  localstack:
    image: localstack/localstack:3
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3,sqs,sns,dynamodb,secretsmanager
      DEFAULT_REGION: us-east-1
    volumes:
      - "./localstack-init:/etc/localstack/init/ready.d"
      - localstack_data:/var/lib/localstack
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  node_modules:
  pgdata:
  localstack_data:
```

## .dockerignore for Angular / Nx

```
node_modules
dist
.angular
.nx
tmp
coverage
.git
.github
.orch/audit
.orch/runs
*.log
*.tgz
.env.local
.env.*.local
```

## Docker with Nx

### Building Specific Apps

```bash
# Build a single app from Nx monorepo
docker build --build-arg APP_NAME=trading-app -t trading-app .

# Use Nx affected to build only changed apps
npx nx affected --target=build --base=main --head=HEAD
```

### Caching node_modules

| Strategy | Pros | Cons |
|----------|------|------|
| Named volume (`node_modules:/app/node_modules`) | Fast, persists across rebuilds | Can drift from host |
| Copy in Dockerfile (`COPY package*.json && npm ci`) | Reproducible, layer-cached | Slower on package changes |
| Bind mount with exclusion | Host and container share deps | Platform-specific binaries may conflict |

Recommended: Named volume for dev, copy in Dockerfile for CI/prod.

### Nx-Specific Dockerfile

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json nx.json ./
COPY apps/${APP_NAME}/project.json ./apps/${APP_NAME}/
RUN npm ci --prefer-offline

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_NAME
RUN npx nx build ${APP_NAME} --configuration=production
```

## Environment Variable Injection at Runtime

Angular builds are static -- environment variables must be injected at container start, not at build time.

### The env.js Pattern

**1. Create `src/env.js` template:**

```javascript
// This file is overwritten at container startup
window.__env = {
  API_URL: '${API_URL}',
  AUTH_URL: '${AUTH_URL}',
  WS_URL: '${WS_URL}',
  FEATURE_FLAGS: '${FEATURE_FLAGS}'
};
```

**2. Add to `index.html`:**

```html
<script src="env.js"></script>
```

**3. Docker entrypoint script (`docker-entrypoint.sh`):**

```bash
#!/bin/sh
envsubst < /usr/share/nginx/html/env.js.template > /usr/share/nginx/html/env.js
exec nginx -g "daemon off;"
```

**4. Angular service to read config:**

```typescript
export function getEnv(key: string): string {
  return (window as any).__env?.[key] ?? '';
}
```

**5. Dockerfile addition:**

```dockerfile
COPY env.js.template /usr/share/nginx/html/env.js.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
```

## Health Check Configuration

| Parameter | Production | Development | Description |
|-----------|-----------|-------------|-------------|
| `interval` | 30s | 10s | Time between checks |
| `timeout` | 3s | 5s | Max time for check to respond |
| `start-period` | 10s | 30s | Grace period before first check |
| `retries` | 3 | 5 | Failures before unhealthy |

### Health Check Commands by Service

| Service | Check Command | What It Validates |
|---------|--------------|-------------------|
| nginx (Angular) | `wget -qO- http://localhost/health` | nginx serving, app deployed |
| postgres | `pg_isready -U {user}` | Database accepting connections |
| redis | `redis-cli ping` | Redis responding |
| localstack | `curl -f http://localhost:4566/_localstack/health` | All AWS services ready |
| Node dev server | `wget -qO- http://localhost:4200` | Dev server running |

## Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| node_modules volume stale | New packages not found after `npm install` on host | Remove named volume: `docker compose down -v` then `docker compose up` |
| File watching not working | Changes on host not triggering rebuild | Add `--poll 2000` to `ng serve`; or use `CHOKIDAR_USEPOLLING=true` env var |
| Hot reload broken in Docker | Page does not refresh on file save | Ensure port 4200 is mapped AND `--host 0.0.0.0` is set on ng serve |
| Platform-specific binaries | `sharp`, `esbuild`, or `node-sass` crash | Use multi-stage build; install deps inside Docker, not on host |
| Permission errors on Linux | `EACCES` when writing to mounted volume | Run container as same UID: `user: "${UID}:${GID}"` in compose |
| Large image size | Image is 1GB+ | Use `-alpine` base images; use multi-stage to exclude `node_modules` from final stage |
| Slow builds | Docker build takes 5+ minutes | Order COPY to maximize layer caching: `package*.json` first, then source |
| Port conflict | `EADDRINUSE` on 4200 or 5432 | Change host port in compose: `"4201:4200"` |
| localstack services not ready | App starts before localstack is healthy | Use `depends_on` with `condition: service_healthy` |
