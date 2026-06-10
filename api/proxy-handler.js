// api/proxy-handler.js
// Vercel serverless — proxies api.monadmogs.xyz (CORS bypass)
// vercel.json rewrites: /api/proxy/(.*) → /api/proxy-handler

const API_BASE = 'https://api.monadmogs.xyz/api/v0';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // req.url = /api/proxy/v0/mogs/263
  // Strip /api/proxy/v0 → /mogs/263
  // Combined with API_BASE → https://api.monadmogs.xyz/api/v0/mogs/263 ✅
  const apiPath   = (req.url || '').replace(/^\/api\/proxy\/v0/, '').split('?')[0] || '/';
  const targetUrl = `${API_BASE}${apiPath}`;
  console.log('[proxy]', req.url, '→', targetUrl);

  try {
    const apiRes      = await fetch(targetUrl, {
      headers: { 'User-Agent': 'MogsCard/1.0', 'Accept': 'application/json, image/svg+xml, */*' },
    });
    const contentType = apiRes.headers.get('content-type') || 'application/json';
    const body        = Buffer.from(await apiRes.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    return res.status(apiRes.status).send(body);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
