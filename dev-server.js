/**
 * dev-server.js — Zero-dependency unified dev server for Railway Seating Mgt
 *
 * Usage:
 *   node dev-server.js          → listens on :5501
 *   node dev-server.js 3001     → listens on :3001
 *   PORT=8888 node dev-server.js → listens on :8888
 *
 * - Serves all static frontend files (html, css, js, images, fonts)
 * - Reverse-proxies /api/*, /health to backend at http://127.0.0.1:3000
 * - Supports Authorization bearer tokens (headers preserved end-to-end)
 * - Strips Origin header before upstream to prevent CORS rejections
 * - Listens dual-stack (no hardcoded host) → works with ngrok tunnels
 */

'use strict';

const http = require('node:http');
const fs   = require('node:fs');
const path = require('node:path');

// ── Config ──────────────────────────────────────────────────────────────────
const PORT         = parseInt(process.argv[2] || process.env.PORT || '5501', 10);
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3000;

// Resolve frontend root whether this script is run from:
//   • d:\code\Projects\Railway_Seating_Mgt\Frontned\  (inside the folder)
//   • d:\code\Projects\Railway_Seating_Mgt\           (project root)
const SCRIPT_DIR   = path.dirname(path.resolve(process.argv[1] || __filename));
const FRONTEND_DIR = fs.existsSync(path.join(SCRIPT_DIR, 'index.html'))
  ? SCRIPT_DIR
  : path.join(SCRIPT_DIR, 'Frontned');

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
};

// ── Routes that should be proxied to the backend ─────────────────────────────
const PROXY_PREFIXES = ['/api/', '/health'];

function shouldProxy(url) {
  return PROXY_PREFIXES.some(prefix => url === prefix.replace(/\/$/, '') || url.startsWith(prefix));
}

// ── Proxy function ───────────────────────────────────────────────────────────
function proxyRequest(clientReq, clientRes) {
  // Forward headers, drop 'origin' to avoid CORS preflight rejections upstream
  const headers = Object.assign({}, clientReq.headers);
  delete headers['origin'];
  delete headers['host'];

  const options = {
    hostname: BACKEND_HOST,
    port:     BACKEND_PORT,
    path:     clientReq.url,
    method:   clientReq.method,
    headers:  headers,
  };

  const backendReq = http.request(options, (backendRes) => {
    // Pass status & headers straight through
    clientRes.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(clientRes, { end: true });
  });

  backendReq.on('error', (err) => {
    console.error(`[proxy] Backend unreachable: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    }
    clientRes.end(JSON.stringify({
      error: 'Backend unavailable — make sure the Express server is running on port ' + BACKEND_PORT,
    }));
  });

  // Pipe request body (for POST/PUT/PATCH)
  clientReq.pipe(backendReq, { end: true });
}

// ── Static file function ─────────────────────────────────────────────────────
function serveStatic(clientReq, clientRes) {
  let urlPath = clientReq.url.split('?')[0]; // strip query string

  // Default to index.html at root
  if (urlPath === '/') urlPath = '/index.html';

  // Gracefully serve a blank favicon if one doesn't exist
  if (urlPath === '/favicon.ico') {
    const faviconPath = path.join(FRONTEND_DIR, 'favicon.ico');
    if (!fs.existsSync(faviconPath)) {
      clientRes.writeHead(204);
      clientRes.end();
      return;
    }
  }

  // Prevent directory traversal
  const filePath = path.normalize(path.join(FRONTEND_DIR, urlPath));
  if (!filePath.startsWith(FRONTEND_DIR)) {
    clientRes.writeHead(403);
    clientRes.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      clientRes.writeHead(404, { 'Content-Type': 'text/plain' });
      clientRes.end(`404 – Not found: ${urlPath}`);
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    clientRes.writeHead(200, {
      'Content-Type':   mime,
      'Content-Length': stat.size,
      'Cache-Control':  'no-cache',
    });

    fs.createReadStream(filePath).pipe(clientRes, { end: true });
  });
}

// ── Main server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = req.url;
  console.log(`[${req.method}] ${url}`);

  if (shouldProxy(url)) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
});

// Listen without a hostname → dual-stack (IPv4 + IPv6) — required for ngrok
server.listen(PORT, () => {
  console.log(`\n🚂 Railway Dev Server running at:`);
  console.log(`   ➜  http://localhost:${PORT}`);
  console.log(`   ➜  Proxying /api/* and /health → http://127.0.0.1:${BACKEND_PORT}`);
  console.log(`   ➜  Serving static files from: ${FRONTEND_DIR}\n`);
  console.log('   Start the backend first:  cd Backend && node server.js');
  console.log('   Ngrok tunnel (optional):  ngrok http ' + PORT + '\n');
});
