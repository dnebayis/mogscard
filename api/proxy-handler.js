// api/proxy-handler.js
// Vercel serverless — proxies https://api.monadmogs.xyz (CORS bypass)
// Matched via vercel.json rewrite: /api/proxy/(.*) → here
// req.url will be /api/proxy-handler (original path lost), so we use x-original-url or reconstruct

const API_BASE = 'https://api.monadmogs.xyz/api/v0';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // In Vercel, req.url contains the full original path even after rewrites
  // e.g. /api/proxy/v0/mogs/263  →  strip /api/proxy  →  /v0/mogs/263
  const reqUrl   = req.url || '';
  const username  = reqUrl.replace(/^\/api\/pfp\//, '').split('?')[0] || '';
  const targetUrl = `https://unavatar.io/x/${username}`;
  console.log('[pfp] req.url:', reqUrl, '→', targetUrl);
  console.log('[proxy] req.url:', reqUrl, '→', targetUrl);

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
