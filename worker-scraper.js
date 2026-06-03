/**
 * JCAHS Scraper Worker
 * Cloudflare Worker — fetches crypto news from CoinDesk and CoinTelegraph,
 * stores results in KV, serves as JSON with CORS headers.
 * Scheduled: every 30 minutes via cron trigger.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

// ── Entry point ──────────────────────────────────────────────────────────────

export default {
  /** HTTP handler — serves cached news or triggers a manual refresh */
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // /refresh  →  force a new scrape and store, then return the result
    if (url.pathname === '/refresh') {
      const data = await scrapeAndStore(env);
      return jsonResponse(data);
    }

    // /  →  serve whatever is currently in KV
    try {
      const cached = await env.JCAHS_NEWS.get('latest', { type: 'json' });
      if (cached) return jsonResponse(cached);

      // Nothing cached yet — scrape on demand and cache
      ctx.waitUntil(scrapeAndStore(env));
      return jsonResponse({ articles: [], lastUpdated: null, status: 'Scraping in progress — try again in 15 s' });
    } catch (err) {
      return jsonResponse({ error: err.message, articles: [] }, 500);
    }
  },

  /** Scheduled handler — cron fires every 30 minutes */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scrapeAndStore(env));
  },
};

// ── Orchestrator ─────────────────────────────────────────────────────────────

async function scrapeAndStore(env) {
  const [cdResult, ctResult] = await Promise.allSettled([
    scrapeCoindeskNews(),
    scrapeCointelegraphNews(),
  ]);

  const articles = [
    ...(cdResult.status === 'fulfilled' ? cdResult.value : []),
    ...(ctResult.status === 'fulfilled' ? ctResult.value : []),
  ];

  const errors = [
    cdResult.status === 'rejected' ? `CoinDesk: ${cdResult.reason?.message}` : null,
    ctResult.status === 'rejected' ? `CoinTelegraph: ${ctResult.reason?.message}` : null,
  ].filter(Boolean);

  const payload = {
    articles,
    count: articles.length,
    lastUpdated: new Date().toISOString(),
    ...(errors.length && { errors }),
  };

  // Store with a 2-hour TTL as safety net (cron replaces it every 30 min)
  await env.JCAHS_NEWS.put('latest', JSON.stringify(payload), {
    expirationTtl: 7200,
  });

  return payload;
}

// ── Site-specific scrapers ────────────────────────────────────────────────────

async function scrapeCoindeskNews() {
  // CoinDesk article links live inside <h2> and <h3> headings on the homepage
  const selectors = ['h2 a', 'h3 a', '.article-cardstyles__Title a', '.card-title a'];
  return scrapeNews('https://www.coindesk.com', selectors, 'https://www.coindesk.com', 5);
}

async function scrapeCointelegraphNews() {
  const selectors = ['.post-card__title-link', 'h2 a', 'h3 a', '.posts-listing__item a'];
  return scrapeNews('https://cointelegraph.com', selectors, 'https://cointelegraph.com', 5);
}

// ── Generic HTMLRewriter scraper ──────────────────────────────────────────────

/**
 * Fetches `siteUrl` and uses HTMLRewriter to collect up to `limit` article
 * links matching any of the given CSS `selectors`.
 */
async function scrapeNews(siteUrl, selectors, baseUrl, limit) {
  const response = await fetch(siteUrl, {
    headers: FETCH_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${siteUrl}`);
  }

  const collector = new ArticleCollector(baseUrl, limit);
  const rewriter = new HTMLRewriter();

  for (const selector of selectors) {
    rewriter.on(selector.trim(), collector);
  }

  // Consume the transformed stream — this is what triggers the handlers
  await rewriter.transform(response).arrayBuffer();

  return collector.articles;
}

// ── HTMLRewriter element handler ──────────────────────────────────────────────

class ArticleCollector {
  constructor(baseUrl, limit) {
    this.baseUrl = baseUrl;
    this.limit = limit;
    this.articles = [];
    this._href = null;
    this._title = '';
    this._active = false;
  }

  element(el) {
    if (this.articles.length >= this.limit) return;

    const href = el.getAttribute('href');
    if (!href) { this._active = false; return; }

    const url = href.startsWith('http') ? href : this.baseUrl + href;

    if (this._isArticleUrl(url)) {
      this._href = url;
      this._title = '';
      this._active = true;
    } else {
      this._active = false;
    }
  }

  text(chunk) {
    if (!this._active || this.articles.length >= this.limit) return;

    this._title += chunk.text;

    if (chunk.lastInTextNode) {
      const title = this._title.trim().replace(/\s+/g, ' ');

      const isDuplicate = this.articles.some(
        (a) => a.url === this._href || a.title === title
      );

      if (title.length >= 20 && !isDuplicate) {
        this.articles.push({
          title,
          url: this._href,
          source: this.baseUrl,
          // Detect sentiment keywords so the frontend can show alerts
          sentiment: detectSentiment(title),
          timestamp: new Date().toISOString(),
        });
      }

      this._active = false;
    }
  }

  /** Only follow paths that look like article permalinks */
  _isArticleUrl(url) {
    const keep = ['/news/', '/article/', '/markets/', '/tech/', '/business/',
                  '/policy/', '/2024/', '/2025/', '/2026/', '/bitcoin/',
                  '/ethereum/', '/crypto/'];
    const skip = ['#', '?', '/tag/', '/author/', '/category/', '/page/'];
    return keep.some((p) => url.includes(p)) && !skip.some((p) => url.includes(p));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a sentiment label for use by the JCAHS frontend alert system.
 * The frontend watches for 'bullish' | 'bearish' | 'breaking'.
 */
function detectSentiment(title) {
  const t = title.toLowerCase();
  if (/\b(surges?|rallies?|soars?|jumps?|moon|bull|bullish|ath|breaks? out)\b/.test(t)) return 'bullish';
  if (/\b(crash(es)?|drops?|falls?|plunges?|bear|bearish|dump|collapses?)\b/.test(t)) return 'bearish';
  if (/\bbreaking\b/.test(t)) return 'breaking';
  return 'neutral';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
