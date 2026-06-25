/**
 * JCAHS — Crypto Backtesting Module
 * Motor de backtesting sobre velas reales, estadísticas y storytelling
 * Depende de: js/shared/math.js, STATE global, COIN_COLOR global, PROXY global
 * (todos definidos en crypto.html inline script, disponibles en runtime)
 */

'use strict';

// ── CARGA HISTÓRICO OKX ──────────────────────────────────
async function cargarHistorialOKX(sym, tf, añosAtras) {
  añosAtras = añosAtras || 3;
  const OKX_SYMBOLS = { BTC:'BTC-USDT', ETH:'ETH-USDT', SOL:'SOL-USDT', XRP:'XRP-USDT', ADA:'ADA-USDT', AVAX:'AVAX-USDT', DOT:'DOT-USDT', LINK:'LINK-USDT' };
  const OKX_INTERVALS = { '1h':'1H', '4h':'4H', '1d':'1D' };
  const instId = OKX_SYMBOLS[sym], interval = OKX_INTERVALS[tf];
  if (!instId || !interval) return null;
  const BASE = 'https://www.okx.com/api/v5/market/history-candles';
  const tsInicio = Date.now() - añosAtras * 365 * 24 * 60 * 60 * 1000;
  let todasLasVelas = [], before = null, intentos = 0;
  while (intentos < 20) {
    try {
      let url = BASE + '?instId=' + instId + '&bar=' + interval + '&limit=300';
      if (before) url += '&before=' + before;
      const res = await fetch(PROXY + '/?url=' + encodeURIComponent(url));
      const data = await res.json();
      if (!data.data || data.data.length === 0) break;
      const cerradas = data.data
        .filter(function(v) { return v[8] === '1' || v[8] === 1; })
        .map(function(v) { return { t: parseInt(v[0]), o: parseFloat(v[1]), h: parseFloat(v[2]), l: parseFloat(v[3]), c: parseFloat(v[4]), v: parseFloat(v[5]) }; });
      if (cerradas.length === 0) break;
      todasLasVelas = todasLasVelas.concat(cerradas);
      const masAntiguo = cerradas[cerradas.length - 1];
      before = masAntiguo.t - 1;
      if (masAntiguo.t <= tsInicio) break;
      await new Promise(function(r) { setTimeout(r, 300); });
      intentos++;
    } catch(e) { break; }
  }
  if (todasLasVelas.length === 0) return null;
  todasLasVelas.sort(function(a, b) { return a.t - b.t; });
  return todasLasVelas.filter(function(v, i, arr) { return i === 0 || v.t !== arr[i-1].t; });
}

