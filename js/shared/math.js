/**
 * JCAHS — Shared Math Module
 * Funciones matemáticas puras compartidas entre todos los módulos
 * Sin dependencias externas, sin UI, sin side effects
 *
 * NOTA: fmtPrecio y fmtPct NO están aquí — dependen de fmt() local de crypto.html
 */

'use strict';

// ─── KELLY ───────────────────────────────────────────────────────────────────

/**
 * Calcula el porcentaje óptimo de bankroll a apostar según Kelly
 * @param {number} prob - Probabilidad real de ganar (0-1)
 * @param {number} odd - Cuota decimal
 * @param {number} fraccion - Fracción de Kelly (default 0.25)
 * @returns {number} Fracción del bankroll (0-1), NO porcentaje
 */
function calcKelly(prob, odd, fraccion) {
  fraccion = fraccion !== undefined ? fraccion : 0.25;
  if (!prob || !odd || odd <= 1) return 0;
  var b = odd - 1;
  var k = (prob * b - (1 - prob)) / b;
  return Math.max(0, k * fraccion);
}

// ─── EDGE ────────────────────────────────────────────────────────────────────

/**
 * Calcula el edge (ventaja) sobre la casa
 * @param {number} prob - Probabilidad real (0-1)
 * @param {number} odd - Cuota decimal ofrecida
 * @returns {number} Edge en puntos porcentuales
 */
function calcEdge(prob, odd) {
  if (!odd || odd <= 1) return 0;
  var ip = 1 / odd;
  return (prob - ip) * 100;
}

/**
 * Elimina el margen de la casa (de-vig) para obtener probabilidades reales
 * @param {number} odd1 - Cuota opción 1
 * @param {number} odd2 - Cuota opción 2
 * @param {number} odd3 - Cuota opción 3 (empate, opcional)
 * @returns {number[]} Probabilidades reales sin margen
 */
