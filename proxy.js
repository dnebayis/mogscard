// proxy.js — CORS proxy for Monad Mogs API + unavatar.io PFP
// Run: node proxy.js
// Serves static files AND:
//   /proxy/* → api.monadmogs.xyz
//   /pfp/*   → unavatar.io (follows redirects)

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT = 3030;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ---- Fetch a URL following up to maxRedirects redirects ----
function fetchFollowRedirects(urlStr, headers, res, depth = 0) {
  if (depth > 5) {
    res.writeHead(508, CORS);
    res.end('Too many redirects');
    return;
  }

  const url = new URL(urlStr);
  const options = {
    hostname: url.hostname,
    port:     url.port || 443,
    path:     url.pathname + url.search,
    method:   'GET',
    headers,
  };

  const req = https.request(options, (proxyRes) => {
    const { statusCode, headers: resHeaders } = proxyRes;

    // Follow redirect
    if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308)
        && resHeaders.location) {
      proxyRes.resume(); // drain body
      const next = resHeaders.location.startsWith('http')
        ? resHeaders.location
        : `https://${url.hostname}${resHeaders.location}`;
      console.log(`  ↳ redirect → ${next}`);
      fetchFollowRedirects(next, headers, res, depth + 1);
      return;
    }

    const contentType = resHeaders['content-type'] || 'image/jpeg';
    res.writeHead(statusCode, { ...CORS, 'Content-Type': contentType });
    proxyRes.pipe(res);
  });

  req.on('error', (e) => {
    console.error('[FETCH ERROR]', e.message);
    res.writeHead(502, CORS);
    res.end('Upstream error: ' + e.message);
  });

  req.end();
}

// ---- HTTP Server ----
const server = http.createServer((req, res) => {

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // --- /proxy/* → api.monadmogs.xyz ---
  if (req.url.startsWith('/proxy/')) {
    const apiPath = req.url.replace('/proxy', '/api');
    console.log(`[API]  → https://api.monadmogs.xyz${apiPath}`);

    const options = {
      hostname: 'api.monadmogs.xyz',
      port:     443,
      path:     apiPath,
      method:   'GET',
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'MogsCard/1.0',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || 'application/json';
      res.writeHead(proxyRes.statusCode, { ...CORS, 'Content-Type': contentType });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error('[API ERROR]', e.message);
      res.writeHead(502, CORS);
      res.end(JSON.stringify({ error: e.message }));
    });

    proxyReq.end();
    return;
  }

  // --- /pfp/{username} → unavatar.io/x/{username} (follows redirects) ---
  if (req.url.startsWith('/pfp/')) {
    const username = decodeURIComponent(req.url.slice(5).split('?')[0]);
    const pfpUrl   = `https://unavatar.io/x/${encodeURIComponent(username)}`;
    console.log(`[PFP]  → ${pfpUrl}`);

    fetchFollowRedirects(pfpUrl, {
      'User-Agent': 'MogsCard/1.0',
      'Accept':     'image/*, */*',
    }, res);
    return;
  }

  // --- Static file serving ---
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Security: no path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.write(data);
    res.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n🐹 Mogs Card dev server running!`);
  console.log(`   → http://localhost:${PORT}\n`);
});
