/**
 * JCAHS — API Module
 * Punto central de acceso a todas las APIs via Cloudflare Worker
 */

'use strict';

var API_PROXY_BASE = 'https://jcahs-proxy.jh050447.workers.dev/?url=';
var API_WORKER     = 'https://jcahs-proxy.jh050447.workers.dev';

var API = {
  fetch: async function(url, opciones) {
    opciones = opciones || {};
    try {
      var res = await fetch(API_PROXY_BASE + encodeURIComponent(url), opciones);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    } catch(e) {
      console.error('API.fetch error:', e.message, url);
      return null;
    }
  },

  // ── Kraken ────────────────────────────────────────────
  krakenOHLC: async function(par, interval) {
    return this.fetch('https://api.kraken.com/0/public/OHLC?pair=' + par + '&interval=' + interval);
  },

  krakenPrice: async function(par) {
    return this.fetch('https://api.kraken.com/0/public/Ticker?pair=' + par);
  },

  // ── OKX ───────────────────────────────────────────────
  okxCandles: async function(instId, bar, before) {
    var url = 'https://www.okx.com/api/v5/market/history-candles?instId=' + instId + '&bar=' + bar + '&limit=300';
    if (before) url += '&before=' + before;
    return this.fetch(url);
  },

  // ── Finnhub ───────────────────────────────────────────
  finnhubNews: async function(categoria) {
    categoria = categoria || 'crypto';
    return this.fetch('https://finnhub.io/api/v1/news?category=' + categoria);
  },

  // ── Alternative.me ────────────────────────────────────
  fearGreed: async function() {
    return this.fetch('https://api.alternative.me/fng/?limit=1');
  },

  // ── Alpha Vantage macro ───────────────────────────────
  alphaMacro: async function(symbol, apiKey) {
    return this.fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + symbol + '&apikey=' + apiKey);
  },

  // ── Telegram (directo, sin proxy) ─────────────────────
  telegram: async function(token, chatId, mensaje) {
    try {
      var r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
      });
      return r.json();
    } catch(e) {
      console.error('API.telegram error:', e.message);
      return null;
    }
  },

  // ── Worker Telegram (vía proxy, sin exponer token) ────
  telegramProxy: async function(chatId, texto) {
    var url = API_WORKER + '/?telegram=1&chat_id=' + encodeURIComponent(chatId) +
              '&text=' + encodeURIComponent(texto);
    try {
      var r = await fetch(url);
      return r.json();
    } catch(e) {
      console.error('API.telegramProxy error:', e.message);
      return null;
    }
  },
};
