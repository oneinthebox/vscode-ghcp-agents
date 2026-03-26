---
name: angular-docs-api
description: "Generate API documentation for Angular services — HTTP endpoints consumed, request/response types, error handling, authentication requirements. Produces markdown or OpenAPI-style docs from actual HttpClient calls."
references:
  - references/angular/v19/best-practices.md
  - references/angular/v19/documentation-conventions.md
allowed-tools:
  - codebase
  - edit
---

## Context

Scans Angular services for HTTP calls (HttpClient, fetch) and produces API documentation showing every endpoint the frontend consumes. Extracts request/response types from TypeScript generics, detects auth headers, maps error handling patterns, and documents the API contract from the frontend's perspective.

This is NOT a backend API doc generator — it documents what the Angular app expects from its APIs, which is valuable for frontend-backend contract alignment.

## Inputs

- `@angular /angular-docs-api` — document all API calls in the project
- `@angular /angular-docs-api src/app/services/` — document specific services
- `@angular /angular-docs-api --format openapi` — produce OpenAPI 3.0 YAML
- `@angular /angular-docs-api --format markdown` — produce markdown (default)

## Steps

1. Scan all `.service.ts` files for HttpClient usage using these extraction patterns:
   - **HTTP call detection** — match `this.http.get<T>()`, `.post<T>()`, `.put<T>()`, `.delete<T>()`, `.patch<T>()` calls. Pattern: `this\.http\.(get|post|put|delete|patch)<([^>]+)>\(\s*[`'"]([^`'"]+)[`'"]`.
   - **Generic type extraction** — from `this.http.get<Trade[]>(...)`, extract `Trade[]` as the response type. From `this.http.post<Trade>(url, body)`, infer the request type from the `body` argument's TypeScript type annotation.
   - **URL extraction** — resolve template literals (`` `${this.baseUrl}/trades` ``), string constants (`private readonly TRADES_URL = '/api/trades'`), and ConfigService lookups (`this.config.get('api.tradesUrl')`).
   - **Interceptor detection** — scan for classes implementing `HttpInterceptor` or functional interceptors (`HttpInterceptorFn`). Identify auth interceptors by matching `req.clone({ setHeaders: { Authorization:` or `req.headers.set('Authorization',`. Identify retry interceptors by matching `retry(` or `retryWhen(` in the interceptor body.

   Example extraction from a service file:
   ```typescript
   // Source: trade.service.ts
   getAllTrades(): Observable<Trade[]> {
     return this.http.get<Trade[]>(`${this.config.get('api.baseUrl')}/trades`);
   }
   createTrade(dto: CreateTradeDTO): Observable<Trade> {
     return this.http.post<Trade>(`${this.config.get('api.baseUrl')}/trades`, dto);
   }
   ```
   Extracted:
   - `GET /api/trades` -> Response: `Trade[]`, Request: none
   - `POST /api/trades` -> Response: `Trade`, Request: `CreateTradeDTO`

2. For each HTTP call, extract:
   - **Method** (GET, POST, PUT, DELETE, PATCH)
   - **URL** (from template literals, constants, ConfigService)
   - **Request type** (from generic parameter or body argument type)
   - **Response type** (from generic parameter)
   - **Headers** (from interceptors or per-request options)
   - **Error handling** (catchError patterns, retry logic)
   - **Auth required** (does the interceptor add Authorization header?)
3. Extract TypeScript interfaces used as request/response types by scanning for `export interface {TypeName}` declarations referenced by the extracted generics.
4. Group endpoints by service and feature area.
5. Produce documentation:
   - **Markdown format**: tables with endpoint, method, types, auth, errors
   - **OpenAPI format**: valid OpenAPI 3.0 YAML with paths, schemas, responses
6. Write API-DOCS.md (or api-spec.yaml for OpenAPI format).

### OpenAPI Output Example

When `--format openapi` is specified, produce a valid OpenAPI 3.0 YAML document:

```yaml
openapi: "3.0.3"
info:
  title: Trade Platform — Frontend API Contract
  version: "1.0.0"
  description: Auto-generated from Angular HttpClient calls
paths:
  /api/trades:
    get:
      summary: Retrieve all trades
      operationId: getAllTrades
      tags: [TradeService]
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of trades
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Trade"
        "401":
          description: Unauthorized — token missing or expired
        "500":
          description: Server error — client retries 3x with backoff
    post:
      summary: Create a new trade
      operationId: createTrade
      tags: [TradeService]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTradeDTO"
      responses:
        "201":
          description: Trade created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Trade"
        "400":
          description: Validation error
        "401":
          description: Unauthorized
  /api/trades/{id}:
    delete:
      summary: Delete a trade by ID
      operationId: deleteTrade
      tags: [TradeService]
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Trade deleted
        "404":
          description: Trade not found
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    Trade:
      type: object
      properties:
        id:
          type: string
        symbol:
          type: string
        quantity:
          type: number
        price:
          type: number
        status:
          type: string
          enum: [pending, filled, cancelled]
        timestamp:
          type: string
          format: date-time
    CreateTradeDTO:
      type: object
      required: [symbol, quantity, side, orderType]
      properties:
        symbol:
          type: string
        quantity:
          type: number
        side:
          type: string
          enum: [buy, sell]
        orderType:
          type: string
          enum: [market, limit]
```

## Output

```markdown
## API Documentation — Frontend Perspective

### Summary
- Services with HTTP calls: {n}
- Total endpoints consumed: {n}
- Auth-protected endpoints: {n}
- Endpoints with error handling: {n}

### Endpoints by Service
#### TradeService
| Method | Endpoint | Request | Response | Auth | Errors |
|--------|----------|---------|----------|------|--------|
| GET | /api/trades | — | Trade[] | Yes | 401, 500 (retry 3x) |
| POST | /api/trades | CreateTradeDTO | Trade | Yes | 400 (validation), 401 |
| DELETE | /api/trades/:id | — | void | Yes | 404, 401 |

#### MarketDataService
| Method | Endpoint | Request | Response | Auth | Errors |
|--------|----------|---------|----------|------|--------|
| WS | wss://market-data/prices | — | PriceTick (stream) | Yes | reconnect on close |

### Request/Response Types
| Type | Fields | Used by |
|------|--------|---------|
| Trade | id, symbol, quantity, price, status, timestamp | TradeService |
| CreateTradeDTO | symbol, quantity, side, orderType | TradeService |
| PriceTick | symbol, bid, ask, timestamp | MarketDataService |

### Interceptors
| Interceptor | Purpose | Applied to |
|-------------|---------|-----------|
| AuthInterceptor | Adds Bearer token | All /api/* requests |
| RetryInterceptor | Retry 3x with backoff | GET requests only |
```

## Validation

- All HttpClient calls are captured (no missed endpoints)
- URL patterns match actual code (not guessed)
- TypeScript types are accurately extracted
- Auth detection matches actual interceptor configuration
- OpenAPI output (if requested) is valid YAML
- No functional code changes — only documentation written
