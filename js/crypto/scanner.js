/**
 * JCAHS — Crypto Scanner Module
 * Scoring, analisis de operaciones y confluencia multi-timeframe
 * Depende de: js/shared/math.js, js/crypto/indicators.js
 * Globals de runtime: STATE, fmt (definidos en crypto.html inline script)
 */

'use strict';

// -- OPERACION (SL/TP calculo) -------------------------------------------
function calcOperacion(entrada, salida, stake, pos) {
  if (!entrada || !salida || !stake) return null;
  const variacion = (salida - entrada) / entrada;
  const pnl = pos === 'SHORT' ? -(stake * variacion) : (stake * variacion);
  return { variacion, pnl };
}

// -- SCORE PRINCIPAL (0-100) ----------------------------------------
function calcScore(sym) {
  const k4h = STATE.ohlc[sym]?.['4h'] || [];
  const k1d = STATE.ohlc[sym]?.['1d'] || [];
  const precio = STATE.precios[sym] || null;
  const fng = STATE.fng?.value || 50;

  if (k4h.length < 20) return null;

  const closes4h = k4h.map(k => k.c);
  const vols4h   = k4h.map(k => k.v);
  const closes1d = k1d.map(k => k.c);

  const rsi4h  = calcRSI(closes4h, 14);
  const macd4h = calcMACD(closes4h);
  const volSig = calcVolumeSignal(vols4h);

  const ema20_1d = closes1d.length >= 20 ? calcEMA(closes1d, 20) : null;
  const ema50_1d = closes1d.length >= 50 ? calcEMA(closes1d, 50) : null;
  const ema200_1d = closes1d.length >= 200 ? calcEMA(closes1d, 200) : null;

  let score = 0;
  const razones = [];
  const razonesFail = [];

  // RSI 4H
  if (rsi4h !== null) {
    if (rsi4h < 30) {
      score += 30;
      razones.push({ txt: 'RSI ' + fmt(rsi4h, 1) + ' — sobreventa extrema', key: 'rsi_sob' });
    } else if (rsi4h < 40) {
      score += 15;
      razones.push({ txt: 'RSI ' + fmt(rsi4h, 1) + ' — zona de acumulación', key: 'rsi_acc' });
    } else if (rsi4h > 70) {
      razonesFail.push('RSI ' + fmt(rsi4h, 1) + ' (sobrecompra)');
    } else {
      razonesFail.push('RSI ' + fmt(rsi4h, 1) + ' (neutral)');
    }
  }

  // MACD 4H
  if (macd4h) {
    if (macd4h.cruce_alcista) {
      score += 20;
      razones.push({ txt: 'MACD cruzando al alza', key: 'macd_up' });
    } else if (macd4h.macd > 0 && macd4h.hist > 0) {
      score += 10;
      razones.push({ txt: 'MACD positivo y subiendo', key: 'macd_pos' });
    } else if (macd4h.cruce_bajista) {
      razonesFail.push('MACD cruzando a la baja');
    } else if (macd4h.macd < 0) {
      razonesFail.push('MACD negativo');
    }
  }

  // EMA tendencia 1D
  if (ema20_1d !== null && ema50_1d !== null) {
    if (ema20_1d > ema50_1d) {
      score += 15;
      razones.push({ txt: 'EMA20 > EMA50 (tendencia alcista)', key: 'ema_bull' });
    } else {
      razonesFail.push('EMA20 < EMA50 (tendencia bajista)');
    }
  }

  // Volumen 4H
  if (volSig.alto) {
    score += 10;
    razones.push({ txt: 'Volumen ' + fmt(volSig.ratio, 1) + 'x sobre promedio', key: 'vol_alto' });
  } else {
    razonesFail.push('Volumen ' + fmt(volSig.ratio, 1) + 'x (normal/bajo)');
  }

  // Fear & Greed
  if (fng < 20) {
    score += 25;
    razones.push({ txt: 'Fear & Greed ' + fng + ' — miedo extremo', key: 'fng_ext' });
  } else if (fng < 30) {
    score += 15;
    razones.push({ txt: 'Fear & Greed ' + fng + ' — miedo alto', key: 'fng_miedo' });
  } else if (fng > 75) {
    razonesFail.push('F&G ' + fng + ' (codicia extrema)');
  } else {
    razonesFail.push('F&G ' + fng + ' (neutral)');
  }

  // Bollinger Bands 4H
  const bb4h = calcBollingerBands(closes4h, 20, 2);
  if (bb4h) {
    if (bb4h.posicion === 'inferior' && rsi4h !== null && rsi4h < 45) {
      score += 20;
      razones.push({ txt: 'Precio en banda inferior de Bollinger con RSI bajo — doble sobreventa', key: 'bb_inf' });
    } else if (bb4h.posicion === 'superior') {
      score -= 15;
      razonesFail.push('Banda superior de Bollinger (sobrecompra)');
    }
  }

  // Stochastic RSI 4H
  const stoch4h = calcStochasticRSI(closes4h);
  if (stoch4h) {
    if (stoch4h.cruceSobreD) {
      score += 25;
      razones.push({ txt: 'Stoch RSI: K cruza sobre D en zona sobrevendida (K=' + fmt(stoch4h.k,0) + ', D=' + fmt(stoch4h.d,0) + ')', key: 'stoch_cross' });
    } else if (stoch4h.zona === 'sobrevendido') {
      score += 15;
      razones.push({ txt: 'Stoch RSI sobrevendido (K=' + fmt(stoch4h.k,0) + ', D=' + fmt(stoch4h.d,0) + ')', key: 'stoch_sob' });
    } else if (stoch4h.zona === 'sobrecomprado') {
      score -= 10;
      razonesFail.push('Stoch RSI sobrecomprado (K=' + fmt(stoch4h.k,0) + ')');
    }
  }

  // Soportes y Resistencias 4H
  const sr = calcSoportesResistencias(sym, '4h');
  let nearSoporte = null, nearResist = null;
  if (precio) {
    nearSoporte = sr.soportes.find(s => Math.abs(precio - s.precio) / precio < 0.02 && s.toques >= 3) || null;
    nearResist  = sr.resistencias.find(r => Math.abs(precio - r.precio) / precio < 0.02) || null;
    if (nearSoporte) { score += 20; razones.push({ txt: 'Soporte fuerte cercano: $' + fmt(nearSoporte.precio, 0) + ' (' + nearSoporte.toques + ' toques)', key: 'soporte' }); }
    if (nearResist)  { score -= 10; razonesFail.push('Resistencia cercana: $' + fmt(nearResist.precio, 0) + ' (' + nearResist.toques + ' toques)'); }
  }

  // Divergencia alcista 4H (+25) y 1D (+35, más significativa)
  const div4h = calcDivergenciaAlcista(sym, '4h');
  const div1d = calcDivergenciaAlcista(sym, '1d');
  if (div4h.detectada) {
    score += 25;
    razones.unshift({ txt: '📐 Divergencia alcista 4H — precio hizo mínimo más bajo pero RSI subió de ' + fmt(div4h.rsi_anterior,1) + ' a ' + fmt(div4h.rsi_reciente,1) + ' (+' + fmt(div4h.diferencia,1) + ' pts). Los vendedores pierden fuerza.', key: 'div_4h' });
  }
  if (div1d.detectada) {
    score += 35;
    razones.unshift({ txt: '📐 Divergencia alcista DIARIA — señal más fuerte. Precio bajando pero RSI subiendo (' + fmt(div1d.rsi_anterior,1) + '→' + fmt(div1d.rsi_reciente,1) + '). Posible agotamiento bajista.', key: 'div_1d' });
  }

  score = Math.min(100, score);

  // BUG 2 FIX: penalización −25 si señal 4H es alcista pero tendencia 1D es bajista
  const tendenciaBajista = ema20_1d !== null && ema50_1d !== null && ema20_1d < ema50_1d;
  if (tendenciaBajista && score >= 60) {
    score -= 25;
    razonesFail.push('Conflicto de timeframes — señal 4H alcista vs tendencia 1D bajista (−25 pts)');
  }
  score = Math.max(0, score);

  // Señal
  let senal, senalClass;
  if (score >= 60) { senal = 'COMPRAR'; senalClass = 'badge-green'; }
  else if (score <= 25) { senal = 'VENDER'; senalClass = 'badge-red'; }
  else { senal = 'ESPERAR'; senalClass = 'badge-warn'; }

  // Color score
  let scoreColor;
  if (score >= 60) scoreColor = 'var(--tertiary)';
  else if (score >= 35) scoreColor = 'var(--warning)';
  else scoreColor = 'var(--error)';

  return {
    sym, score, senal, senalClass, scoreColor,
    rsi4h, macd4h, volSig, ema20_1d, ema50_1d, ema200_1d,
    precio, razones, razonesFail, div4h, div1d, bb4h, stoch4h, sr, nearSoporte, nearResist,
    tendenciaBajista,
    rsiColor: rsi4h < 30 ? 'var(--tertiary)' : rsi4h > 70 ? 'var(--error)' : 'var(--warning)'
  };
}

