/**
 * Cloudflare Worker — MogsCard CORS Proxy
 *
 * Routes:
 *   /proxy/v0/*  → https://api.monadmogs.xyz/api/v0/*
 *   /pfp/*       → https://unavatar.io/x/*
 *
 * Deploy free at: https://workers.cloudflare.com
 */

const API_BASE  = 'https://api.monadmogs.xyz/api/v0';
const CORS_HDRS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HDRS });
    }

    // /proxy/v0/* → api.monadmogs.xyz/api/v0/*
    if (url.pathname.startsWith('/proxy/v0/')) {
      const apiPath    = url.pathname.replace('/proxy/v0', '');
      const targetUrl  = `${API_BASE}${apiPath}${url.search}`;

      const apiRes = await fetch(targetUrl, {
        headers: {
          'Accept':     'application/json, image/svg+xml, */*',
          'User-Agent': 'MogsCard/1.0',
        },
      });

      const body        = await apiRes.arrayBuffer();
      const contentType = apiRes.headers.get('Content-Type') || 'application/json';

      return new Response(body, {
        status:  apiRes.status,
        headers: { ...CORS_HDRS, 'Content-Type': contentType },
      });
    }

    // /pfp/{username} → unavatar.io/x/{username}
    if (url.pathname.startsWith('/pfp/')) {
      const username  = url.pathname.slice(5);
      const pfpTarget = `https://unavatar.io/x/${username}`;

      const pfpRes = await fetch(pfpTarget, {
        headers: { 'User-Agent': 'MogsCard/1.0' },
        redirect: 'follow',
      });

      const body        = await pfpRes.arrayBuffer();
      const contentType = pfpRes.headers.get('Content-Type') || 'image/jpeg';

      return new Response(body, {
        status:  pfpRes.status,
        headers: { ...CORS_HDRS, 'Content-Type': contentType },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
