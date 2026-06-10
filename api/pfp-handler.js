// api/pfp-handler.js
// Vercel serverless — proxies unavatar.io PFP images (CORS + redirect bypass)
// Matched via vercel.json rewrite: /api/pfp/(.*) → here

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const originalUrl = req.headers['x-original-url'] || req.url || '';
  const username    = originalUrl.replace(/^\/api\/pfp\//, '').split('?')[0] || '';
  const targetUrl   = `https://unavatar.io/x/${username}`;

  try {
    const pfpRes      = await fetch(targetUrl, {
      headers: { 'User-Agent': 'MogsCard/1.0', 'Accept': 'image/*, */*' },
      redirect: 'follow',
    });
    const contentType = pfpRes.headers.get('content-type') || 'image/jpeg';
    const body        = Buffer.from(await pfpRes.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    return res.status(pfpRes.status).send(body);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
