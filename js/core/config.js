/**
 * JCAHS — Config Module
 * Constantes globales del sistema
 * Nombre CONFIG (no PROXY, no CFG) para evitar conflicto con:
 *   - crypto.html: const PROXY = '...'
 *   - index.html:  const CFG = {...}
 */

'use strict';

const CONFIG = {
  // ─── Worker / Proxy ────────────────────────────────────────
  PROXY_URL:   'https://jcahs-proxy.jh050447.workers.dev/?url=',
  WORKER_URL:  'https://jcahs-proxy.jh050447.workers.dev',

  // ─── Telegram ──────────────────────────────────────────────
  TELEGRAM_CHAT_ID: '1519036308',

  // ─── Capital inicial ───────────────────────────────────────
  CAPITAL_INICIAL:  1000,
  BANKROLL_INICIAL:  200,
  KELLY_FRACCION:   0.25,

  // ─── Crypto — tokens monitoreados ─────────────────────────
  TOKENS: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK'],

  // ─── Crypto — pares Kraken ────────────────────────────────
  KRAKEN_PAIRS: {
    BTC:  'XBTUSD',
    ETH:  'ETHUSD',
    SOL:  'SOLUSD',
    XRP:  'XXRPZUSD',
    ADA:  'ADAUSD',
    AVAX: 'AVAXUSD',
    DOT:  'DOTUSD',
    LINK: 'LINKUSD'
  },

  // ─── Crypto — pares OKX ───────────────────────────────────
  OKX_PAIRS: {
    BTC:  'BTC-USDT',
    ETH:  'ETH-USDT',
    SOL:  'SOL-USDT',
    XRP:  'XRP-USDT',
    ADA:  'ADA-USDT',
    AVAX: 'AVAX-USDT',
    DOT:  'DOT-USDT',
    LINK: 'LINK-USDT'
  },

  // ─── Backtesting ──────────────────────────────────────────
  BACKTEST_SCORE_THRESHOLD: { '1h': 65, '4h': 70, '1d': 40 },
  BACKTEST_MAX_REQUESTS:     20,
  BACKTEST_VELAS_POR_REQUEST: 300,
  ATR_SL:  1.5,
  ATR_TP1: 2.0,
  ATR_TP2: 3.0,

  // ─── Cache durations (ms) ─────────────────────────────────
  CACHE: {
    COINGECKO:   3  * 60 * 60 * 1000,
    MACRO:       24 * 60 * 60 * 1000,
    NOTICIAS:    3  * 60 * 60 * 1000,
    FEAR_GREED:  15 * 60 * 1000
  },

  // ─── Score umbrales crypto ────────────────────────────────
  SCORE_COMPRAR: 70,
  SCORE_ESPERAR: 50,

  // ─── Ligas prioritarias apuestas ─────────────────────────
  LIGAS_PRIORITARIAS: [
    'Kolmonen', 'USL League Two', 'OÖ Liga',
    'NPSL', 'Brasileiro Serie D', 'FIFA World Cup'
  ]
};