// ── BACKTESTING REAL (O(n) total) ─────────────────────────
function ejecutarBacktestingReal(sym, tf) {
  const velas = STATE.ohlc?.[sym]?.[tf];
  if (!velas || velas.length < 100) return null;

  const closes = velas.map(k => k.c);
  const highs  = velas.map(k => k.h);
  const lows   = velas.map(k => k.l);
  const vols   = velas.map(k => k.v);

  // ── Helpers locales — arrays históricos completos ──────────
  function _rsiArr(cls, p) {
    p = p || 14;
    const out = new Array(cls.length).fill(null);
    if (cls.length < p + 1) return out;
    let g = 0, l = 0;
    for (let i = 1; i <= p; i++) { const d = cls[i] - cls[i-1]; if (d > 0) g += d; else l -= d; }
    let ag = g / p, al = l / p;
    out[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = p + 1; i < cls.length; i++) {
      const d = cls[i] - cls[i-1];
      ag = (ag * (p-1) + Math.max(d, 0)) / p;
      al = (al * (p-1) + Math.max(-d, 0)) / p;
      out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return out;
  }
  function _emaArr(cls, p) {
    const out = new Array(cls.length).fill(null);
    if (cls.length < p) return out;
    const k = 2 / (p + 1);
    let ema = cls.slice(0, p).reduce((a, b) => a + b, 0) / p;
    out[p - 1] = ema;
    for (let i = p; i < cls.length; i++) { ema = cls[i] * k + ema * (1 - k); out[i] = ema; }
    return out;
  }
  function _atrArr(hi, lo, cl, p) {
    p = p || 14;
    const out = new Array(cl.length).fill(null);
    const trs = [];
    for (let i = 1; i < cl.length; i++) {
      trs.push(Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1])));
    }
    if (trs.length < p) return out;
    let atr = trs.slice(0, p).reduce((a, b) => a + b, 0) / p;
    out[p] = atr;
    for (let i = p; i < trs.length; i++) { atr = (atr * (p-1) + trs[i]) / p; out[i+1] = atr; }
    return out;
  }
  function _volArr(v, p) {
    p = p || 20;
    const out = new Array(v.length).fill(null);
    for (let i = p; i < v.length; i++) {
      const avg = v.slice(i-p, i).reduce((a,b) => a+b, 0) / p;
      out[i] = avg > 0 ? v[i] / avg : 1;
    }
    return out;
  }

  const rsiArr   = _rsiArr(closes, 14);
  const ema20Arr = _emaArr(closes, 20);
  const ema50Arr = _emaArr(closes, 50);
  const ema12Arr = _emaArr(closes, 12);
  const ema26Arr = _emaArr(closes, 26);
  const atrArr   = _atrArr(highs, lows, closes, 14);
  const volArr   = _volArr(vols, 20);

  const resultados = [];

  for (let i = 60; i < velas.length - 20; i++) {
    const rsiActual = rsiArr[i];
    const ema20Act  = ema20Arr[i];
    const ema50Act  = ema50Arr[i];
    const atrActual = atrArr[i];
    const volActual = volArr[i];
    const precio    = closes[i];

    if (!rsiActual || !ema20Act || !ema50Act || !atrActual) continue;

    let score = 0;
    if      (rsiActual < 30) score += 25;
    else if (rsiActual < 40) score += 15;
    else if (rsiActual > 70) score -= 20;

    if (ema20Act > ema50Act) score += 20;
    else                     score -= 15;

    const e12 = ema12Arr[i], e26 = ema26Arr[i];
    if (e12 !== null && e26 !== null && e12 > e26) score += 20;

    const bb = closes.slice(i - 19, i + 1);
    if (bb.length >= 20) {
      const med = bb.reduce((a, b) => a + b, 0) / 20;
      const std = Math.sqrt(bb.reduce((a, b) => a + (b - med) * (b - med), 0) / 20);
      if (precio < med - 2 * std)  score += 15;
      else if (precio > med + 2 * std) score -= 10;
    }

    if (volActual !== null && volActual > 1.5) score += 10;

    const umbralScore = tf === '4h' ? 70 : tf === '1h' ? 65 : 40;
    if (score < umbralScore) continue;

    const slATR  = precio - atrActual * 1.5;
    const tp1ATR = precio + atrActual * 2.0;
    const tp2ATR = precio + atrActual * 3.0;

    let resultado = 'EXPIRADO', velasHasta = 0, maxSubida = 0, maxBajada = 0;
    let tocoTP1 = false, tocoTP2 = false, tocoSL = false;

    for (let j = 1; j <= 20; j++) {
      if (i + j >= velas.length) break;
      const vela = velas[i + j];
      const sub = (vela.h - precio) / precio * 100;
      const baj = (precio - vela.l) / precio * 100;
      if (sub > maxSubida) maxSubida = sub;
      if (baj > maxBajada) maxBajada = baj;
      if (!tocoSL && vela.l <= slATR) {
        tocoSL = true;
        if (!tocoTP1) { resultado = 'SL'; velasHasta = j; }
      }
      if (!tocoTP1 && vela.h >= tp1ATR) {
        tocoTP1 = true;
        if (!tocoSL || resultado !== 'SL') { resultado = 'TP1'; velasHasta = j; }
      }
      if (tocoTP1 && !tocoTP2 && vela.h >= tp2ATR) {
        tocoTP2 = true; resultado = 'TP2'; velasHasta = j;
      }
    }

    const horas = tf === '1h' ? 1 : tf === '4h' ? 4 : 24;
    resultados.push({
      fecha: new Date(velas[i].t).toISOString().slice(0, 16),
      score, precioEntrada: precio, slATR, tp1ATR, tp2ATR,
      pctSL:  (slATR  - precio) / precio * 100,
      pctTP1: (tp1ATR - precio) / precio * 100,
      pctTP2: (tp2ATR - precio) / precio * 100,
      atr: atrActual, rsi: rsiActual,
      tendencia: ema20Act > ema50Act ? 'alcista' : 'bajista',
      resultado, velasHastaResultado: velasHasta,
      horasHastaResultado: velasHasta * horas,
      maxSubida, maxBajada, tocoTP1, tocoTP2, tocoSL
    });
  }

  console.log('Backtesting ' + sym + ' ' + tf + ': ' + resultados.length + ' señales encontradas');
  return resultados;
}

