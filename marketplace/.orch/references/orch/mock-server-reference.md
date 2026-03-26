# Mock Server Reference
Source: ORCH internal
Last refreshed: 2026-03-24

How the ORCH mock server works. Built on json-server with custom middleware for relationships, WebSocket support, and realistic simulation. Read by `/local-mock-server`, `/local-mock-capture`, and `/local-mock-generate`.

## json-server API Reference

### REST Endpoints (Auto-Generated from db.json)

For each top-level key in `db.json`, json-server creates full CRUD routes:

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/{collection}` | List all records |
| GET | `/{collection}/:id` | Get single record by ID |
| POST | `/{collection}` | Create new record (auto-assigns `id`) |
| PUT | `/{collection}/:id` | Full replace |
| PATCH | `/{collection}/:id` | Partial update |
| DELETE | `/{collection}/:id` | Delete record |

### Filtering

| Operator | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Equals | `?key=value` | `?status=active` | Exact match |
| Not equal | `?key_ne=value` | `?status_ne=closed` | Exclude value |
| Greater than | `?key_gte=value` | `?amount_gte=1000` | Greater than or equal |
| Less than | `?key_lte=value` | `?amount_lte=5000` | Less than or equal |
| Like (regex) | `?key_like=pattern` | `?name_like=^Fund` | Regex match |
| Multiple values | `?key=v1&key=v2` | `?status=active&status=pending` | OR match |

### Sorting

| Param | Example | Description |
|-------|---------|-------------|
| `_sort` | `?_sort=name` | Sort by field |
| `_order` | `?_sort=name&_order=desc` | Sort direction: `asc` (default) or `desc` |
| Multiple | `?_sort=status,name&_order=desc,asc` | Multi-field sort |

### Pagination

| Param | Default | Example | Description |
|-------|---------|---------|-------------|
| `_page` | 1 | `?_page=2` | Page number (1-based) |
| `_limit` | 10 | `?_limit=25` | Records per page |

Response headers:
- `X-Total-Count`: total records matching filter
- `Link`: pagination links (first, prev, next, last)

### Full-Text Search

| Param | Example | Description |
|-------|---------|-------------|
| `q` | `?q=global+equity` | Searches all string fields for the term |

### Relationships

| Syntax | Example | Description |
|--------|---------|-------------|
| `_expand` | `?_expand=fund` | Include parent object (via `fundId` foreign key) |
| `_embed` | `?_embed=holdings` | Include child array (via `fundId` in children) |
| Nested route | `/funds/3/holdings` | Get holdings where `fundId=3` |

### Custom Routes (routes.json)

```json
{
  "/api/v1/funds": "/funds",
  "/api/v1/funds/:id": "/funds/:id",
  "/api/v1/funds/:fundId/holdings": "/holdings?fundId=:fundId",
  "/auth/me": "/profile/1"
}
```

Left side is the custom URL; right side maps to json-server's internal route.

## WebSocket Integration

json-server does not natively support WebSocket. ORCH adds it by sharing the HTTP server.

### Architecture

```
http.createServer(expressApp)
  |
  +--> Express routes (json-server REST API)
  +--> ws.Server({ server: httpServer })
         |
         +--> /ws/prices   (price tick replay)
         +--> /ws/orders   (order status stream)
         +--> /ws/alerts   (alert notifications)
```

### Implementation Pattern

```javascript
const http = require('http');
const jsonServer = require('json-server');
const { WebSocketServer } = require('ws');

const app = jsonServer.create();
const router = jsonServer.router('db.json');
app.use(jsonServer.defaults());
app.use(router);

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const channel = req.url;  // e.g., '/ws/prices'
  const messages = wsMessages[channel] || [];
  let index = 0;

  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(messages[index % messages.length]));
      index++;
    }
  }, messages[0]?.interval_ms || 1000);

  ws.on('close', () => clearInterval(interval));
});

httpServer.listen(3001);
```

Key: both REST and WebSocket share port 3001. No `EADDRINUSE`.

## Relationship Middleware

### Cascade Deletes

When a parent is deleted, automatically delete all children that reference it.

Configuration (`relationships.json`):

```json
{
  "funds": {
    "children": [
      { "collection": "holdings", "foreignKey": "fundId", "cascade": true },
      { "collection": "transactions", "foreignKey": "fundId", "cascade": true }
    ]
  },
  "holdings": {
    "children": [
      { "collection": "trades", "foreignKey": "holdingId", "cascade": true }
    ]
  }
}
```

Behavior:
- `DELETE /funds/3` --> deletes fund 3 AND all holdings where `fundId=3` AND all trades for those holdings
- Cascades are recursive: parent -> child -> grandchild

### Auto Foreign Keys

When POSTing to a nested route, the foreign key is set automatically:

```
POST /funds/3/holdings { "name": "AAPL", "shares": 100 }
  --> Automatically adds: { "fundId": 3, "name": "AAPL", "shares": 100 }
