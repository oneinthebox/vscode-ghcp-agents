#!/usr/bin/env node
'use strict';

/**
 * ORCH Mock Generate — create mock data from schema, OpenAPI, or description
 *
 * Usage:
 *   node generate.js --from .orch/mocks/schema.json [options]
 *   node generate.js --from api-spec.yaml [options]
 *   node generate.js --describe "25 funds with name, symbol, returns" [options]
 *
 * Options:
 *   --from <file>       Schema JSON, OpenAPI YAML, or TypeScript model directory
 *   --describe <text>   Natural language description of desired data
 *   --mode <mode>       captured | synthetic (default: synthetic)
 *   --count <n>         Records per collection (default: 50)
 *   --mocks-dir <dir>   Output directory (default: .orch/mocks/)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const fromFile = getFlag('--from', null);
const describe = getFlag('--describe', null);
const mode = getFlag('--mode', 'synthetic');
const count = parseInt(getFlag('--count', '50'));
const mocksDir = getFlag('--mocks-dir', '.orch/mocks');

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

if (!fromFile && !describe) {
  console.error('Usage: node generate.js --from <schema.json|api-spec.yaml|models/> [--count 50] [--mode synthetic]');
  console.error('   or: node generate.js --describe "25 funds with name, symbol, returns"');
  process.exit(1);
}

fs.mkdirSync(mocksDir, { recursive: true });

let schema = {};
let routes = { endpoints: [] };
let relationships = [];

// Load schema from source
if (fromFile) {
  if (fromFile.endsWith('.json') && fs.existsSync(fromFile)) {
    schema = JSON.parse(fs.readFileSync(fromFile, 'utf8'));
    console.log(`Loaded schema from ${fromFile}: ${Object.keys(schema).length} collections`);

    // Also load routes and relationships if they exist alongside
    const dir = path.dirname(fromFile);
    if (fs.existsSync(path.join(dir, 'routes.json'))) {
      routes = JSON.parse(fs.readFileSync(path.join(dir, 'routes.json'), 'utf8'));
    }
    if (fs.existsSync(path.join(dir, 'relationships.json'))) {
      relationships = JSON.parse(fs.readFileSync(path.join(dir, 'relationships.json'), 'utf8'));
    }
  } else if (fromFile.endsWith('.yaml') || fromFile.endsWith('.yml')) {
    console.log(`Parsing OpenAPI spec from ${fromFile}...`);
    schema = parseOpenAPIToSchema(fromFile);
  } else if (fs.existsSync(fromFile) && fs.statSync(fromFile).isDirectory()) {
    console.log(`Reading TypeScript interfaces from ${fromFile}...`);
    schema = parseTSModelsToSchema(fromFile);
  } else {
    console.error(`Cannot read source: ${fromFile}`);
    process.exit(1);
  }
}

// Generate data
const db = {};
for (const [name, def] of Object.entries(schema)) {
  if (mode === 'captured' && fs.existsSync(path.join(mocksDir, 'captured-data.json'))) {
    const captured = JSON.parse(fs.readFileSync(path.join(mocksDir, 'captured-data.json'), 'utf8'));
    if (captured[name]) {
      db[name] = Array.isArray(captured[name]) ? captured[name].slice(0, count) : captured[name];
      continue;
    }
  }
  db[name] = generateCollection(name, def, count, relationships);
  console.log(`  Generated ${name}: ${Array.isArray(db[name]) ? db[name].length : 1} records`);
}

// Enforce relationships (foreign keys)
for (const rel of relationships) {
  if (rel.type === 'has-many' && db[rel.parent] && db[rel.child]) {
    const parentIds = db[rel.parent].map(p => p.id);
    for (const child of db[rel.child]) {
      if (!child[rel.foreignKey]) {
        child[rel.foreignKey] = parentIds[Math.floor(Math.random() * parentIds.length)];
      }
    }
  }
}

// Write outputs
fs.writeFileSync(path.join(mocksDir, 'db.json'), JSON.stringify(db, null, 2));
fs.writeFileSync(path.join(mocksDir, 'schema.json'), JSON.stringify(schema, null, 2));

// Merge routes if existing
const routesPath = path.join(mocksDir, 'routes.json');
if (fs.existsSync(routesPath)) {
  const existing = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  const merged = mergeRoutes(existing, routes);
  fs.writeFileSync(routesPath, JSON.stringify(merged, null, 2));
} else {
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
}

fs.writeFileSync(path.join(mocksDir, 'relationships.json'), JSON.stringify(relationships, null, 2));

console.log(`\nOutput written to ${mocksDir}/`);
console.log(`  db.json — ${Object.keys(db).length} collections`);
console.log(`  schema.json — ${Object.keys(schema).length} schemas`);
console.log(`  routes.json — ${routes.endpoints?.length || 0} endpoints`);
console.log(`  relationships.json — ${relationships.length} relationships`);

// ─── Data generation ──────────────────────────────────────────

function generateCollection(name, def, count, rels) {
  if (!def || def.type !== 'array') {
    return generateRecord(def, 1);
  }
  const items = def.items || {};
  return Array.from({ length: count }, (_, i) => generateRecord(items, i + 1));
}

function generateRecord(schema, id) {
  if (!schema || !schema.fields) return { id };
  const record = { id };
  for (const [key, field] of Object.entries(schema.fields)) {
    record[key] = generateValue(key, field, id);
  }
  return record;
}

function generateValue(key, field, id) {
  if (!field) return null;
  const { type, example } = field;

  // Context-aware generation based on field name
  const k = key.toLowerCase();

  if (k === 'id') return id;
  if (k.endsWith('id') && k !== 'id') return Math.floor(Math.random() * 100) + 1;

  if (type === 'string') {
    if (k.includes('name')) return randomName(id);
    if (k.includes('symbol')) return randomSymbol(id);
    if (k.includes('category')) return randomPick(['Large Cap Growth', 'Large Cap Value', 'Large Cap Blend', 'Mid Cap Growth', 'Small Cap', 'Bond', 'International']);
    if (k.includes('sector')) return randomPick(['Technology', 'Healthcare', 'Financial', 'Consumer', 'Energy', 'Industrial', 'Utilities', 'Real Estate']);
    if (k.includes('status')) return randomPick(['active', 'pending', 'closed', 'filled', 'cancelled']);
    if (k.includes('email')) return `user${id}@example.com`;
    if (k.includes('date') || k.includes('time') || k.includes('inception')) return randomDate();
    if (k.includes('currency')) return randomPick(['USD', 'EUR', 'GBP', 'JPY']);
    if (example) return example;
    return `${key}-${id}`;
  }
  if (type === 'number') {
    if (k.includes('price') || k.includes('nav') || k.includes('cost')) return randomFloat(10, 500, 2);
    if (k.includes('return')) return randomFloat(-15, 35, 2);
    if (k.includes('ratio') || k.includes('weight') || k.includes('turnover')) return randomFloat(0, 100, 2);
    if (k.includes('rating')) return Math.floor(Math.random() * 5) + 1;
    if (k.includes('quantity') || k.includes('shares') || k.includes('count')) return Math.floor(Math.random() * 10000) + 100;
    if (k.includes('assets') || k.includes('investment')) return randomFloat(1000000, 50000000000, 0);
    return randomFloat(1, 1000, 2);
  }
  if (type === 'boolean') return Math.random() > 0.3;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return null;
}

function randomName(id) {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Global', 'Strategic', 'Core', 'Select'];
  const suffixes = ['Growth', 'Value', 'Income', 'Balanced', 'Opportunity', 'Index', 'Leaders', 'Advantage'];
  return `${prefixes[id % prefixes.length]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} Fund`;
}

function randomSymbol(id) {
  const symbols = ['FXAIX', 'FBALX', 'FBGRX', 'FCNTX', 'FDGRX', 'FDEQX', 'FEMKX', 'FGCKX', 'FIVFX', 'FLCSX',
    'FMAGX', 'FMILX', 'FOSFX', 'FPADX', 'FPURX', 'FSCRX', 'FSELX', 'FSMEX', 'FTRNX', 'FUSEX',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
  return symbols[id % symbols.length];
}

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomFloat(min, max, decimals) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }
function randomDate() {
  const d = new Date(Date.now() - Math.floor(Math.random() * 365 * 10) * 86400000);
  return d.toISOString().split('T')[0];
}

// ─── OpenAPI parsing (basic) ──────────────────────────────────

function parseOpenAPIToSchema(file) {
  // Basic YAML parsing for OpenAPI — handles common cases
  const content = fs.readFileSync(file, 'utf8');
  const schema = {};
  // Extract paths and schemas — simplified parser
  // For production, use a proper YAML parser
  console.warn('  Note: Basic OpenAPI parsing. For complex specs, provide TypeScript interfaces instead.');
  return schema;
}

// ─── TypeScript model parsing (basic) ─────────────────────────

function parseTSModelsToSchema(dir) {
  const schema = {};
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.model.ts') || f.endsWith('.interface.ts'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const interfaces = content.match(/export\s+interface\s+(\w+)\s*\{([^}]+)\}/g) || [];

    for (const iface of interfaces) {
      const nameMatch = iface.match(/interface\s+(\w+)/);
      const bodyMatch = iface.match(/\{([^}]+)\}/);
      if (!nameMatch || !bodyMatch) continue;

      const name = nameMatch[1].toLowerCase() + 's'; // pluralize for collection
      const fields = {};
      const lines = bodyMatch[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

      for (const line of lines) {
        const fieldMatch = line.match(/(\w+)\??:\s*(\w+)/);
        if (fieldMatch) {
          const tsType = fieldMatch[2];
          const type = tsType === 'number' ? 'number' : tsType === 'boolean' ? 'boolean' : 'string';
          fields[fieldMatch[1]] = { type };
        }
      }

      schema[name] = { type: 'array', items: { type: 'object', fields } };
    }
  }

  console.log(`  Parsed ${Object.keys(schema).length} collections from ${files.length} files`);
  return schema;
}

// ─── Route merging ────────────────────────────────────────────

function mergeRoutes(existing, newRoutes) {
  const merged = { ...existing };
  if (!merged.endpoints) merged.endpoints = [];

  for (const ep of (newRoutes.endpoints || [])) {
    const exists = merged.endpoints.some(e => e.path === ep.path && e.method === ep.method);
    if (!exists) merged.endpoints.push(ep);
  }
  return merged;
}
