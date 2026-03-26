# Angular Documentation Conventions — TSDoc, Compodoc, and API Docs

Sources:
- https://tsdoc.org/
- https://compodoc.app/
- https://typedoc.org/
- https://angular.dev/style-guide
Last refreshed: 2026-03-25

---

## TSDoc vs JSDoc — When to Use What

| Context | Format | Why |
|---------|--------|-----|
| Angular/TypeScript source | **TSDoc** | TypeScript provides types; TSDoc documents intent. No `{type}` syntax. |
| Pure JavaScript files | **JSDoc** | JS has no type annotations; JSDoc provides them via `{type}`. |
| Compodoc compatibility | **TSDoc** | Compodoc reads TSDoc comments. JSDoc `{type}` causes warnings. |
| TypeDoc compatibility | **TSDoc** | TypeDoc reads TSDoc natively. |

**Key rule:** In TypeScript, NEVER use `@param {string} name` — the type is redundant. Use `@param name - description`.

## TSDoc Tag Reference

### Required Tags

| Tag | When | Example |
|-----|------|---------|
| `@param` | Every parameter | `@param tradeId - Unique trade identifier for backend lookup` |
| `@returns` | Every non-void method | `@returns The resolved trade with updated status` |
| `@throws` | Every thrown error | `@throws {HttpErrorResponse} When the trade is not found (404)` |

### Recommended Tags

| Tag | When | Example |
|-----|------|---------|
| `@example` | Complex or non-obvious usage | Code block showing typical invocation |
| `@see` | Related APIs | `@see TradeService.cancelTrade` |
| `@deprecated` | Sunset path | `@deprecated Use newMethod() instead. Removal: v5.0` |
| `@remarks` | Extended explanation | Caveats, performance notes, design decisions |
| `@defaultValue` | Optional params with defaults | `@defaultValue 'asc'` |
| `@internal` | Not part of public API | Prevents export in .d.ts with stripInternal |

### Tags to Avoid in TypeScript

| Tag | Why | Alternative |
|-----|-----|-------------|
| `@type {T}` | TypeScript provides types | Use TypeScript type annotation |
| `@constructor` | Classes have constructors by definition | Omit |
| `@class` | TypeScript `class` keyword | Omit |
| `@typedef` | Use TypeScript `type` or `interface` | Omit |
| `@callback` | Use TypeScript function types | Omit |
| `@enum` | Use TypeScript `enum` | Omit |

## Comment Style Guide

### Class/Interface Documentation

