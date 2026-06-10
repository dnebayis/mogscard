// api/pfp-handler.js
// Vercel serverless — proxies unavatar.io PFP images (follows redirects)
// vercel.json rewrites: /api/pfp/(.*) → /api/pfp-handler

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // req.url = /api/pfp/monadmogs  →  strip /api/pfp/  →  monadmogs
  const username  = (req.url || '').replace(/^\/api\/pfp\//, '').split('?')[0] || '';
  const targetUrl = `https://unavatar.io/x/${username}`;
  console.log('[pfp]', req.url, '→', targetUrl);

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