// -- RSI SEMANAL (para DCA) -----------------------------------------
function calcRsiSemanal(sym) {
  const k1d = STATE.ohlc[sym]?.['1d'] || [];
  if (k1d.length < 14 * 7) return null; // need ~14 weeks
  const weeklyCloses = [];
  for (let i = k1d.length - 1; i >= 0; i -= 7) weeklyCloses.unshift(k1d[i].c);
  if (weeklyCloses.length < 15) return null;
  return calcRSI(weeklyCloses, 14);
}

// -- ANALISIS DE CONFLUENCIA MULTI-TF --------------------------------
function analizarConfluencia(sym) {
  const resultado = {};
  for (const tf of ['1h', '4h', '1d']) {
    const velas = (STATE.ohlc[sym] || {})[tf];
    if (!velas || velas.length < 50) { resultado[tf] = { disponible: false }; continue; }
    const closes = velas.map(k => k.c);
    const highs  = velas.map(k => k.h);
    const lows   = velas.map(k => k.l);
    const vols   = velas.map(k => k.v);
    const rsiVal  = calcRSI(closes, 14);       // single value
    const ema20   = calcEMA(closes, 20);
    const ema50   = calcEMA(closes, 50);
    const macdD   = calcMACD(closes);           // { macd, signal, hist, ... }
    const bbD     = calcBollingerBands(closes, 20, 2); // { superior, media, inferior, ... }
    const volD    = calcVolumeSignal(vols);     // { ratio, alto }
    const atrArr  = calcATR(highs, lows, closes, 14);
    const atrVal  = atrArr[atrArr.length - 1];
    const precio  = closes[closes.length - 1];
    if (rsiVal === null || ema20 === null || ema50 === null) { resultado[tf] = { disponible: false }; continue; }

    let puntos = 0; const senales = [];
    if      (rsiVal < 30) { puntos += 3; senales.push('RSI sobreventa extrema'); }
    else if (rsiVal < 40) { puntos += 2; senales.push('RSI zona de compra'); }
    else if (rsiVal > 70) { puntos -= 3; senales.push('RSI sobrecompra'); }
    else if (rsiVal > 60) { puntos -= 1; senales.push('RSI elevado'); }

    if (ema20 > ema50) { puntos += 2; senales.push('Tendencia alcista'); }
    else               { puntos -= 2; senales.push('Tendencia bajista'); }

    if (macdD && macdD.hist > 0) { puntos += 2; senales.push('MACD positivo'); }
    else if (macdD)               { puntos -= 1; senales.push('MACD negativo'); }

    if (bbD) {
      if      (precio < bbD.inferior) { puntos += 2; senales.push('Bajo banda inferior BB'); }
      else if (precio > bbD.superior) { puntos -= 2; senales.push('Sobre banda superior BB'); }
    }
    if (volD.ratio > 1.5) { puntos += 1; senales.push('Volumen ' + volD.ratio.toFixed(1) + 'x'); }

    let direccion, color, emoji;
    if      (puntos >= 5)  { direccion = 'ALCISTA FUERTE'; color = '#00ff88'; emoji = '🟢'; }
    else if (puntos >= 2)  { direccion = 'ALCISTA';        color = '#00cc66'; emoji = '🟢'; }
    else if (puntos >= -1) { direccion = 'NEUTRAL';        color = '#f5a623'; emoji = '🟡'; }
    else if (puntos >= -4) { direccion = 'BAJISTA';        color = '#ff4444'; emoji = '🔴'; }
    else                   { direccion = 'BAJISTA FUERTE'; color = '#cc0000'; emoji = '🔴'; }

    resultado[tf] = {
      disponible: true, direccion, color, emoji, puntos, rsi: rsiVal,
      tendencia: ema20 > ema50 ? 'alcista' : 'bajista',
      macd: macdD?.hist > 0 ? 'positivo' : 'negativo',
      bb:   bbD ? (precio < bbD.inferior ? 'bajo' : precio > bbD.superior ? 'alto' : 'medio') : 'medio',
      volumen: volD.ratio, atr: atrVal, senales
    };
  }

  const disp     = Object.values(resultado).filter(r => r.disponible);
  const alcistas = disp.filter(r => r.puntos >= 2).length;
  const bajistas = disp.filter(r => r.puntos < -1).length;
  const total    = disp.length;

  let confluencia, confluenciaEmoji, confluenciaColor;
  if (total === 0)                           { confluencia = 'SIN DATOS';                   confluenciaEmoji = '⏳'; confluenciaColor = '#666';    }
  else if (alcistas === total && total >= 2) { confluencia = 'CONFLUENCIA TOTAL ALCISTA';   confluenciaEmoji = '🚀'; confluenciaColor = '#00ff88'; }
  else if (alcistas >= 2)                    { confluencia = 'CONFLUENCIA PARCIAL ALCISTA'; confluenciaEmoji = '✅'; confluenciaColor = '#00cc66'; }
  else if (bajistas === total && total >= 2) { confluencia = 'CONFLUENCIA TOTAL BAJISTA';   confluenciaEmoji = '⛔'; confluenciaColor = '#cc0000'; }
  else if (bajistas >= 2)                    { confluencia = 'CONFLUENCIA PARCIAL BAJISTA'; confluenciaEmoji = '⚠️'; confluenciaColor = '#ff4444'; }
  else                                       { confluencia = 'SIN CONFLUENCIA — MIXTO';     confluenciaEmoji = '⚡'; confluenciaColor = '#f5a623'; }

  return { ...resultado, confluencia, confluenciaEmoji, confluenciaColor, alcistas, bajistas, total };
}