function calcDeVig(odd1, odd2, odd3) {
  var probs = [1 / odd1, 1 / odd2];
  if (odd3) probs.push(1 / odd3);
  var suma = probs.reduce(function(a, b) { return a + b; }, 0);
  return probs.map(function(p) { return p / suma; });
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

/**
 * Calcula RSI con suavizado Wilder
 * @param {number[]} closes - Array de precios de cierre
 * @param {number} period - Período (default 14)
 * @returns {number|null} Valor RSI, o null si no hay datos suficientes
 */
function calcRSI(closes, period) {
  period = period || 14;
  if (!closes || closes.length < period + 1) return null;
  var gains = 0, losses = 0;
  for (var i = 1; i <= period; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  var avgG = gains / period;
  var avgL = losses / period;
  for (var j = period + 1; j < closes.length; j++) {
    var d = closes[j] - closes[j - 1];
    var g = d >= 0 ? d : 0;
    var l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
  }
  if (avgL === 0) return 100;
  return 100 - (100 / (1 + avgG / avgL));
}

/**
 * Calcula array histórico completo de RSI (para backtesting)
 * @param {number[]} closes - Array de precios de cierre
 * @param {number} period - Período (default 14)
 * @returns {Array<number|null>} Array de valores RSI (null donde no hay datos)
 */
function calcRSIArray(closes, period) {
  period = period || 14;
  var out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  var gains = 0, losses = 0;
  for (var i = 1; i <= period; i++) {
    var d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  var avgG = gains / period, avgL = losses / period;
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (var j = period + 1; j < closes.length; j++) {
    var dd = closes[j] - closes[j - 1];
    var gg = dd >= 0 ? dd : 0, ll = dd < 0 ? -dd : 0;
    avgG = (avgG * (period - 1) + gg) / period;
    avgL = (avgL * (period - 1) + ll) / period;
    out[j] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return out;
}

// ─── EMA ─────────────────────────────────────────────────────────────────────

/**
 * Calcula EMA actual
 * @param {number[]} closes - Array de precios
 * @param {number} period - Período
 * @returns {number|null} Valor EMA, o null si no hay datos suficientes
 */
function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  var k = 2 / (period + 1);
  var ema = closes.slice(0, period).reduce(function(a, b) { return a + b; }, 0) / period;
  for (var i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Calcula array histórico completo de EMA (para backtesting)
 * @param {number[]} closes - Array de precios
 * @param {number} period - Período
 * @returns {Array<number|null>} Array de valores EMA (null donde no hay datos)
 */
function calcEMAArray(closes, period) {
  if (!closes || closes.length < period) return [];
  var k = 2 / (period + 1);
  var ema = closes.slice(0, period).reduce(function(a, b) { return a + b; }, 0) / period;
  var result = new Array(period - 1).fill(null);
  result.push(ema);
  for (var i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ─── ATR ─────────────────────────────────────────────────────────────────────

/**
 * Calcula array de ATR (Average True Range) — Wilder smoothing
 * @param {number[]} highs - Array de máximos
 * @param {number[]} lows - Array de mínimos
 * @param {number[]} closes - Array de cierres
 * @param {number} period - Período (default 14)
 * @returns {Array<number|null>} Array de valores ATR (null donde no hay datos)
 */
function calcATRArray(highs, lows, closes, period) {
  period = period || 14;
  var result = new Array(closes.length).fill(null);
  var trs = [];
  for (var i = 1; i < closes.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  if (trs.length < period) return result;
  var atr = trs.slice(0, period).reduce(function(a, b) { return a + b; }, 0) / period;
  result[period] = atr;
  for (var j = period; j < trs.length; j++) {
    atr = (atr * (period - 1) + trs[j]) / period;
    result[j + 1] = atr;
  }
  return result;
}

// ─── MACD ────────────────────────────────────────────────────────────────────

/**
 * Calcula MACD con señal EMA9 y detección de cruces
 * @param {number[]} closes - Array de precios de cierre
 * @returns {object|null} { macd, signal, hist, cruce_alcista, cruce_bajista }
 */
function calcMACD(closes) {
  if (!closes || closes.length < 35) return null;
  var ema12arr = calcEMAArray(closes, 12);
  var ema26arr = calcEMAArray(closes, 26);
  var macdLine = ema12arr.map(function(v, i) {
    if (v === null || ema26arr[i] === null) return null;
    return v - ema26arr[i];
  });
  var macdValid = macdLine.filter(function(v) { return v !== null; });
  if (macdValid.length < 9) return null;
  var signal = calcEMA(macdValid, 9);
  var lastMACD = macdValid[macdValid.length - 1];
  var prevMACD = macdValid[macdValid.length - 2];
  var prevSignal = calcEMA(macdValid.slice(0, -1), 9);
  return {
    macd: lastMACD,
    signal: signal,
    hist: lastMACD - signal,
    cruce_alcista: prevMACD !== null && prevSignal !== null && prevMACD < prevSignal && lastMACD > signal,
    cruce_bajista: prevMACD !== null && prevSignal !== null && prevMACD > prevSignal && lastMACD < signal
  };
}

// ─── BOLLINGER BANDS ─────────────────────────────────────────────────────────

/**
 * Calcula Bandas de Bollinger
 * @param {number[]} closes - Array de precios
 * @param {number} period - Período (default 20)
 * @param {number} mult - Multiplicador de desviación estándar (default 2)
 * @returns {object|null} { superior, media, inferior, ancho, posicion }
 */
function calcBollingerBands(closes, period, mult) {
  period = period || 20; mult = mult !== undefined ? mult : 2;
  if (!closes || closes.length < period) return null;
  var slice = closes.slice(-period);
  var media = slice.reduce(function(a, b) { return a + b; }, 0) / period;
  var std = Math.sqrt(slice.reduce(function(s, v) { return s + (v - media) * (v - media); }, 0) / period);
  var superior = media + mult * std;
  var inferior = media - mult * std;
  var precio = closes[closes.length - 1];
  var posicion;
  if (precio <= inferior * 1.005) posicion = 'inferior';
  else if (precio >= superior * 0.995) posicion = 'superior';
  else posicion = 'medio';
  return { superior: superior, media: media, inferior: inferior, ancho: (superior - inferior) / media, posicion: posicion };
}

// ─── ESCAPE HTML ─────────────────────────────────────────────────────────────

/**
 * Escapa HTML para prevenir XSS
 * @param {*} str - Valor a escapar
 * @returns {string} HTML escapado
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
