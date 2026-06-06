/**
 * _logica_valiosa.js — JCAHS v3.0
 * Lógica extraída de index.html antes del reset total.
 * Este archivo es referencia; la lógica se integra directamente en el nuevo index.html.
 *
 * Claves localStorage usadas en JCAHS:
 *   jcahs_ops        → operaciones guardadas (array JSON)
 *   jcahs_bankroll   → bankroll actual (número)
 *   jcahs_bk_*       → snapshots de bankroll por fecha
 *   jcahs_pnl_*      → PnL diario por fecha
 *   jcahs_modo       → 'principiante' | 'experto'
 *   jcahs_exchange   → 'binance' | 'bybit' | 'kucoin' | 'kraken'
 *   jcahs_sec        → sección activa del SPA
 */

// ─────────────────────────────────────────────────────────────
// 1. PROXY (Cloudflare Worker CORS)
// ─────────────────────────────────────────────────────────────
const PROXY = 'https://jcahs-proxy.jh050447.workers.dev/?url=';

function proxyUrl(url) {
  return PROXY + encodeURIComponent(url);
}

// Fetch con timeout
async function fetchSeguro(url, timeout = 8000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    return r;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. calcRSI — Wilder's smoothing RSI
// Fuente: extraído de index.html ~línea 6031
// ─────────────────────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  return al === 0 ? 100 : parseFloat((100 - 100 / (1 + ag / al)).toFixed(1));
}

// ─────────────────────────────────────────────────────────────
// 3. calcKelly — Quarter Kelly Criterion
// Fuente: extraído de index.html ~línea 7163 y 8187-8189
// ─────────────────────────────────────────────────────────────
/**
 * @param {number} prob  — probabilidad real estimada (0-1)
 * @param {number} odd   — odd decimal europea (ej: 1.85)
 * @param {number} fraccion — fracción de Kelly (default 0.25 = quarter-kelly)
 * @returns {number} fracción del bankroll a apostar (0-1)
 */
function calcKelly(prob, odd, fraccion = 0.25) {
  if (!prob || !odd || odd <= 1) return 0;
  const b = odd - 1;         // ganancia neta por unidad apostada
  const q = 1 - prob;        // probabilidad de perder
  const kelly = (prob * b - q) / b;
  return Math.max(0, kelly * fraccion);
}

// Variante usada en deportes (edge → kelly):
function calcKellyFromEdge(edge, odd) {
  // edge = myProb - impliedProb (en porcentaje, 0-100)
  // kelly full = (edge/100 * (odd-1) - (1 - edge/100)) / (odd-1)
  if (odd <= 1) return 0;
  const kellyFull = (edge / 100 * (odd - 1) - (1 - edge / 100)) / (odd - 1);
  return Math.max(0, kellyFull * 0.25);
}

// ─────────────────────────────────────────────────────────────
// 4. calcEdge — Value Bet Edge
// Fuente: extraído de index.html ~líneas 6121, 7127, 7162
// ─────────────────────────────────────────────────────────────
/**
 * Edge simple (calculadora value bet):
 * @param {number} prob  — probabilidad real estimada (0-1)
 * @param {number} odd   — odd decimal europea
 * @returns {number} edge en puntos porcentuales
 */
function calcEdge(prob, odd) {
  if (!odd || odd <= 1) return 0;
  const ip = 1 / odd;        // probabilidad implícita de la casa
  return (prob - ip) * 100;
}

/**
 * Edge desde The Odds API (comparando bookmakers):
 * Remueve el vig dividiendo por la suma de probabilidades implícitas.
 */
function calcEdgeOddsApi(oddsArray) {
  // oddsArray: [{ odd, bk }, ...]
  if (!oddsArray || oddsArray.length < 2) return null;
  const withIP   = oddsArray.map(o => ({ ...o, ip: 1 / o.odd }));
  const totalIP  = withIP.reduce((s, o) => s + o.ip, 0);
  const withReal = withIP.map(o => ({ ...o, real: o.ip / totalIP }));
  const best     = withReal.reduce((b, o) => o.odd > b.odd ? o : b);
  const edge     = (best.real - best.ip) * 100;
  return { best, edge };
}

