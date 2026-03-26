---
name: local-mock-server
description: "Start a mock API server from generated data — full CRUD REST + WebSocket replay + CORS + relationship enforcement (cascade deletes, auto foreign keys). Supports both standalone script generation and immediate start."
references:
  - references/orch/mock-server-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Runs a local mock server that behaves like a real API — full CRUD operations, relationship enforcement, filtering, pagination, CORS, latency simulation, and WebSocket streaming. Can either generate a standalone server script for the developer to run independently, or start the server immediately. Built on json-server with custom middleware for relationships and WebSocket support.

**Executable scripts:**
- `node .github/skills/local-mock-server/scripts/server.js [options]` — starts the mock server. The agent should copy this to `.orch/mocks/server.js` (for `--generate` mode) or run it directly (for `--start` mode).
- `.github/skills/local-mock-server/scripts/package.json` — dependencies (json-server, ws). Copy to `.orch/mocks/package.json` and run `npm install`.

## Inputs

- `--start` (default) — start the server immediately
- `--generate` — generate a standalone `server.js` script only (user runs it themselves)
- `--port 3001` — REST server port (default: 3001)
- `--delay 200` — simulated latency in milliseconds (default: 0, no delay)
- `--auth` — add a fake `/auth/token` endpoint that returns a JWT
- `--errors` — randomly return HTTP 500 on approximately 5% of requests (for error handling testing)
- `--mocks-dir .orch/mocks/fund-app/` — directory containing mock files (default: `.orch/mocks/`)

## Steps (--generate mode)

1. **Read mock data files**:
   - `.orch/mocks/db.json` — the database
   - `.orch/mocks/routes.json` — URL rewriting rules and endpoint definitions
   - `.orch/mocks/relationships.json` — parent-child mappings with cascade rules
   - `.orch/mocks/ws-messages.json` — WebSocket replay data (if exists)

2. **Generate `.orch/mocks/server.js`** — a standalone Node.js script containing:

   a. **json-server setup**: Require `json-server`, check if installed, print helpful message suggesting `npm install -D json-server` if missing. Create a json-server app instance pointing to `db.json`.

   b. **Relationship middleware**: Intercept DELETE requests — when a parent entity is deleted, automatically cascade-delete all child records that reference it (based on `relationships.json` cascade rules). Intercept POST requests to nested routes — automatically set the foreign key field on the new record (e.g., POST to `/funds/3/holdings` sets `fundId: 3` on the new holding).

   c. **CORS middleware**: Allow all origins (`Access-Control-Allow-Origin: *`), all methods, all headers. Handles preflight OPTIONS requests. Configured for local development use.

   d. **URL rewriting**: Apply rewrite rules from `routes.json` so that URL patterns like `/api/funds` map to `/funds` in the json-server database.

   e. **Latency middleware** (if `--delay` configured): Add a configurable delay to all responses to simulate network latency. Randomize slightly around the configured value (+-20%) for realism.

   f. **Auth endpoint** (if `--auth` configured): Add `POST /auth/token` endpoint that accepts any credentials and returns a fake JWT token with configurable expiry. Add `GET /auth/me` endpoint that validates the JWT and returns a mock user profile. Add middleware to check `Authorization: Bearer <token>` header on all other routes (returns 401 if missing/invalid, but only when `--auth` is enabled).

   g. **Error simulation** (if `--errors` configured): Randomly return HTTP 500 Internal Server Error on approximately 5% of requests. Include a realistic error response body with error code and message. Log simulated errors to console for visibility.

   h. **WebSocket server** (if `ws-messages.json` exists): Create a custom HTTP server using `http.createServer()`. Mount the json-server Express app on this HTTP server. Create a `ws.Server` with `{ server: httpServer }` option — this shares the HTTP server for the WebSocket upgrade handshake. Route incoming WebSocket connections by URL path (`/ws/prices`, `/ws/orders`). Each path replays messages from `ws-messages.json` at the configured interval. This approach avoids EADDRINUSE — both REST and WebSocket share port 3001. Support multiple concurrent clients per channel. Log WebSocket connections and message counts.

   i. **Startup banner**: On server start, print a formatted table of all available REST endpoints (method, URL, description) and all available WebSocket channels (URL, message frequency). Print the base URL and port.

3. **Generate `.orch/mocks/package.json`** with required dependencies:
   - `json-server` (latest compatible version)
   - `ws` (for WebSocket support, if WS channels exist)
   - Include a `start` script: `node server.js`
   - Include a `start:delay` script: `node server.js --delay 200`

## Steps (--start mode)

1. Perform all steps from `--generate` mode to ensure `server.js` is up to date.
2. Check if dependencies are installed (`node_modules/json-server` exists). If not, run `npm install` in `.orch/mocks/`.
3. Run `node .orch/mocks/server.js` with any configured flags.
4. Print the endpoint table to the console.
5. Keep the server running until the user stops it (Ctrl+C).

## Output

```markdown
## Mock Server Report

### Server Configuration
| Setting | Value |
|---------|-------|
| Port | 3001 |
| Base URL | http://localhost:3001 |
| Delay | 0ms |
| Auth | disabled |
| Error simulation | disabled |
| WebSocket | enabled |

### REST Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | /funds | List all funds |
| GET | /funds/:id | Get fund by ID |
| POST | /funds | Create a fund |
| PUT | /funds/:id | Update a fund |
| DELETE | /funds/:id | Delete fund (cascades to holdings) |
| GET | /funds/:fundId/holdings | List holdings for a fund |
| POST | /funds/:fundId/holdings | Create holding (auto-sets fundId) |

### WebSocket Channels
| URL | Protocol | Message Frequency |
|-----|----------|-------------------|
| ws://localhost:3001/ws/prices | WebSocket | 2.3 msg/sec |

### Relationship Enforcement
| Action | Behavior |
|--------|----------|
| DELETE /funds/3 | Cascade deletes all holdings where fundId=3 |
| POST /funds/3/holdings | Auto-sets fundId=3 on new holding |

### Files Generated
- `.orch/mocks/server.js`
- `.orch/mocks/package.json`
```

## Validation

- Server starts without errors on the configured port
- All CRUD operations work correctly (GET, POST, PUT, PATCH, DELETE return expected status codes)
- Relationship enforcement works — cascade delete removes child records, nested POST sets foreign keys
- CORS headers are present on all responses (`Access-Control-Allow-Origin: *`)
- URL rewriting maps correctly (API paths resolve to json-server collections)
- Latency middleware adds delay when configured (responses are slower by approximately `--delay` ms)
- Auth endpoint returns valid JWT when configured, and protected routes reject unauthenticated requests
- Error simulation returns 500 on approximately 5% of requests when configured
- WebSocket connections are accepted and messages are replayed at the correct interval
- Multiple WebSocket clients can connect to the same channel simultaneously
- Server handles concurrent REST and WebSocket traffic without errors
- No application source files are modified — all generated files are in `.orch/mocks/`
