#!/usr/bin/env node
'use strict';

/**
 * ORCH Mock Capture — parse HAR file → extract API endpoints, schemas, relationships
 *
 * Usage:
 *   node capture.js <har-file> [options]
 *   node capture.js export.har --max-records 25 --mocks-dir .orch/mocks/fund-app/
 *
 * Options:
 *   --max-records <n>    Max array items per response (default: 50)
 *   --mocks-dir <dir>    Output directory (default: .orch/mocks/)
 *   --xhr-only           Filter to XHR/fetch only (default: true)
 *   --ignore <pattern>   Regex to exclude URLs (default: analytics|tracking|health|favicon)
 *   --snippet <file>     Chrome snippet JSON for click-to-endpoint mapping
 */

const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const harFile = args.find(a => !a.startsWith('--'));
const maxRecords = parseInt(getFlag('--max-records', '50'));
const mocksDir = getFlag('--mocks-dir', '.orch/mocks');
const xhrOnly = !args.includes('--no-xhr');
const ignorePattern = new RegExp(getFlag('--ignore', 'analytics|tracking|health|favicon|hot-update'));
const snippetFile = getFlag('--snippet', null);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

if (!harFile || !fs.existsSync(harFile)) {
  console.error('Usage: node capture.js <har-file> [--max-records 50] [--mocks-dir .orch/mocks/]');
  console.error(harFile ? `File not found: ${harFile}` : 'No HAR file specified');
  process.exit(1);
}

// Ensure output dir exists
fs.mkdirSync(mocksDir, { recursive: true });

console.log(`Parsing ${harFile}...`);
const har = JSON.parse(fs.readFileSync(harFile, 'utf8'));
const entries = har.log.entries || [];
console.log(`Total entries: ${entries.length}`);

// Step 1: Filter
let filtered = entries;
if (xhrOnly) {
  filtered = filtered.filter(e =>
    e._resourceType === 'xhr' || e._resourceType === 'fetch' ||
    (e.request.url.includes('/api/') || e.request.url.includes('/v1/') || e.request.url.includes('/v2/'))
  );
}
filtered = filtered.filter(e => !ignorePattern.test(e.request.url));
// Also filter WebSocket entries separately
const wsEntries = entries.filter(e =>
  e.request.url.startsWith('ws://') || e.request.url.startsWith('wss://')
);

console.log(`After filtering: ${filtered.length} REST + ${wsEntries.length} WebSocket`);

if (filtered.length === 0 && wsEntries.length === 0) {
  console.error('No API endpoints found. Try --no-xhr or check the HAR file.');
  process.exit(1);
}

// Step 2: Extract endpoints
const endpointMap = new Map(); // method+pathPattern → latest entry

for (const entry of filtered) {
  const url = new URL(entry.request.url);
  const method = entry.request.method;
  const pathPattern = normalizePathToPattern(url.pathname);
  const key = `${method} ${pathPattern}`;

  // Dedupe: keep latest
  endpointMap.set(key, {
    method,
    url: url.pathname,
    pathPattern,
    query: url.search,
    status: entry.response.status,
    requestHeaders: extractHeaders(entry.request.headers),
    requestBody: parseBody(entry.request.postData?.text),
    responseBody: parseBody(entry.response.content?.text),
    responseHeaders: extractHeaders(entry.response.headers),
    timestamp: entry.startedDateTime,
  });
}

const endpoints = Array.from(endpointMap.values());
console.log(`Unique endpoints: ${endpoints.length}`);

// Step 3: Trim large responses
for (const ep of endpoints) {
  ep.responseBody = trimArrays(ep.responseBody, maxRecords);
}

// Step 4: Infer schemas
const schemas = {};
for (const ep of endpoints) {
  if (ep.responseBody && typeof ep.responseBody === 'object') {
    const name = pathToSchemaName(ep.pathPattern);
    schemas[name] = inferSchema(ep.responseBody);
  }
}

// Step 5: Infer relationships
const relationships = inferRelationships(endpoints);

// Step 6: Build routes
const routes = endpoints.map(ep => ({
  path: ep.pathPattern,
  method: ep.method,
  protocol: 'rest',
  params: extractParams(ep.pathPattern),
  example: ep.url,
}));

// Add WebSocket routes
for (const ws of wsEntries) {
  const url = new URL(ws.request.url);
  routes.push({
    path: url.pathname,
    method: 'WS',
    protocol: 'ws',
    params: [],
    example: ws.request.url,
  });
}

// Step 7: WebSocket messages
const wsMessages = {};
for (const ws of wsEntries) {
  const url = new URL(ws.request.url);
  // HAR WebSocket messages are in _webSocketMessages (Chrome DevTools format)
  if (ws._webSocketMessages) {
    wsMessages[url.pathname] = ws._webSocketMessages.slice(0, maxRecords).map(m => ({
      type: m.type,
      data: parseBody(m.data),
      time: m.time,
    }));
  }
}