// ─────────────────────────────────────────────────────────────
// 5. Motor de análisis 5 niveles (estructura de la ficha)
// Fuente: extraído de index.html ~líneas 9137-9265
// ─────────────────────────────────────────────────────────────
/**
 * La ficha de análisis tiene 5 niveles expandibles:
 *
 * N1 (fa-lvl1)       — Resumen: símbolo, badge, score, precio/entrada/SL/TP, botones expand
 * N2 (fa-level-panel) — Análisis técnico + sentimiento + capital management
 * N3 (fa-level-panel) — Educación (solo modo principiante)
 * N4 (fa-level-panel) — Cómo ejecutar (pasos por exchange)
 * N5 (fa-level-panel) — Monitoreo en vivo
 *
 * Sistema de scoring (total 100 puntos):
 *   TÉCNICO (60 pts):
 *     RSI multi-temporalidad:  20 pts
 *     MACD + Divergencias:     12 pts
 *     EMA 20/50/200:           10 pts
 *     Bandas de Bollinger:      8 pts
 *     Soporte/Resistencia:     10 pts
 *   SENTIMIENTO (40 pts):
 *     Fear & Greed:            20 pts
 *     Volumen Relativo:        15 pts
 *     Tendencia 24h:           10 pts
 *     Dominancia BTC:           5 pts
 *     Patrón velas:            10 pts  (clasificado en TÉCNICO)
 *
 * Señal final basada en score:
 *   80-100 → LONG FUERTE (color verde)
 *   65-79  → LONG          (color verde claro)
 *   50-64  → ESPERAR       (color amarillo)
 *   35-49  → SHORT         (color rojo claro)
 *   0-34   → SHORT FUERTE  (color rojo)
 *
 * Capital management (Kelly quarter):
 *   capitalSugerido = bankroll * calcKelly(prob/100, levEfectivo)
 *   riesgoMaximo    = capitalSugerido * slPct / 100
 *   ratioRB         = (tp1 - entrada) / (entrada - stopLoss)
 *   comisionTotal   = position * EXCHANGES_CONFIG[exchange][tipo] * 2  (open+close)
 */

// Función que genera el HTML de una fila de indicador (N2):
function generarFilaIndicador(nombre, score, maxScore, valor, explicacion) {
  const pct  = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
  const color = pct >= 70 ? 'var(--accent)' : pct >= 40 ? '#FBBF24' : 'var(--alert)';
  return `
    <div class="fa-ind-row">
      <div class="fa-ind-header">
        <span class="fa-ind-nombre">${nombre}</span>
        <span class="fa-ind-score" style="color:${color}">${score}/${maxScore}</span>
      </div>
      <div class="fa-ind-bar-track">
        <div class="fa-ind-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      ${valor ? `<div class="fa-ind-valor">${valor}</div>` : ''}
      ${explicacion ? `<div class="fa-ind-edu">${explicacion}</div>` : ''}
    </div>`;
}

// Etiqueta de score:
function obtenerEtiquetaScore(score) {
  if (score >= 80) return 'Señal MUY FUERTE';
  if (score >= 65) return 'Señal FUERTE';
  if (score >= 50) return 'Señal MODERADA';
  if (score >= 35) return 'Señal DÉBIL';
  return 'Sin señal clara';
}

// ─────────────────────────────────────────────────────────────
// 6. Waterfall de fuentes de precio crypto
// Fuente: patrón usado en index.html con PROXY
// ─────────────────────────────────────────────────────────────
/**
 * Fuentes en orden de prioridad:
 *   1. Binance /ticker/24hr (sin proxy, directo)
 *   2. Binance /ticker/24hr (vía proxy)
 *   3. CoinGecko simple/price (vía proxy)
 *
 * Para OHLC (RSI):
 *   1. Binance /klines (sin proxy)
 *   2. Binance /klines (vía proxy)
 *   3. CoinGecko /coins/{id}/ohlc (vía proxy)
 */
async function cargarPreciosBinance() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
  const base    = 'https://api.binance.com/api/v3/ticker/24hr';
  let data;

  // Intento 1: directo
  try {
    const r = await fetchSeguro(`${base}?symbols=${JSON.stringify(symbols)}`, 6000);
    if (r.ok) data = await r.json();
  } catch (_) {}

  // Intento 2: vía proxy
  if (!data) {
    try {
      const url = proxyUrl(`${base}?symbols=${JSON.stringify(symbols)}`);
      const r   = await fetchSeguro(url, 8000);
      if (r.ok) data = await r.json();
    } catch (_) {}
  }

  // Intento 3: CoinGecko vía proxy
  if (!data) {
    try {
      const cgUrl = proxyUrl('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true');
      const r     = await fetchSeguro(cgUrl, 8000);
      if (r.ok) {
        const cg = await r.json();
        return {
          BTC: { precio: cg.bitcoin?.usd, cambio24h: cg.bitcoin?.usd_24h_change, fuente: 'CoinGecko' },
          ETH: { precio: cg.ethereum?.usd, cambio24h: cg.ethereum?.usd_24h_change, fuente: 'CoinGecko' },
          SOL: { precio: cg.solana?.usd, cambio24h: cg.solana?.usd_24h_change, fuente: 'CoinGecko' },
          XRP: { precio: cg.ripple?.usd, cambio24h: cg.ripple?.usd_24h_change, fuente: 'CoinGecko' },
        };
      }
    } catch (_) {}
  }

  if (!data) return null;

  const map = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL', XRPUSDT: 'XRP' };
  const out = {};
  for (const item of data) {
    const sym = map[item.symbol];
    if (sym) out[sym] = {
      precio:   parseFloat(item.lastPrice),
      cambio24h: parseFloat(item.priceChangePercent),
      volumen:  parseFloat(item.quoteVolume),
      fuente:   'Binance',
    };
  }
  return out;
}

