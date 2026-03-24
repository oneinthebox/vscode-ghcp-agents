---
name: local-mock-capture
description: "Import HAR file + optional Chrome snippet to extract API endpoints, response schemas, relationships, and WebSocket messages. Filters XHR only, dedupes, trims large responses, infers parent-child relationships from URL patterns and ID matching."
references: []
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Import recorded network data and build a mock blueprint. Takes a HAR file (and optionally a Chrome snippet JSON for click-to-endpoint mapping) and produces structured outputs describing every API endpoint, its response schema, entity relationships, and WebSocket channels. This is the first step in the mock workflow — capture real traffic, then generate mock data from it.

## Inputs

- **HAR file path** (required) — path to the `.har` file exported from Chrome DevTools or similar
- **Chrome snippet JSON** (optional) — JSON output from the Chrome snippet that maps user actions to network requests
- `--xhr-only` (default true) — filter to XHR and fetch requests only
- `--ignore "analytics|tracking|health"` — regex pattern for URLs to exclude
- `--max-records 50` — maximum array items to keep in trimmed responses

## Steps

1. **Parse HAR file** — extract entries where `_resourceType === 'xhr'` or `_resourceType === 'fetch'`.

2. **Filter out ignored patterns** — apply the `--ignore` regex against each entry URL to remove analytics, tracking, health check URLs, and any other noise.

   If zero entries remain after filtering: stop and report: 'No API endpoints found in the HAR file. This may mean the file contains only static assets (images, CSS, JS). Try: (1) re-export the HAR while navigating the app, (2) disable --xhr-only to see all entries, (3) check the HAR file path is correct.' Do not produce empty output files.

3. **Extract entry data** — for each remaining entry extract:
   - HTTP method
   - Full URL
   - Path (without query string)
   - Query parameters (parsed into key-value pairs)
   - Request headers
   - Request body (parsed if JSON)
   - Response status code
   - Response headers
   - Response body (parsed if JSON)

4. **Deduplicate** — group entries by method + path pattern. When multiple entries share the same method and path pattern, keep only the latest response (by timestamp).

5. **Trim large arrays** — walk each response body. If any array contains more than `--max-records` items, keep the first `--max-records` items and annotate with `_totalCount: <original length>`.

6. **Detect URL patterns** — analyze paths to extract parameterized patterns:
   - `/funds/3` becomes `/funds/:id`
   - `/funds/3/holdings/42` becomes `/funds/:fundId/holdings/:holdingId`
   - Extract all path parameters with their sample values.

7. **Separate REST vs WebSocket entries** — entries with `ws://` or `wss://` protocol are WebSocket; all others are REST.

8. **Process WebSocket entries** — for each WebSocket connection:
   - Extract the connection URL and path pattern
   - Capture all messages with their timestamps and direction (sent/received)
   - Calculate message frequency (messages per second)
   - Identify message types/channels if messages contain a type or channel field

9. **Map Chrome snippet data** — if Chrome snippet JSON is provided, match each endpoint to the user action that triggered it:
   - Click text (button label, link text)
   - Parent page URL at time of click
   - DOM element selector
   - Timestamp correlation between click and network request

10. **Infer entity relationships** from URL patterns and response data:
    - `/funds` and `/funds/3` — parent list/detail relationship (same entity, detail has more fields)
    - `/funds/3/holdings` — nested resource (holdings belong to fund 3)
    - ID values in list responses that match path parameters in detail calls — foreign key link
    - Cascade rule inference: deleting a parent entity should cascade-delete its nested resources
    - Detect shared IDs across different endpoints (e.g., `fundId` appearing in both fund and holding responses)

11. **Infer response schemas** — for each endpoint response, analyze the data to determine:
    - Field names and paths (including nested objects)
    - Types: string, number, boolean, date (ISO format detection), array, object
    - Nullable fields (fields that are null in some responses)
    - Enum detection: fields with fewer than 10 unique values across all responses
    - Value ranges: min/max for number fields
    - String patterns: email, URL, UUID, date format detection
    - Required vs optional: fields present in all responses vs only some

12. **Write outputs**:
    - `.orch/mocks/captured-data.json` — trimmed response data per endpoint, keyed by method + path pattern
    - `.orch/mocks/schema.json` — inferred schema with types, relationships, enums, ranges per endpoint
    - `.orch/mocks/routes.json` — endpoint map with method, path pattern, protocol (rest/ws), path params, query params
    - `.orch/mocks/relationships.json` — parent-child mappings with cascade rules, foreign key definitions, and entity graph
    - `.orch/mocks/ws-messages.json` — WebSocket replay data per channel with message samples and frequency

## Chrome Snippet Asset

Generate a Chrome console snippet script that the user can paste into Chrome DevTools console to capture click-to-endpoint mapping. The snippet must:

- Wrap `XMLHttpRequest.prototype.open` and `XMLHttpRequest.prototype.send` to intercept XHR requests
- Wrap `window.fetch` to intercept fetch requests
- Add a click event listener on `document` to track which DOM element triggered each request
- Tag each intercepted request with: triggering element selector, element text content, parent page URL, timestamp
- Provide a `window.__captureStart()` function to begin recording
- Provide a `window.__captureStop()` function to stop recording and return the JSON output
- Store captured data in `window.__capturedRequests` array
- Output JSON format: `{ requests: [{ url, method, triggerElement, triggerText, pageUrl, timestamp }] }`

## Output

```markdown
## Mock Capture Report

### Endpoints Discovered
| # | Method | Path Pattern | Protocol | Status | Response Size |
|---|--------|-------------|----------|--------|---------------|
| 1 | GET | /funds | REST | 200 | 12.4 KB |
| 2 | GET | /funds/:id | REST | 200 | 3.2 KB |
| 3 | GET | /funds/:fundId/holdings | REST | 200 | 8.1 KB |
| 4 | WS | /ws/prices | WebSocket | 101 | — |

### Relationships Inferred
| Parent | Child | Type | Foreign Key | Cascade |
|--------|-------|------|-------------|---------|
| funds | funds/:id | list/detail | id | — |
| funds | holdings | nested | fundId | delete |

### Data Summary
| Metric | Value |
|--------|-------|
| Total HAR entries | {count} |
| After filtering | {count} |
| After dedup | {count} |
| REST endpoints | {count} |
| WS channels | {count} |
| Entities detected | {count} |
| Relationships | {count} |

### WebSocket Channels
| Channel | Message Frequency | Sample Message Types |
|---------|-------------------|---------------------|
| /ws/prices | 2.3 msg/sec | priceUpdate, heartbeat |

### Files Written
- `.orch/mocks/captured-data.json`
- `.orch/mocks/schema.json`
- `.orch/mocks/routes.json`
- `.orch/mocks/relationships.json`
- `.orch/mocks/ws-messages.json`
```

## Validation

- All HAR entries are accounted for (filtered + processed = total)
- No response bodies are lost during trimming (originals preserved with `_totalCount` annotation)
- URL patterns are correctly extracted (parameterized segments detected, no false positives)
- Relationships make sense — no circular parent-child references
- Schema types are consistent (same field has same type across responses)
- WebSocket messages are correctly separated by channel
- Chrome snippet JSON (if provided) correctly maps to discovered endpoints
- Output JSON files are valid and parseable