// Step 8: Chrome snippet integration
let actionMap = null;
if (snippetFile && fs.existsSync(snippetFile)) {
  actionMap = JSON.parse(fs.readFileSync(snippetFile, 'utf8'));
  console.log(`Chrome snippet: ${actionMap.length} actions mapped`);
}

// Step 9: Write outputs
const capturedData = {};
for (const ep of endpoints) {
  const name = pathToSchemaName(ep.pathPattern);
  capturedData[name] = ep.responseBody;
}

fs.writeFileSync(path.join(mocksDir, 'captured-data.json'), JSON.stringify(capturedData, null, 2));
fs.writeFileSync(path.join(mocksDir, 'schema.json'), JSON.stringify(schemas, null, 2));
fs.writeFileSync(path.join(mocksDir, 'routes.json'), JSON.stringify({ endpoints: routes }, null, 2));
fs.writeFileSync(path.join(mocksDir, 'relationships.json'), JSON.stringify(relationships, null, 2));
if (Object.keys(wsMessages).length > 0) {
  fs.writeFileSync(path.join(mocksDir, 'ws-messages.json'), JSON.stringify(wsMessages, null, 2));
}
if (actionMap) {
  fs.writeFileSync(path.join(mocksDir, 'action-map.json'), JSON.stringify(actionMap, null, 2));
}

console.log(`\nOutput written to ${mocksDir}/`);
console.log(`  captured-data.json — ${endpoints.length} endpoints`);
console.log(`  schema.json — ${Object.keys(schemas).length} schemas`);
console.log(`  routes.json — ${routes.length} routes (${routes.filter(r => r.protocol === 'ws').length} WebSocket)`);
console.log(`  relationships.json — ${relationships.length} relationships`);
if (Object.keys(wsMessages).length > 0) {
  console.log(`  ws-messages.json — ${Object.keys(wsMessages).length} channels`);
}

// ─── Helper functions ─────────────────────────────────────────

function normalizePathToPattern(pathname) {
  // /api/funds/123 → /api/funds/:id
  // /api/funds/123/holdings/456 → /api/funds/:fundId/holdings/:holdingId
  return pathname.replace(/\/(\d+)(\/|$)/g, (_, num, rest) => `/:id${rest}`);
}

function pathToSchemaName(pattern) {
  // /api/funds → funds, /api/funds/:id → fund, /api/funds/:id/holdings → fundHoldings
  const parts = pattern.split('/').filter(p => p && !p.startsWith(':') && p !== 'api' && p !== 'v1' && p !== 'v2');
  if (parts.length === 0) return 'root';
  if (parts.length === 1) return parts[0];
  return parts.map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function extractHeaders(headers) {
  const relevant = ['content-type', 'authorization', 'x-api-key', 'accept'];
  return (headers || [])
    .filter(h => relevant.includes(h.name.toLowerCase()))
    .reduce((acc, h) => { acc[h.name.toLowerCase()] = h.value; return acc; }, {});
}

function parseBody(text) {
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return text; }
}

function trimArrays(obj, max) {
  if (Array.isArray(obj)) {
    const trimmed = obj.slice(0, max).map(item => trimArrays(item, max));
    if (obj.length > max) {
      return { data: trimmed, totalCount: obj.length };
    }
    return trimmed;
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = trimArrays(val, max);
    }
    return result;
  }
  return obj;
}

function inferSchema(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array', items: {} };
    return { type: 'array', items: inferSchema(data[0]), count: data.length };
  }
  if (data === null) return { type: 'null' };
  if (typeof data !== 'object') {
    return { type: typeof data, example: data };
  }

  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    const schema = inferSchema(val);
    // Detect enums (collect unique values)
    if (typeof val === 'string' || typeof val === 'number') {
      schema.example = val;
    }
    fields[key] = schema;
  }
  return { type: 'object', fields };
}

function inferRelationships(endpoints) {
  const rels = [];
  const patterns = endpoints.map(e => e.pathPattern);

  for (const pattern of patterns) {
    // /api/funds/:id/holdings → parent: funds, child: holdings
    const match = pattern.match(/\/([^/]+)\/:(\w+)\/([^/]+)/);
    if (match) {
      rels.push({
        parent: match[1],
        child: match[3],
        foreignKey: `${match[1].replace(/s$/, '')}Id`,
        type: 'has-many',
        cascade: true,
      });
    }
    // /api/funds and /api/funds/:id → list/detail
    if (pattern.match(/\/([^/]+)\/:id$/)) {
      const listPattern = pattern.replace('/:id', '');
      if (patterns.includes(listPattern)) {
        const resource = pattern.match(/\/([^/]+)\/:id$/)[1];
        rels.push({
          resource,
          listEndpoint: listPattern,
          detailEndpoint: pattern,
          type: 'list-detail',
        });
      }
    }
  }
  return rels;
}

function extractParams(pattern) {
  return (pattern.match(/:(\w+)/g) || []).map(p => p.slice(1));
}
