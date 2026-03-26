#!/usr/bin/env node
'use strict';

/**
 * ORCH Mock Server — full CRUD REST + WebSocket replay
 *
 * Usage:
 *   node server.js [options]
 *
 * Options:
 *   --port <n>          Port (default: 3001)
 *   --mocks-dir <dir>   Directory with db.json, routes.json, etc. (default: .orch/mocks/)
 *   --delay <ms>        Simulated latency (default: 0)
 *   --auth              Add fake /auth/token endpoint
 *   --errors            Randomly return 500 on ~5% of requests
 *
 * Requires: npm install json-server ws
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const port = parseInt(getFlag('--port', '3001'));
const mocksDir = getFlag('--mocks-dir', '.orch/mocks');
const delay = parseInt(getFlag('--delay', '0'));
const authEnabled = args.includes('--auth');
const errorsEnabled = args.includes('--errors');

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// Check dependencies — try ORCH's isolated node_modules first, then project-level
let jsonServer;
try {
  jsonServer = require(path.join(process.cwd(), '.orch', 'node_modules', 'json-server'));
} catch {
  try {
    jsonServer = require('json-server');
  } catch {
    console.error('json-server not found. Run: cd .orch && npm install');
    process.exit(1);
  }
}

// Check mock data exists
const dbPath = path.join(mocksDir, 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error(`No mock data found at ${dbPath}`);
  console.error('Run @local /local-mock-generate first to create mock data.');
  process.exit(1);
}

// Load config files
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const routesFile = path.join(mocksDir, 'routes.json');
const routes = fs.existsSync(routesFile) ? JSON.parse(fs.readFileSync(routesFile, 'utf8')) : { endpoints: [] };
const relsFile = path.join(mocksDir, 'relationships.json');
const relationships = fs.existsSync(relsFile) ? JSON.parse(fs.readFileSync(relsFile, 'utf8')) : [];
const wsFile = path.join(mocksDir, 'ws-messages.json');
const wsMessages = fs.existsSync(wsFile) ? JSON.parse(fs.readFileSync(wsFile, 'utf8')) : {};

// Create json-server app
const app = jsonServer.create();
const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults({ noCors: false });

// CORS
app.use(middlewares);

// Delay middleware
if (delay > 0) {
  app.use((req, res, next) => {
    setTimeout(next, delay);
  });
}

// Error simulation
if (errorsEnabled) {
  app.use((req, res, next) => {
    if (Math.random() < 0.05) {
      return res.status(500).json({ error: 'Simulated server error', code: 'ORCH_MOCK_ERROR' });
    }
    next();
  });
}

// Auth endpoint
if (authEnabled) {
  app.post('/auth/token', (req, res) => {
    res.json({
      access_token: 'mock-jwt-' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-' + Date.now(),
    });
  });
  app.get('/auth/userinfo', (req, res) => {
    res.json({
      sub: 'mock-user-001',
      name: 'Mock User',
      email: 'mock@example.com',
      roles: ['trader', 'portfolio-manager'],
    });
  });
}

// Relationship middleware: cascade deletes
app.use((req, res, next) => {
  if (req.method === 'DELETE') {
    const parts = req.url.split('/').filter(Boolean);
    const resource = parts[0];
    const id = parseInt(parts[1]);

    if (resource && id) {
      for (const rel of relationships) {
        if (rel.type === 'has-many' && rel.parent === resource && db[rel.child]) {
          const before = db[rel.child].length;
          db[rel.child] = db[rel.child].filter(item => item[rel.foreignKey] !== id);
          const removed = before - db[rel.child].length;
          if (removed > 0) {
            console.log(`  Cascade: deleted ${removed} ${rel.child} for ${resource}/${id}`);
          }
        }
      }
    }
  }
  next();
});

// URL rewriting from routes.json
const urlRewrites = {};
for (const ep of (routes.endpoints || [])) {
  if (ep.protocol === 'rest' && ep.path !== ep.path.replace('/api/', '/')) {
    urlRewrites[ep.path] = ep.path.replace('/api/', '/');
  }
}
if (Object.keys(urlRewrites).length > 0) {
  app.use(jsonServer.rewriter(urlRewrites));
}

app.use('/api', router);
app.use(router);

// Create HTTP server (shared between REST and WebSocket)
const httpServer = http.createServer(app);

// WebSocket setup (if ws-messages.json exists)
const wsChannels = Object.keys(wsMessages);
if (wsChannels.length > 0) {
  // Resolve ws — try ORCH's isolated node_modules first, then project-level
  let WebSocket;
  try {
    WebSocket = require(path.join(process.cwd(), '.orch', 'node_modules', 'ws'));
  } catch {
    try {
      WebSocket = require('ws');
    } catch {
      WebSocket = null;
    }
  }

  if (!WebSocket) {
    console.warn('ws package not found. WebSocket endpoints disabled.');
    console.warn('Fix: Run "cd .orch && npm install" or "npm install ws".');
  } else {
    const wss = new WebSocket.Server({ server: httpServer });

    wss.on('connection', (ws, req) => {
      const channel = req.url;
      console.log(`  WS connected: ${channel}`);

      if (wsMessages[channel]) {
        const messages = wsMessages[channel];
        let idx = 0;
        const interval = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            clearInterval(interval);
            return;
          }
          const msg = messages[idx % messages.length];
          ws.send(JSON.stringify(msg.data || msg));
          idx++;
        }, 500); // Replay at 500ms intervals

        ws.on('close', () => {
          clearInterval(interval);
          console.log(`  WS disconnected: ${channel}`);
        });
      }
    });

    console.log(`WebSocket channels: ${wsChannels.join(', ')}`);
  }
}

// Start server
httpServer.listen(port, () => {
  console.log(`\nORCH Mock Server running on http://localhost:${port}`);
  console.log('');
  console.log('REST Endpoints:');
  for (const collection of Object.keys(db)) {
    console.log(`  GET    http://localhost:${port}/${collection}`);
    console.log(`  GET    http://localhost:${port}/${collection}/:id`);
    console.log(`  POST   http://localhost:${port}/${collection}`);
    console.log(`  PUT    http://localhost:${port}/${collection}/:id`);
    console.log(`  DELETE  http://localhost:${port}/${collection}/:id`);
  }
  if (authEnabled) {
    console.log('');
    console.log('Auth Endpoints:');
    console.log(`  POST   http://localhost:${port}/auth/token`);
    console.log(`  GET    http://localhost:${port}/auth/userinfo`);
  }
  if (wsChannels.length > 0) {
    console.log('');
    console.log('WebSocket Channels:');
    for (const ch of wsChannels) {
      console.log(`  WS     ws://localhost:${port}${ch}`);
    }
  }
  console.log('');
  console.log(`Options: delay=${delay}ms, auth=${authEnabled}, errors=${errorsEnabled}`);
  console.log('Press Ctrl+C to stop.');
});
