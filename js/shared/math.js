/**
 * JCAHS — Shared Math Module
 * Funciones matemáticas puras compartidas entre todos los módulos
 * Sin dependencias externas, sin UI, sin side effects
 */

'use strict';

// ─── KELLY ───────────────────────────────────────────────────────────────────

/**
 * Calcula el porcentaje óptimo de bankroll a apostar según Kelly
 * @param {number} prob - Probabilidad real de ganar (0-1)
 * @param {number} odd - Cuota decimal
 * @param {number} fraccion - Fracción de Kelly (default 0.25 = Kelly fraccionado)
 * @returns {number} Porcentaje del bankroll a apostar
 */
function calcKelly(prob, odd, fraccion) {
  fraccion = fraccion !== undefined ? fraccion : 0.25;
  if (!prob || !odd || odd <= 1) return 0;
  var b = odd - 1;
  var q = 1 - prob;
  var kelly = (b * prob - q) / b;
  return Math.max(0, kelly * fraccion * 100);
}

// ─── EDGE ────────────────────────────────────────────────────────────────────

/**
 * Calcula el edge (ventaja) sobre la casa
 * @param {number} probReal - Probabilidad real del sistema (0-1)
 * @param {number} odd - Cuota decimal ofrecida
 * @returns {number} Edge en porcentaje
 */
function calcEdge(probReal, odd) {
  if (!probReal || !odd) return 0;
  var probImplicita = 1 / odd;
  return ((probReal - probImplicita) / probImplicita) * 100;
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
 * Calcula RSI usando suavizado Wilder
 * @param {number[]} closes - Array de precios de cierre
 * @param {number} period - Período (default 14)
 * @returns {number} Valor RSI actual
 */
function calcRSI(closes, period) {
  period = period || 14;
  if (!closes || closes.length < period + 1) return 50;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  var avgGain = gains / period;
  var avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  var rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calcula array histórico completo de RSI (para backtesting)
 * @param {number[]} closes - Array de precios de cierre
 * @param {number} period - Período (default 14)
 * @returns {number[]} Array de valores RSI
 */
function calcRSIArray(closes, period) {
  period = period || 14;
  var result = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;
  var gains = 0, losses = 0;
  for (var i = 1; i <= period; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  var avgGain = gains / period;
  var avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (var j = period + 1; j < closes.length; j++) {
    var d = closes[j] - closes[j - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result[j] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// ─── EMA ─────────────────────────────────────────────────────────────────────

/**
 * Calcula EMA actual
 * @param {number[]} closes - Array de precios
 * @param {number} period - Período
 * @returns {number} Valor EMA actual
 */
function calcEMA(closes, period) {
  if (!closes || closes.length < period) return closes ? closes[closes.length - 1] || 0 : 0;
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
 * @returns {number[]} Array de valores EMA
 */
function calcEMAArray(closes, period) {
  var result = new Array(closes.length).fill(null);
  var k = 2 / (period + 1);
  var ema = closes.slice(0, period).reduce(function(a, b) { return a + b; }, 0) / period;
  result[period - 1] = ema;
  for (var i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

// ─── ATR ─────────────────────────────────────────────────────────────────────

/**
 * Calcula ATR histórico completo (para SL/TP dinámicos)
 * @param {number[]} highs - Array de máximos
 * @param {number[]} lows - Array de mínimos
 * @param {number[]} closes - Array de cierres
 * @param {number} period - Período (default 14)
 * @returns {number[]} Array de valores ATR
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
 * Calcula MACD (EMA12 - EMA26) con línea de señal EMA9
 * @param {number[]} closes - Array de precios de cierre
 * @returns {object} { macd, signal, histogram }
 */
function calcMACD(closes) {
  if (!closes || closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  var ema12 = calcEMA(closes, 12);
  var ema26 = calcEMA(closes, 26);
  var macdLine = ema12 - ema26;
  var macdValues = [];
  for (var i = 0; i < 9; i++) {
    var slice = closes.slice(0, closes.length - 9 + i + 1);
    macdValues.push(calcEMA(slice, 12) - calcEMA(slice, 26));
  }
  var signal = macdValues.reduce(function(a, b) { return a + b; }, 0) / 9;
  return {
    macd: macdLine,
    signal: signal,
    histogram: macdLine - signal
  };
}

// ─── BOLLINGER BANDS ─────────────────────────────────────────────────────────

/**
 * Calcula Bandas de Bollinger
 * @param {number[]} closes - Array de precios
 * @param {number} period - Período (default 20)
 * @param {number} stdDev - Desviaciones estándar (default 2)
 * @returns {object} { upper, middle, lower }
 */
function calcBollingerBands(closes, period, stdDev) {
  period = period || 20;
  stdDev = stdDev !== undefined ? stdDev : 2;
  if (!closes || closes.length < period) return { upper: 0, middle: 0, lower: 0 };
  var slice = closes.slice(-period);
  var middle = slice.reduce(function(a, b) { return a + b; }, 0) / period;
  var variance = slice.reduce(function(a, b) { return a + (b - middle) * (b - middle); }, 0) / period;
  var std = Math.sqrt(variance);
  return {
    upper: middle + stdDev * std,
    middle: middle,
    lower: middle - stdDev * std
  };
}

// ─── FORMATO ─────────────────────────────────────────────────────────────────

/**
 * Formatea precio según magnitud
 * @param {number} precio - Precio a formatear
 * @returns {string} Precio formateado
 */
function fmtPrecio(precio) {
  if (!precio) return '—';
  if (precio >= 1000) return precio.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (precio >= 1) return precio.toFixed(4);
  if (precio >= 0.01) return precio.toFixed(6);
  return precio.toFixed(8);
}

/**
 * Formatea porcentaje con signo
 * @param {number} valor - Valor a formatear
 * @param {number} decimales - Decimales (default 1)
 * @returns {string} Porcentaje formateado
 */
function fmtPct(valor, decimales) {
  decimales = decimales !== undefined ? decimales : 1;
  if (valor == null) return '—';
  var signo = valor >= 0 ? '+' : '';
  return signo + valor.toFixed(decimales) + '%';
}

/**
 * Escapa HTML para prevenir XSS
 * @param {*} str - Valor a escapar
 * @returns {string} HTML escapado
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── EXPORTS (para cuando se migre a módulos ES6) ────────────────────────────
// Por ahora las funciones son globales para compatibilidad con el sistema actual
