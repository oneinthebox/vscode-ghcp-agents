---
name: local-mock-generate
description: "Generate mock data from any source — HAR capture, OpenAPI/Swagger YAML, TypeScript interfaces, or manual description. Outputs json-server compatible db.json with relationships, routes, and WebSocket replay data. Modes: captured (real data) or synthetic (faker-style fake data matching schema)."
references:
  - references/orch/mock-server-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

The main mock data generation engine. Takes schema from any source and produces a complete mock database. Supports four input sources: HAR capture output, OpenAPI/Swagger specs, TypeScript interfaces, or a plain-text manual description. Two generation modes: captured (use real data as-is) or synthetic (generate realistic fake data matching the schema). Output is always json-server compatible.

**Executable script:** Run `node .github/skills/local-mock-generate/scripts/generate.js --from <source> [options]` — this implements the full generation logic. The agent should invoke this script via terminal rather than re-implementing.

## Inputs

- `--from .orch/mocks/schema.json` — use schema from HAR capture
- `--from api-spec.yaml` — use an OpenAPI/Swagger YAML specification
- `--from src/app/models/` — use TypeScript interface files
- `"50 trades with symbol, price, quantity, status"` — manual plain-text description
- `--mode captured|synthetic` (default: `synthetic`) — use real captured data or generate fake data
- `--count 50` — number of records to generate per collection
- `--mocks-dir .orch/mocks/fund-app/` — output directory for mock files (default: `.orch/mocks/`)

## Steps

1. **Detect source type** from input:
   - File ending in `.json` inside `.orch/mocks/` — HAR schema source
   - File ending in `.yaml` or `.yml` — OpenAPI/Swagger source
   - Directory path or files ending in `.model.ts` / `.interface.ts` — TypeScript source
   - Quoted string with no file extension — manual description source

2. **If HAR schema source:** Read `.orch/mocks/schema.json`. Use field types, enums, value ranges, and nullable markers as the generation blueprint. Read `.orch/mocks/relationships.json` for entity relationships and cascade rules.

3. **If OpenAPI source:** Parse the YAML file.
   - Extract `paths` section — map each path + method to an endpoint
   - Extract `components/schemas` — convert each schema definition to a TypeScript-like type with field names, types, required markers
   - Extract `examples` if provided — use as seed data for generation
   - Map request/response schemas to their endpoints
   - Detect relationships from `$ref` references between schemas

4. **If TypeScript interfaces source:** Read all `.model.ts` and `.interface.ts` files in the specified path.
   - Parse each `interface` and `type` declaration
   - Extract field names, TypeScript types, optional markers (`?`)
   - Convert TypeScript types to generation types (string, number, boolean, Date, array, enum union)
   - Detect relationships from field names ending in `Id` (e.g., `fundId` implies relationship to `Fund`)
   - Handle generic types (e.g., `Paginated<Fund>` — unwrap the generic)

5. **If manual description source:** Parse the natural language description.
   - Extract entity name, count, and field list
   - Infer types from field names: `symbol` → string (stock symbol), `price` → number, `quantity` → number, `status` → enum
   - Infer reasonable defaults for ranges and formats
   - If relationships are described ("trades belonging to accounts"), create the relationship mapping

6. **If captured mode:** Read `.orch/mocks/captured-data.json` directly. Use the trimmed real data as the database contents. Skip synthetic generation. Still write db.json in json-server format.

7. **If synthetic mode:** For each collection, generate `--count` records with these rules:
   - **IDs**: Sequential integers starting from 1
   - **Strings**: Context-aware generation based on field name:
     - `symbol` → stock ticker symbols (AAPL, MSFT, GOOG, etc.)
     - `name` → company names, person names, or entity names depending on context
     - `email` → realistic email addresses
     - `description` → lorem ipsum or contextual sentences
     - `url` → realistic URLs
     - Generic strings → random alphanumeric of appropriate length
   - **Numbers**: Within detected ranges or reasonable defaults:
     - `price` → 10.00 to 500.00 (2 decimal places)
     - `quantity` → 100 to 10000 (integers)
     - `percentage` → 0.00 to 100.00
     - Generic numbers → 1 to 1000
   - **Dates**: Recent timestamps within last 90 days, ISO 8601 format
   - **Enums**: Randomly pick from detected enum values (equal distribution)
   - **Booleans**: 70/30 true/false split
   - **Foreign keys**: Valid IDs from the related collection (if relationship defined). Ensure referential integrity — every foreign key points to an existing record.
   - **Arrays**: Generate 1 to 5 items matching the array element schema
   - **Nested objects**: Recursively generate matching the nested schema

8. **Enforce relationships**: For every defined relationship:
   - If Fund has holdings, each holding record gets a valid `fundId` pointing to an existing fund
   - Ensure no orphaned records — every foreign key resolves
   - Distribute child records across parents (not all children under one parent)
   - Respect cardinality if defined (one-to-many, many-to-many)

9. **Generate WebSocket replay data** (if WS endpoints exist in schema):
   - Create sample messages matching the message schema
   - Set realistic intervals based on captured frequency (or 1 message/second default)
   - Include different message types per channel
   - Add sequence numbers and timestamps

10. **Write outputs**:
    - `.orch/mocks/db.json` — json-server compatible database containing all collections as top-level keys, each mapping to an array of records
    - `.orch/mocks/routes.json` — URL rewriting rules for json-server, updated with protocol (rest or ws) per endpoint. If `.orch/mocks/routes.json` already exists (from a previous capture), merge the existing routes with newly generated ones. Preserve WebSocket routing data from the capture. Do not silently overwrite.
    - `.orch/mocks/relationships.json` — cascade rules and foreign key definitions, updated if new relationships were inferred during generation
    - `.orch/mocks/ws-messages.json` — WebSocket replay data per channel with message arrays and interval configuration
    - `.orch/mocks/schema.json` — the inferred or parsed schema with types, relationships, enums, and value ranges. This file is consumed by `/angular-mock-wire` for TypeScript interface generation.

## Output

```markdown
## Mock Generation Report

### Collections Generated
| Collection | Records | Source | Mode |
|-----------|---------|--------|------|
| funds | 50 | HAR schema | synthetic |
| holdings | 150 | HAR schema | synthetic |
| trades | 200 | HAR schema | synthetic |

### Relationships Enforced
| Parent | Child | Foreign Key | Children per Parent (avg) |
|--------|-------|-------------|--------------------------|
| funds | holdings | fundId | 3.0 |
| funds | trades | fundId | 4.0 |

### WebSocket Channels
| Channel | Messages Generated | Interval |
|---------|-------------------|----------|
| /ws/prices | 100 | 500ms |

### Data Validation
| Check | Status |
|-------|--------|
| All foreign keys resolve | PASS |
| No orphaned records | PASS |
| Record counts match --count | PASS |
| Enums use valid values only | PASS |
| Numbers within ranges | PASS |
| Schema validation | PASS |

### Files Written
- `.orch/mocks/db.json` ({size})
- `.orch/mocks/routes.json`
- `.orch/mocks/relationships.json`
- `.orch/mocks/ws-messages.json`
- `.orch/mocks/schema.json`
```

## Validation

- All foreign keys resolve to existing records in the referenced collection
- No orphaned records — every child has a valid parent
- Arrays contain the correct count of records (matching `--count`)
- Enum fields only contain values from the detected/defined enum set
- Number fields fall within detected/configured ranges
- Generated data passes full schema validation (types, required fields, formats)
- db.json is valid JSON and loadable by json-server
- WebSocket message schemas match the channel definition
- Relationships are consistent between `relationships.json` and the actual data in `db.json`
