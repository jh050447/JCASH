/**
 * JCAHS — Crypto Indicators Module
 * Indicadores técnicos específicos de análisis crypto
 * Depende de: js/shared/math.js (calcRSI, calcRSIArray, calcEMAArray)
 * Depende de: STATE global (definido en crypto.html inline script)
 */

'use strict';

// ── ATR (Average True Range) ──────────────────────────────
// Retorna array corto (empieza desde period, no desde 0)
function calcATR(highs, lows, closes, period) {
  period = period || 14;
  const tr = [];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  if (tr.length < period) return tr.map(() => 0);
  const atrs = [];
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrs.push(atr);
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    atrs.push(atr);
  }
  return atrs;
}

// ── VOLUMEN VS PROMEDIO ───────────────────────────────────
function calcVolumeSignal(vols) {
  if (vols.length < 2) return { ratio: 1, alto: false };
  const recent = vols[vols.length - 1];
  const avg = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / Math.min(20, vols.length - 1);
  return { ratio: recent / avg, alto: recent > avg * 1.2 };
}

// ── DIVERGENCIA ALCISTA RSI ───────────────────────────────
// Precio mínimo más bajo + RSI mínimo más alto → vendedores agotados
function calcDivergenciaAlcista(sym, tf) {
  const candles = STATE.ohlc[sym]?.[tf] || [];
  const noDiv = { detectada: false };
  if (candles.length < 30) return noDiv;

  const closes = candles.map(k => k.c);
  const N = closes.length;
  const startPrev = N - 20, endPrev = N - 11;
  const startRec  = N - 10, endRec  = N - 1;
  if (startPrev < 0) return noDiv;

  let minRecIdx = startRec;
  for (let i = startRec + 1; i <= endRec; i++) {
    if (closes[i] < closes[minRecIdx]) minRecIdx = i;
  }
  let minPrevIdx = startPrev;
  for (let i = startPrev + 1; i <= endPrev; i++) {
    if (closes[i] < closes[minPrevIdx]) minPrevIdx = i;
  }

  const rsiRec  = calcRSI(closes.slice(0, minRecIdx + 1), 14);
  const rsiPrev = calcRSI(closes.slice(0, minPrevIdx + 1), 14);
  if (rsiRec === null || rsiPrev === null) return noDiv;

  if (closes[minRecIdx] < closes[minPrevIdx] &&
      rsiRec > rsiPrev &&
      rsiRec < 45 &&
      (rsiRec - rsiPrev) > 3) {
    return {
      detectada: true,
      rsi_anterior: rsiPrev,
      rsi_reciente: rsiRec,
      diferencia: rsiRec - rsiPrev,
      velas_atras: endRec - minRecIdx
    };
  }
  return noDiv;
}

// ── STOCHASTIC RSI ────────────────────────────────────────
function calcStochasticRSI(closes, rsiP, stochP, kS) {
  rsiP = rsiP || 14; stochP = stochP || 14; kS = kS || 3;
  if (closes.length < rsiP + stochP + kS * 2) return null;
  const rsiArr = calcRSIArray(closes, rsiP);

  const stochArr = [];
  for (let i = rsiP + stochP - 1; i < rsiArr.length; i++) {
    const win = rsiArr.slice(i - stochP + 1, i + 1).filter(v => v !== null);
    if (win.length < stochP) { stochArr.push(null); continue; }
    const mn = Math.min(...win), mx = Math.max(...win);
    stochArr.push(mx === mn ? 50 : (rsiArr[i] - mn) / (mx - mn) * 100);
  }

  const kArr = [];
  for (let i = kS - 1; i < stochArr.length; i++) {
    const win = stochArr.slice(i - kS + 1, i + 1).filter(v => v !== null);
    kArr.push(win.length >= kS ? win.reduce((a, b) => a + b, 0) / kS : null);
  }
  const dArr = [];
  for (let i = kS - 1; i < kArr.length; i++) {
    const win = kArr.slice(i - kS + 1, i + 1).filter(v => v !== null);
    dArr.push(win.length >= kS ? win.reduce((a, b) => a + b, 0) / kS : null);
  }

  const kValid = kArr.filter(v => v !== null);
  const dValid = dArr.filter(v => v !== null);
  const k = kValid[kValid.length - 1];
  const d = dValid[dValid.length - 1];
  const prevK = kValid[kValid.length - 2];
  const prevD = dValid[dValid.length - 2];
  if (k == null || d == null) return null;

  const cruceSobreD = prevK != null && prevD != null && prevK < prevD && k > d && k < 20 && d < 20;
  const zona = k < 20 ? 'sobrevendido' : k > 80 ? 'sobrecomprado' : 'neutral';
  return { k, d, zona, cruceSobreD };
}

// ── SOPORTES Y RESISTENCIAS ───────────────────────────────
function calcSoportesResistencias(sym, tf) {
  const candles = (STATE.ohlc[sym]?.[tf] || []).slice(-200);
  const empty = { soportes: [], resistencias: [] };
  if (candles.length < 10) return empty;
  const N = candles.length;
  const pivLow = [], pivHigh = [];

  const lastClose = candles.length > 0 ? candles[candles.length - 1].c : 1;
  const agrupPct = lastClose > 1 ? 0.015 : lastClose > 0.1 ? 0.003 : lastClose > 0.01 ? 0.001 : 0.0005;
  const minPrecioValido = lastClose * 0.01;

  for (let i = 2; i < N - 2; i++) {
    const lo = candles[i].l;
    if (lo > 0 && lo < candles[i-1].l && lo < candles[i-2].l && lo < candles[i+1].l && lo < candles[i+2].l) pivLow.push(lo);
    const hi = candles[i].h;
    if (hi > 0 && hi > candles[i-1].h && hi > candles[i-2].h && hi > candles[i+1].h && hi > candles[i+2].h) pivHigh.push(hi);
  }

  function agrupar(pivots, tipo) {
    const sorted = [...pivots].sort((a, b) => a - b);
    const zonas = [];
    sorted.forEach(p => {
      if (p <= 0) return;
      const ex = zonas.find(z => z.precio > 0 && Math.abs(z.precio - p) / z.precio < agrupPct);
      if (ex) { ex.toques++; ex.precio = (ex.precio * (ex.toques - 1) + p) / ex.toques; }
      else zonas.push({ precio: p, toques: 1, tipo });
    });
    return zonas
      .filter(z => z.precio > minPrecioValido)
      .sort((a, b) => b.toques - a.toques)
      .slice(0, 3);
  }

  return { soportes: agrupar(pivLow, 'soporte'), resistencias: agrupar(pivHigh, 'resistencia') };
}

// ── CRUCE EMA RECIENTE ────────────────────────────────────
function detectarCruceEMAReciente(sym) {
  const k1d = STATE.ohlc[sym]?.['1d'] || [];
  if (k1d.length < 55) return null;
  const closes = k1d.map(k => k.c);
  const ema20arr = calcEMAArray(closes, 20);
  const ema50arr = calcEMAArray(closes, 50);
  const n = closes.length;
  for (let i = n - 1; i >= Math.max(1, n - 3); i--) {
    const p20 = ema20arr[i - 1], p50 = ema50arr[i - 1];
    const c20 = ema20arr[i],     c50 = ema50arr[i];
    if (p20 !== null && p50 !== null && c20 !== null && c50 !== null) {
      if (p20 <= p50 && c20 > c50) {
        return { sym, ema20: c20, ema50: c50, velasAtras: n - 1 - i, horasAtras: (n - 1 - i) * 24 };
      }
    }
  }
  return null;
}