async function cargarOHLCBinance(symbol, interval = '1d', limit = 30) {
  // symbol = 'BTCUSDT' para Binance
  const base = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  let data;

  try {
    const r = await fetchSeguro(base, 6000);
    if (r.ok) data = await r.json();
  } catch (_) {}

  if (!data) {
    try {
      const r = await fetchSeguro(proxyUrl(base), 8000);
      if (r.ok) data = await r.json();
    } catch (_) {}
  }

  if (!data) return null;
  // Binance klines: [openTime, open, high, low, close, volume, ...]
  return data.map(k => ({
    t: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5]),
  }));
}

// ─────────────────────────────────────────────────────────────
// 7. Fear & Greed Index
// ─────────────────────────────────────────────────────────────
async function cargarFearGreed() {
  try {
    const r = await fetchSeguro(proxyUrl('https://api.alternative.me/fng/?limit=1'), 6000);
    if (!r.ok) return null;
    const d = await r.json();
    const v = parseInt(d?.data?.[0]?.value);
    return isNaN(v) ? null : v;
  } catch (_) { return null; }
}

// ─────────────────────────────────────────────────────────────
// 8. Señal crypto integrada (RSI + F&G + Kelly)
// ─────────────────────────────────────────────────────────────
/**
 * Genera señal para una cripto combinando:
 *   - RSI de cierre diario (Binance /klines 1d)
 *   - Fear & Greed Index
 *   - Quarter-Kelly sobre probabilidad estimada
 */
async function generarSenalCrypto(sym, bankroll = 200) {
  const binSym = sym + 'USDT';
  const klines  = await cargarOHLCBinance(binSym, '1d', 30);
  if (!klines) return null;

  const closes = klines.map(k => k.c);
  const rsi    = calcRSI(closes);
  const fng    = await cargarFearGreed();

  let señal = 'ESPERAR', prob = 0.5, confianza = 50;

  if (rsi !== null) {
    if      (rsi < 30) { señal = 'COMPRAR'; prob = 0.65; confianza = Math.round(60 + (30 - rsi) * 1.5); }
    else if (rsi > 70) { señal = 'VENDER';  prob = 0.35; confianza = Math.round(60 + (rsi - 70) * 1.5); }
    else                { señal = 'ESPERAR'; prob = 0.50; confianza = Math.round(50 + Math.abs(rsi - 50) * 0.4); }
  }

  // Ajuste por Fear & Greed
  if (fng !== null) {
    if (fng < 25 && señal === 'COMPRAR') confianza = Math.min(95, confianza + 8);
    if (fng > 75 && señal === 'VENDER')  confianza = Math.min(95, confianza + 8);
  }
  confianza = Math.min(95, confianza);

  const kellyFrac = calcKelly(prob, 1.85); // odd promedio referencia
  const stake     = bankroll * kellyFrac;

  return { sym, rsi, fng, señal, confianza, prob, kellyFrac, stake };
}

// ─────────────────────────────────────────────────────────────
// 9. localStorage helpers
// ─────────────────────────────────────────────────────────────
const LS = {
  KEYS: {
    ops:      'jcahs_ops',
    bankroll: 'jcahs_bankroll',
    modo:     'jcahs_modo',
    exchange: 'jcahs_exchange',
    sec:      'jcahs_sec',
  },
  get(key, def = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  getOps()      { return this.get(this.KEYS.ops, []); },
  setOps(ops)   { this.set(this.KEYS.ops, ops); },
  getBankroll()  { return parseFloat(localStorage.getItem(this.KEYS.bankroll)) || 200; },
  setBankroll(n) { localStorage.setItem(this.KEYS.bankroll, String(n)); },
  getModo()      { return localStorage.getItem(this.KEYS.modo) || 'principiante'; },
  setModo(m)     { localStorage.setItem(this.KEYS.modo, m); },
  getSec()       { return localStorage.getItem(this.KEYS.sec) || 'sec-panel'; },
  setSec(s)      { localStorage.setItem(this.KEYS.sec, s); },
};

// Snapshot bankroll por fecha (para historial de curva de capital):
function guardarSnapshotBankroll(bankroll) {
  const fecha = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  localStorage.setItem(`jcahs_bk_${fecha}`, String(bankroll));
}

function guardarPnlDiario(pnl) {
  const fecha = new Date().toISOString().split('T')[0];
  const prev  = parseFloat(localStorage.getItem(`jcahs_pnl_${fecha}`)) || 0;
  localStorage.setItem(`jcahs_pnl_${fecha}`, String(prev + pnl));
}

// ─────────────────────────────────────────────────────────────
// Exportar (para uso como módulo si se necesita)
// ─────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = {
    PROXY, proxyUrl, fetchSeguro,
    calcRSI, calcKelly, calcKellyFromEdge, calcEdge, calcEdgeOddsApi,
    generarFilaIndicador, obtenerEtiquetaScore,
    cargarPreciosBinance, cargarOHLCBinance, cargarFearGreed, generarSenalCrypto,
    LS, guardarSnapshotBankroll, guardarPnlDiario,
  };
}