// ── ESTADÍSTICAS BACKTESTING ──────────────────────────────
function calcularEstadisticasBacktest(resultados) {
  const total = resultados.length;
  if (total === 0) return null;

  const tp1n = resultados.filter(r => r.resultado === 'TP1' || r.resultado === 'TP2').length;
  const tp2n = resultados.filter(r => r.resultado === 'TP2').length;
  const sln  = resultados.filter(r => r.resultado === 'SL').length;
  const expn = resultados.filter(r => r.resultado === 'EXPIRADO').length;
  const tp1Res = resultados.filter(r => r.resultado === 'TP1' || r.resultado === 'TP2');

  const porScore = {};
  [['40-59', r => r.score >= 40 && r.score < 60],
   ['60-69', r => r.score >= 60 && r.score < 70],
   ['70-79', r => r.score >= 70 && r.score < 80],
   ['80+',   r => r.score >= 80]].forEach(([lbl, fn]) => {
    const sub = resultados.filter(fn);
    porScore[lbl] = { n: sub.length, hitRate: sub.length > 0
      ? parseFloat((sub.filter(r => r.resultado !== 'SL').length / sub.length * 100).toFixed(1)) : 0 };
  });

  return {
    total, hitRateTP1: parseFloat((tp1n / total * 100).toFixed(1)),
    hitRateTP2: parseFloat((tp2n / total * 100).toFixed(1)),
    hitRateSL:  parseFloat((sln  / total * 100).toFixed(1)),
    expirados: expn,
    tiempoPromedioTP1: tp1n > 0
      ? parseFloat((tp1Res.reduce((s, r) => s + r.horasHastaResultado, 0) / tp1n).toFixed(1)) : 0,
    pctSLPromedio:  parseFloat((resultados.reduce((s, r) => s + Math.abs(r.pctSL),  0) / total).toFixed(2)),
    pctTP1Promedio: parseFloat((resultados.reduce((s, r) => s + r.pctTP1, 0) / total).toFixed(2)),
    pctTP2Promedio: parseFloat((resultados.reduce((s, r) => s + r.pctTP2, 0) / total).toFixed(2)),
    maxSubidaPromedio: parseFloat((resultados.reduce((s, r) => s + r.maxSubida, 0) / total).toFixed(2)),
    maxBajadaPromedio: parseFloat((resultados.reduce((s, r) => s + r.maxBajada, 0) / total).toFixed(2)),
    porScore
  };
}

