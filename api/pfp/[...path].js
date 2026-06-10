// api/pfp/[...path].js
// Vercel serverless function — proxies unavatar.io (follows redirects)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const username     = pathSegments.join('/');
  const targetUrl    = `https://unavatar.io/x/${username}`;

  try {
    const pfpRes      = await fetch(targetUrl, {
      headers: { 'User-Agent': 'MogsCard/1.0', 'Accept': 'image/*, */*' },
      redirect: 'follow',
    });
    const contentType = pfpRes.headers.get('content-type') || 'image/jpeg';
    const body        = Buffer.from(await pfpRes.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.status(pfpRes.status).send(body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
