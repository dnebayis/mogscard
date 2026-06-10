// api/proxy/[...path].js
// Vercel serverless function — proxies api.monadmogs.xyz (CORS bypass)

const API_BASE = 'https://api.monadmogs.xyz/api/v0';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const apiPath      = '/' + pathSegments.join('/');
  const targetUrl    = `${API_BASE}${apiPath}`;

  try {
    const apiRes      = await fetch(targetUrl, {
      headers: { 'User-Agent': 'MogsCard/1.0', 'Accept': 'application/json, image/svg+xml, */*' },
    });
    const contentType = apiRes.headers.get('content-type') || 'application/json';
    const body        = Buffer.from(await apiRes.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.status(apiRes.status).send(body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