```typescript
/**
 * Manages trade execution lifecycle — from order placement through settlement.
 *
 * @remarks
 * Wraps the Trading API (/api/v2/trades) with retry logic and optimistic updates.
 * All methods log via LoggingService for audit trail compliance (CR-2024-017).
 *
 * @example
 * ```typescript
 * const trade = await tradeService.executeTrade({ symbol: 'AAPL', qty: 100, side: 'buy' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TradeService { ... }
```

### Method Documentation

```typescript
/**
 * Submits a new trade order and returns the confirmed trade with server-assigned ID.
 *
 * @param order - Trade order details (symbol, quantity, side, order type)
 * @param options - Optional execution parameters (time-in-force, limit price)
 * @returns The confirmed trade with `status: 'pending'` and server-assigned `id`
 * @throws {HttpErrorResponse} 400 when validation fails (invalid symbol, qty < 1)
 * @throws {HttpErrorResponse} 401 when auth token is expired
 *
 * @example
 * ```typescript
 * const trade = await this.tradeService.submitOrder(
 *   { symbol: 'AAPL', quantity: 100, side: 'buy', orderType: 'market' },
 *   { timeInForce: 'day' }
 * );
 * ```
 */
submitOrder(order: CreateTradeDTO, options?: ExecutionOptions): Observable<Trade> { ... }
```

### Signal Input/Output Documentation

```typescript
/**
 * Fund identifier used to load fund details and positions.
 * Triggers a re-fetch of fund data whenever the value changes.
 */
fundId = input.required<number>();

/**
 * Emits when the user confirms a trade execution.
 * Parent components should handle order routing.
 */
tradeConfirmed = output<Trade>();

/**
 * Whether the trade form is in a valid, submittable state.
 * Derived from form validation and available balance checks.
 */
canSubmit = computed(() => this.form.valid() && this.hasBalance());
```

### Inline Comments (WHY, Not WHAT)

```typescript
// BAD: Comments that repeat the code
// Set the price
this.price = response.price;

// GOOD: Comments that explain the WHY
// Use mid-price for display — bid/ask spread can be misleading for illiquid instruments
this.price = (response.bid + response.ask) / 2;

// GOOD: Comments that explain business rules
// Trades over $1M require additional compliance approval (SEC Rule 15c3-5)
if (trade.notional > 1_000_000) { ... }

// GOOD: Comments that explain workarounds
// AG Grid fires onGridReady before data is loaded in some browsers — defer 1 tick
setTimeout(() => this.gridApi.sizeColumnsToFit(), 0);
```

## Compodoc — Browsable Documentation

### What Compodoc Provides

| Feature | Description |
|---------|-------------|
| Module graph | Visual dependency graph of Angular modules |
| Component tree | All components with inputs, outputs, methods |
| Route map | All routes with lazy loading indicators |
| Service catalog | Injectable services with methods and dependencies |
| Coverage report | TSDoc coverage percentage per file |
| Search | Full-text search across all documented APIs |

### Setup

```bash
# Install
npm install --save-dev @compodoc/compodoc

# Add npm script
# package.json:
{
  "scripts": {
    "docs:generate": "compodoc -p tsconfig.json --theme material --output docs/compodoc",
    "docs:serve": "compodoc -p tsconfig.json --theme material -s --port 8080",
    "docs:coverage": "compodoc -p tsconfig.json --coverageTest 80"
  }
}
```

### Configuration (`.compodocrc.json`)

```json
{
  "tsconfig": "./tsconfig.json",
  "output": "./docs/compodoc",
  "theme": "material",
  "name": "My Angular App",
  "hideGenerator": true,
  "disableSourceCode": false,
  "disablePrivate": true,
  "disableProtected": false,
  "disableInternal": true,
  "coverageTest": 80,
  "coverageMinimumPerFile": 60,
  "includes": "docs",
  "includesName": "Guides",
  "customFavicon": "src/favicon.ico"
}
```

### Nx Workspace Configuration

```bash
# Add Compodoc target to project.json
npx nx generate @twittwer/compodoc:config my-app
# OR manually in project.json:
{
  "targets": {
    "compodoc": {
      "executor": "@twittwer/compodoc:compodoc",
      "options": {
        "tsConfig": "apps/my-app/tsconfig.json",
        "outputPath": "dist/compodoc/my-app"
      },
      "configurations": {
        "json": { "exportFormat": "json" },
        "serve": { "serve": true, "port": 8080 }
      }
    }
  }
}
```

### CI Integration

```yaml
# GitHub Actions step
- name: Generate documentation
  run: npx compodoc -p tsconfig.json --coverageTest 80
# Fails the build if coverage drops below 80%
```

### Compodoc and TSDoc Compatibility

Compodoc reads standard TSDoc/JSDoc block comments (`/** ... */`). It recognizes:

| Tag | Compodoc support |
|-----|-----------------|
| `@param` | Yes — rendered in method documentation |
| `@returns` | Yes — rendered in method documentation |
| `@example` | Yes — rendered as code blocks |
| `@link` | Yes — creates hyperlinks between symbols |
| `@deprecated` | Yes — shows deprecation badge |
| `@ignore` | Yes — excludes from documentation |
| `@internal` | Yes — excludes from documentation |

**Compodoc does NOT support:** `@remarks`, `@defaultValue`, `@sealed`, `@virtual` (TSDoc-only tags). These are silently ignored.

## TypeDoc — Alternative for Libraries

For publishable TypeScript libraries (not Angular apps), TypeDoc generates API reference from `.d.ts` files:

```bash
# Install
npm install --save-dev typedoc

# Generate
npx typedoc --entryPoints src/public-api.ts --out docs/typedoc

# Configuration (typedoc.json)
{
  "entryPoints": ["src/public-api.ts"],
  "out": "docs/typedoc",
  "excludePrivate": true,
  "excludeInternal": true,
  "plugin": ["typedoc-plugin-markdown"]  // optional: Markdown output
}
```

### When to Use Which

| Tool | Use for | Strengths |
|------|---------|-----------|
| **Compodoc** | Angular apps and libs | Module graph, route map, component catalog |
| **TypeDoc** | Pure TypeScript libraries | Type-aware, follows `.d.ts` exports |
| **Storybook** | Component library showcase | Visual, interactive, supports all frameworks |

## Documentation Quality Checklist

| Check | Pass criteria |
|-------|--------------|
| No JSDoc `{type}` in TypeScript | Zero instances of `@param {T}` or `@returns {T}` |
| All public APIs documented | Coverage >= 80% (configurable) |
| All @param match signature | No stale, missing, or misnamed params |
| All non-void methods have @returns | Describes meaning, not just type |
| @throws for error paths | Every catch/throw has a matching tag |
| @example for complex methods | Methods with > 3 params or non-obvious usage |
| @deprecated has sunset path | Tells users what to use instead and when removed |
| No empty doc blocks | `/** */` with no content |
| Inline comments explain WHY | Not "increment counter" style |
| No commented-out code | Dead code should be deleted, not commented |
