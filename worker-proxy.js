/**
 * JCAHS Proxy Worker
 * Cloudflare Worker — generic HTTP proxy with CORS headers.
 *
 * Usage:
 *   /?url=https://api.example.com/data             (generic proxy)
 *   /?url=...&provider=yahoo                        (Yahoo with browser headers)
 *   /?url=...&api=sportsapi                         (API-Sports: injects x-apisports-key header)
 *   /?url=...&api=footballdata                      (Football-Data.org: injects X-Auth-Token header)
 *   /?url=...&api=owm                               (OpenWeatherMap: injects appid query param)
 *   /?url=...&api=odds                              (The Odds API: injects apiKey query param)
 *   /?url=...&api=gemini                            (Gemini: injects key query param)
 *   /?url=...&api=groq                              (Groq: injects Authorization: Bearer header)
 *   /?url=...&api=tavily                            (Tavily: injects Authorization: Bearer header)
 *   /?url=...&api=oddspapi                          (OddsPapi: injects apiKey query param)
 *   /?url=...&api=oddsapio                          (odds-api.io: injects apiKey query param)
 *   /?url=...&api=rapidapi&host=...                 (RapidAPI: injects X-RapidAPI-Key/X-RapidAPI-Host headers)
 *
 * All sensitive API keys live here as Cloudflare Worker env vars (secrets).
 * Fallback values are kept for local `wrangler dev` only — rotate these after
 * they were exposed in git history.
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

    // Keys resolved from Cloudflare env secrets (set via wrangler secret put)
    const OWM_KEY       = env.OWM_KEY       || '49d3ba9ad419cb6b820cb5b348efa66e';
    const ODDS_KEY      = env.ODDS_KEY      || '80e2cc925122c3aec2b46ba756ad0df1';
    const APISPORTS_KEY = env.APISPORTS_KEY || '9718242f5c1a4e31e5a14622569d087c';
    const FD_KEY        = env.FD_KEY        || 'b153b71ca08f4ae8bfe48f8f85f79014';
    const GEMINI_KEY    = env.GEMINI_KEY    || '';
    const GROQ_KEY      = env.GROQ_KEY      || '';
    const TAVILY_KEY    = env.TAVILY_KEY    || '';
    const ODDSPAPI_KEY  = env.ODDSPAPI_KEY  || '';
    const ODDS_API_IO_KEY = env.ODDS_API_IO_KEY || '';
    const RAPIDAPI_KEY  = env.RAPIDAPI_KEY  || '';

    const url = new URL(request.url);
    const target   = url.searchParams.get('url');
    const provider = url.searchParams.get('provider') || '';
    const api      = url.searchParams.get('api') || '';

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let targetUrl;
    let targetUrlObj;
    try {
      targetUrl = decodeURIComponent(target);
      targetUrlObj = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Inject query-param keys before building headers
    if (api === 'owm') {
      targetUrlObj.searchParams.set('appid', OWM_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'odds') {
      targetUrlObj.searchParams.set('apiKey', ODDS_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'gemini') {
      targetUrlObj.searchParams.set('key', GEMINI_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'oddspapi') {
      targetUrlObj.searchParams.set('apiKey', ODDSPAPI_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'oddsapio') {
      targetUrlObj.searchParams.set('apiKey', ODDS_API_IO_KEY);
      targetUrl = targetUrlObj.toString();
    }
    // Build request headers
    const reqHeaders = {};

    if (provider === 'yahoo') {
      Object.assign(reqHeaders, YAHOO_HEADERS);
    } else if (api === 'oddspapi') {
      // OddsPapi (Cloudflare-fronted) bloquea peticiones que aparentan ser
      // un navegador real desde un Worker — no spoofear UA de Chrome.
      reqHeaders['Accept'] = 'application/json';
    } else {
      reqHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      reqHeaders['Accept'] = 'application/json, text/plain, */*';
      reqHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    }

    if (api === 'sportsapi') {
      reqHeaders['x-apisports-key'] = APISPORTS_KEY;
    }
    if (api === 'footballdata') {
      reqHeaders['X-Auth-Token'] = FD_KEY;
    }
    if (api === 'groq') {
      reqHeaders['Authorization'] = 'Bearer ' + GROQ_KEY;
    }
    if (api === 'tavily') {
      reqHeaders['Authorization'] = 'Bearer ' + TAVILY_KEY;
    }
    if (api === 'rapidapi') {
      reqHeaders['X-RapidAPI-Key'] = RAPIDAPI_KEY;
      reqHeaders['X-RapidAPI-Host'] = url.searchParams.get('host') || '';
    }

    // Forward original Accept-Encoding if present
    const origAcceptEnc = request.headers.get('Accept-Encoding');
    if (origAcceptEnc) {
      reqHeaders['Accept-Encoding'] = origAcceptEnc;
    }

    try {
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const response = await fetch(targetUrl, {
        method:  request.method,
        headers: reqHeaders,
        body:    hasBody ? request.body : undefined,
        cf: { cacheTtl: 0, cacheEverything: false },
      });

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