// ── STORYTELLING BACKTESTING ──────────────────────────────
function generarStorytellingBacktest(sym, tf, stats) {
  const tfLabel   = { '1h':'1 hora', '4h':'4 horas', '1d':'1 día' }[tf] || tf;
  const historia  = { '1h':'30 días', '4h':'120 días', '1d':'2 años' }[tf] || '';
  const diasN     = tf === '1h' ? 30 : tf === '4h' ? 120 : 730;
  const veredicto = stats.hitRateTP1 >= 65
    ? { texto:'EL SISTEMA TIENE EDGE REAL',       color:'#00ff88', emoji:'✅' }
    : stats.hitRateTP1 >= 55
    ? { texto:'EDGE MODERADO — SEGUIR VALIDANDO', color:'#f5a623', emoji:'⚠️' }
    : { texto:'SIN EDGE CLARO — CALIBRAR',        color:'#ff4444', emoji:'❌' };
  const mejorScore = Object.entries(stats.porScore)
    .sort((a, b) => b[1].hitRate - a[1].hitRate)[0];
  const senalesPorDia = (stats.total / diasN).toFixed(1);
  const coinColor = COIN_COLOR[sym] || 'var(--tertiary)';

  const barra = (val, color) =>
    '<div style="background:#081425;border-radius:4px;height:8px;overflow:hidden;margin-top:3px;">' +
    '<div style="width:' + val + '%;height:100%;background:' + color + ';border-radius:4px;"></div></div>';

  return '<div style="padding:18px;background:#081425;border-radius:10px;margin-top:12px;border:1px solid #1a3a5c;">' +
    '<h3 style="color:' + coinColor + ';margin:0 0 4px;font-size:15px;">🔬 ' + sym + ' · ' + tf.toUpperCase() + ' · Backtesting Real</h3>' +
    '<p style="color:#4e6a88;font-size:11px;margin:0 0 16px;">720 velas · ' + historia + ' · Velas de ' + tfLabel + ' · Datos reales Kraken</p>' +
    '<div style="padding:12px;background:#0d1f35;border-radius:8px;margin-bottom:12px;">' +
    '<div style="font-size:10px;color:#1a6eb5;letter-spacing:1px;margin-bottom:6px;">📖 LO QUE ENCONTRAMOS</div>' +
    '<p style="color:#e2eefc;font-size:12px;line-height:1.6;margin:0;">En los últimos <b>' + historia + '</b>, el sistema generó <b>' + stats.total + ' señales</b> en ' + sym + ' con score ≥ ' + (tf === '4h' ? 70 : tf === '1h' ? 65 : 40) + '. ' +
    'Eso es ~<b>' + senalesPorDia + ' señales/día</b> — ' + (parseFloat(senalesPorDia) > 2 ? 'muy activo para este token.' : 'selectivo, lo cual es positivo.') + '</p></div>' +
    '<div style="padding:12px;background:#0d1f35;border-radius:8px;margin-bottom:12px;">' +
    '<div style="font-size:10px;color:#1a6eb5;letter-spacing:1px;margin-bottom:10px;">🎯 ¿CUÁNTAS VECES ACERTÓ EL SISTEMA?</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">' +
    '<div style="text-align:center;padding:10px;background:#081425;border-radius:8px;"><div style="font-size:22px;color:#00ff88;font-weight:700;">' + stats.hitRateTP1 + '%</div><div style="font-size:10px;color:#4e6a88;">Alcanzó TP1</div><div style="font-size:10px;color:#4e6a88;">' + Math.round(stats.total*stats.hitRateTP1/100) + '/' + stats.total + '</div></div>' +
    '<div style="text-align:center;padding:10px;background:#081425;border-radius:8px;"><div style="font-size:22px;color:#f5a623;font-weight:700;">' + stats.hitRateTP2 + '%</div><div style="font-size:10px;color:#4e6a88;">Alcanzó TP2</div></div>' +
    '<div style="text-align:center;padding:10px;background:#081425;border-radius:8px;"><div style="font-size:22px;color:#ff4444;font-weight:700;">' + stats.hitRateSL + '%</div><div style="font-size:10px;color:#4e6a88;">Tocó SL</div></div>' +
    '</div>' +
    '<p style="color:#e2eefc;font-size:12px;line-height:1.6;margin:0;">' +
    (stats.hitRateTP1 >= 60 ? '✅ <b>' + stats.hitRateTP1 + '% de acierto</b> — de cada 10 señales, ' + Math.round(stats.hitRateTP1/10) + ' terminaron en ganancia. Los indicadores tienen valor predictivo real en ' + sym + '.' :
    '⚠️ <b>' + stats.hitRateTP1 + '%</b> está bajo el 60% mínimo. El sistema necesita calibración para ' + sym + ' en ' + tf.toUpperCase() + '.') + '</p></div>' +
    '<div style="padding:12px;background:#0d1f35;border-radius:8px;margin-bottom:12px;">' +
    '<div style="font-size:10px;color:#1a6eb5;letter-spacing:1px;margin-bottom:6px;">⏱ VELOCIDAD</div>' +
    '<p style="color:#e2eefc;font-size:12px;margin:0 0 4px;">Cuando el sistema acierta, lo hace en promedio en <b>' + stats.tiempoPromedioTP1 + 'h</b>. ' +
    (stats.tiempoPromedioTP1 < 12 ? 'Rápido — configura alertas Telegram para no perder la entrada.' :
     stats.tiempoPromedioTP1 < 48 ? 'Tiempo razonable — tienes hasta dos días para decidir.' :
     sym + ' es lento — las señales dan tiempo para analizar con calma.') + '</p></div>' +
    '<div style="padding:12px;background:#0d1f35;border-radius:8px;margin-bottom:12px;">' +
    '<div style="font-size:10px;color:#1a6eb5;letter-spacing:1px;margin-bottom:10px;">📊 ¿A PARTIR DE QUÉ SCORE VALE LA PENA?</div>' +
    Object.entries(stats.porScore).map(([rango, d]) =>
      '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><span style="color:#e2eefc;font-size:12px;">Score ' + rango + '</span>' +
      '<span style="color:' + (d.hitRate >= 65 ? '#00ff88' : d.hitRate >= 55 ? '#f5a623' : '#ff4444') + ';font-size:12px;font-weight:700;">' + d.hitRate + '% · ' + d.n + ' señales</span></div>' +
      barra(d.hitRate, d.hitRate >= 65 ? '#00ff88' : d.hitRate >= 55 ? '#f5a623' : '#ff4444') +
      '<p style="color:#4e6a88;font-size:10px;margin:3px 0 0;">' + (d.hitRate >= 65 ? '✅ Stake normal (Kelly completo)' : d.hitRate >= 55 ? '⚠️ Stake reducido (50% Kelly)' : '❌ No operar en este rango') + '</p></div>'
    ).join('') +
    '<p style="color:#e2eefc;font-size:12px;margin:8px 0 0;">💡 Score óptimo para ' + sym + ': <b>≥ ' + mejorScore[0].split('-')[0] + '</b></p></div>' +
    '<div style="padding:12px;background:#0d1f35;border-radius:8px;margin-bottom:12px;">' +
    '<div style="font-size:10px;color:#1a6eb5;letter-spacing:1px;margin-bottom:8px;">📐 NIVELES ÓPTIMOS REALES</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">' +
    '<div style="padding:8px;background:#ff444422;border-radius:6px;text-align:center;border:1px solid #ff444444;"><div style="color:#ff4444;font-size:16px;font-weight:700;">-' + stats.pctSLPromedio + '%</div><div style="color:#4e6a88;font-size:10px;">Stop Loss real</div></div>' +
    '<div style="padding:8px;background:#f5a62322;border-radius:6px;text-align:center;border:1px solid #f5a62344;"><div style="color:#f5a623;font-size:16px;font-weight:700;">+' + stats.pctTP1Promedio + '%</div><div style="color:#4e6a88;font-size:10px;">Take Profit 1</div></div>' +
    '<div style="padding:8px;background:#00ff8822;border-radius:6px;text-align:center;border:1px solid #00ff8844;"><div style="color:#00ff88;font-size:16px;font-weight:700;">+' + stats.pctTP2Promedio + '%</div><div style="color:#4e6a88;font-size:10px;">Take Profit 2</div></div></div>' +
    '<p style="color:#e2eefc;font-size:12px;margin:0;">Calculados con la volatilidad real de ' + sym + ' — reemplazan el SL -5% y TP +10% genéricos.</p></div>' +
    '<div style="padding:14px;border-radius:8px;text-align:center;background:' + veredicto.color + '22;border:2px solid ' + veredicto.color + '44;">' +
    '<div style="font-size:18px;">' + veredicto.emoji + '</div>' +
    '<div style="color:' + veredicto.color + ';font-size:14px;font-weight:700;margin:6px 0;">' + veredicto.texto + '</div>' +
    '<p style="color:#e2eefc;font-size:12px;line-height:1.6;margin:0 0 6px;">' +
    (stats.hitRateTP1 >= 65 ? 'Con ' + stats.hitRateTP1 + '% hit rate y niveles SL/TP basados en volatilidad real, el sistema demuestra edge estadístico en ' + sym + ' ' + tf.toUpperCase() + '.' :
    stats.hitRateTP1 >= 55 ? 'El sistema muestra señales prometedoras pero necesita más validación. Opera con stake reducido.' :
    'Los datos históricos no muestran edge claro. Prueba con otro timeframe o espera más datos en vivo.') + '</p>' +
    '<p style="color:#4e6a88;font-size:10px;margin:0;">⚠️ Resultados pasados no garantizan resultados futuros. Continúa en simulación hasta 50 señales en vivo validadas.</p></div>' +
    '</div>';
}