```

## HAR File Format

HAR (HTTP Archive) files capture network traffic. Relevant fields for `/local-mock-capture`:

| Path | Type | Description |
|------|------|-------------|
| `log.entries[]` | array | One entry per HTTP request |
| `entry.request.method` | string | HTTP method |
| `entry.request.url` | string | Full request URL |
| `entry.request.headers[]` | array | Request headers |
| `entry.request.postData.text` | string | Request body (POST/PUT) |
| `entry.response.status` | number | HTTP status code |
| `entry.response.content.text` | string | Response body |
| `entry.response.content.mimeType` | string | Content type |
| `entry.response.headers[]` | array | Response headers |
| `entry.time` | number | Total request time (ms) |

### Filtering for API Capture

| Filter | Keep | Discard |
|--------|------|---------|
| `_resourceType` | `xhr`, `fetch` | `stylesheet`, `image`, `script`, `font`, `document` |
| `mimeType` | `application/json` | `text/html`, `text/css`, `image/*` |
| URL pattern | `/api/`, `/v1/`, `/graphql` | CDN URLs, analytics, ads |
| Status | 200, 201, 204 | 304 (not modified), 3xx (redirects) |

### Chrome DevTools HAR Export

1. Open DevTools (F12)
2. Go to **Network** tab
3. Perform the user flow you want to capture
4. Right-click the request list --> **Save all as HAR with content**
5. File saves as `{domain}.har`

## Synthetic Data Generation

When no HAR capture is available, `/local-mock-generate` creates synthetic data using field-name heuristics.

### Field Name to Type Heuristics

| Field Pattern | Generated Type | Example Value |
|---------------|---------------|---------------|
| `id` | Auto-increment integer | `1`, `2`, `3` |
| `*Id` (foreignKey) | Random valid reference | `3` (matches parent ID) |
| `name`, `title` | Realistic noun phrase | `"Global Equity Fund"` |
| `description` | Lorem-style sentence | `"A diversified equity portfolio..."` |
| `email` | Fake email | `"jane.doe@example.com"` |
| `phone` | Fake phone | `"+1-555-0123"` |
| `date`, `*Date`, `*_date` | ISO date | `"2026-03-24"` |
| `*At` (createdAt, updatedAt) | ISO timestamp | `"2026-03-24T14:30:00Z"` |
| `amount`, `price`, `value` | Decimal number | `1234.56` |
| `count`, `quantity`, `shares` | Integer | `100` |
| `percent`, `*Pct`, `rate` | Float 0-100 | `85.5` |
| `status` | Enum from context | `"active"`, `"pending"`, `"closed"` |
| `type`, `category` | Enum from context | `"equity"`, `"bond"`, `"cash"` |
| `url`, `*Url` | Fake URL | `"https://example.com/resource/1"` |
| `is*`, `has*`, `enabled` | Boolean | `true`, `false` |
| `tags`, `labels` | String array | `["growth", "large-cap"]` |
| `address` | Fake address object | `{ street, city, state, zip }` |
| `currency` | ISO currency code | `"USD"`, `"EUR"`, `"GBP"` |
| `country` | ISO country code | `"US"`, `"GB"`, `"DE"` |

## Mock-to-Real API Switching

### environment.ts Pattern

```typescript
// environment.ts (development - mock)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api/v1',
  wsUrl: 'ws://localhost:3001',
  useMocks: true
};

// environment.prod.ts (production - real)
export const environment = {
  production: true,
  apiUrl: 'https://api.corp.com/v1',
  wsUrl: 'wss://api.corp.com',
  useMocks: false
};
```

### Service Switching Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class FundService {
  private readonly apiUrl = `${environment.apiUrl}/funds`;

  // Same service code works against mock and real API
  // because json-server matches the real API contract
  getFunds(): Observable<Fund[]> {
    return this.http.get<Fund[]>(this.apiUrl);
  }
}
```

No code changes needed when switching between mock and real -- only the environment config differs.

## Contract Testing Approach

Ensure mock server behavior matches the real API:

| Step | Tool | Purpose |
|------|------|---------|
| 1. Capture real API traffic | HAR export + `/local-mock-capture` | Record actual request/response pairs |
| 2. Generate mock data | `/local-mock-generate` | Create db.json matching real schema |
| 3. Run app against mock | `/local-mock-server --start` | Verify app works with mock |
| 4. Compare schemas | `/docs-drift` against OpenAPI spec | Detect schema mismatches |
| 5. Validate responses | JSON Schema validation | Ensure mock responses match real API schema |

### Contract Drift Detection

```
Real API OpenAPI spec (origin of truth)
  vs.
Mock db.json schema (inferred from data)
  -->
  Missing fields?     --> Add to mock
  Extra fields?       --> Remove from mock or update spec
  Type mismatches?    --> Fix mock data types
  Missing endpoints?  --> Add to routes.json
```

Run periodically or before major releases to keep mocks aligned with the real API.
