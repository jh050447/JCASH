/**
 * JCAHS Proxy Worker
 * Cloudflare Worker — generic HTTP proxy with CORS headers.
 * 
 * Usage:
 *   /?url=https://api.example.com/data       (generic proxy)
 *   /?url=https://query1.finance.yahoo.com/...&provider=yahoo  (Yahoo with browser headers)
 *
 * The provider=yahoo flag adds browser-like headers so Yahoo Finance
 * does not 500 the request.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
  'Cache-Control': 'no-cache',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    const provider = url.searchParams.get('provider') || '';

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let targetUrl;
    try {
      targetUrl = decodeURIComponent(target);
      new URL(targetUrl); // validate
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Build request headers
    const reqHeaders = {};

    if (provider === 'yahoo') {
      Object.assign(reqHeaders, YAHOO_HEADERS);
    } else {
      // Generic browser-ish headers
      reqHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      reqHeaders['Accept'] = 'application/json, text/plain, */*';
      reqHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    }

    // Forward original Accept-Encoding if present (for passthrough)
    const origAcceptEnc = request.headers.get('Accept-Encoding');
    if (origAcceptEnc) {
      reqHeaders['Accept-Encoding'] = origAcceptEnc;
    }

    try {
      const response = await fetch(targetUrl, {
        headers: reqHeaders,
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      // Read the body as text (handle both JSON and non-JSON responses)
      const body = await response.text();
      const contentType = response.headers.get('Content-Type') || 'application/json';

      const respHeaders = {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      };

      return new Response(body, {
        status: response.status,
        headers: respHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
