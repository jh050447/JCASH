/**
 * JCAHS — Notifications Module
 * Sistema unificado de notificaciones Chrome + Telegram
 * Depende de: Storage (storage.js)
 */

'use strict';

var NOTIF_WORKER_URL = 'https://jcahs-proxy.jh050447.workers.dev';
var NOTIF_CHAT_ID    = '1519036308';

var Notifications = {

  // ─── CHROME ──────────────────────────────────────────────────────────────

  requestPermission: function() {
    if (!('Notification' in window)) return Promise.resolve(false);
    if (Notification.permission === 'granted') return Promise.resolve(true);
    return Notification.requestPermission().then(function(result) {
      return result === 'granted';
    });
  },

  chrome: function(titulo, cuerpo, opciones) {
    opciones = opciones || {};
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(titulo, {
      body: cuerpo,
      icon: '/favicon.ico',
      tag: opciones.tag || 'jcahs-' + Date.now(),
      requireInteraction: opciones.requireInteraction || false,
    });
  },

  // ─── TELEGRAM ────────────────────────────────────────────────────────────
  // Usa el endpoint GET del Worker: /?telegram=1&chat_id=...&text=...

  telegram: function(mensaje) {
    var url = NOTIF_WORKER_URL +
      '/?telegram=1' +
      '&chat_id=' + encodeURIComponent(NOTIF_CHAT_ID) +
      '&text=' + encodeURIComponent(mensaje);
    return fetch(url).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return true;
    }).catch(function(e) {
      console.error('Notifications.telegram error:', e.message);
      return false;
    });
  },

  // ─── DEDUPLICACIÓN TTL ────────────────────────────────────────────────────

  isDuplicate: function(key, ttlMinutos) {
    ttlMinutos = ttlMinutos || 30;
    var storageKey = 'jcahs_notif_' + key;
    try {
      var ultimo = localStorage.getItem(storageKey);
      if (ultimo && (Date.now() - parseInt(ultimo, 10)) < ttlMinutos * 60 * 1000) {
        return true;
      }
      localStorage.setItem(storageKey, String(Date.now()));
    } catch(e) { /* localStorage lleno */ }
    return false;
  },

  // ─── ALERTAS DE APUESTAS ─────────────────────────────────────────────────

  valueBet: function(datos) {
    var self = this;
    var key = 'vbet_' + datos.partido + '_' + datos.pick;
    if (this.isDuplicate(key)) return;

    this.chrome(
      '⚽ Value Bet · Score ' + datos.score,
      datos.partido + '\n' + datos.pick + ' · Edge +' + datos.edge + '%',
      { requireInteraction: true }
    );

    var msg = this._formatValueBet(datos);
    this.telegram(msg);
  },

  resumenDiario: function(stats) {
    if (!stats || stats.total === 0) return;
    var emoji = stats.pnl > 0 ? '✅' : stats.pnl < 0 ? '❌' : '➡️';
    var signo = stats.pnl >= 0 ? '+' : '';
    var pendienteLine = stats.pendientes > 0
      ? '\n⚠️ ' + stats.pendientes + ' apuesta(s) sin resultado'
      : '';
    this.telegram(
      '📊 JCAHS — RESUMEN DEL DÍA\n\n' +
      emoji + ' P&L del día: ' + signo + '$' + stats.pnl.toFixed(2) + '\n\n' +
      'Apuestas: ' + stats.total + ' · Ganadas: ' + stats.ganadas + ' · Perdidas: ' + stats.perdidas +
      pendienteLine + '\n\n' +
      '📱 jh050447.github.io/JCASH/historial.html'
    );
  },

  // ─── ALERTAS CRYPTO ──────────────────────────────────────────────────────

  cryptoSignal: function(sym, datos) {
    var self = this;
    var key = 'crypto_' + sym + '_' + Math.floor(Date.now() / (30 * 60 * 1000));
    if (this.isDuplicate(key)) return;

    var precioStr = datos.precio ? '$' + datos.precio.toLocaleString() : '';
    var slStr = datos.sl ? ' · SL: $' + datos.sl.toLocaleString() : '';
    this.chrome(
      '₿ ' + sym + ' · Score ' + datos.score + '/100',
      precioStr + slStr
    );

    var msg = this._formatCryptoSignal(sym, datos);
    this.telegram(msg);
  },

  miedoExtremo: function(fearGreed) {
    var key = 'miedo_' + Math.floor(Date.now() / (60 * 60 * 1000));
    if (this.isDuplicate(key, 60)) return;

    this.chrome(
      '😱 Miedo Extremo',
      'Fear & Greed: ' + fearGreed + '/100 — Posible zona de DCA'
    );

    this.telegram(
      '😱 JCAHS — MIEDO EXTREMO DETECTADO\n\n' +
      'Fear & Greed: ' + fearGreed + '/100\n\n' +
      'El mercado está en pánico. Históricamente estas zonas son las mejores para comprar.\n\n' +
      '"Sé codicioso cuando otros tienen miedo." — Warren Buffett\n\n' +
      '📱 jh050447.github.io/JCASH/crypto.html'
    );
  },

  // ─── FORMATTERS ──────────────────────────────────────────────────────────

  _formatValueBet: function(d) {
    var stake   = d.stake || 4;
    var odd     = d.oddDisponible || d.odd || d.oddPinnacle || 1;
    var ganancia = d.ganancia || ((stake * (odd - 1)).toFixed(2));
    var perdida  = d.perdida  || stake;
    var ratioRR  = (parseFloat(ganancia) / parseFloat(perdida)).toFixed(1);
    var minutos  = d.minutosRestantes !== undefined ? d.minutosRestantes : 999;
    var urgencia = minutos < 60
      ? '🚨 URGENTE — partido en ' + minutos + ' minutos'
      : '⏱ Partido en ' + Math.floor(minutos / 60) + 'h ' + (minutos % 60) + 'min';
    var oddMin = d.oddPinnacle ? (d.oddPinnacle * 0.98).toFixed(2) : '—';

    return (
      '⚽ JCAHS — VALUE BET DETECTADA\n\n' +
      '🏆 ' + (d.liga || '') + '\n' +
      (d.partido || '') + '\n' +
      '📅 ' + (d.hora || '') + ' · ' + urgencia + '\n\n' +
      '🎯 PICK: ' + (d.pick || '') + '\n' +
      '📊 Score: ' + (d.score || '—') + '/100\n\n' +
      '💡 POR QUÉ ES VALUE\n' +
      'Probabilidad real: ' + (d.probReal || '—') + '%\n' +
      'Odd Pinnacle (precio justo): ' + (d.oddPinnacle || '—') + '\n' +
      'Odd disponible: ' + (d.oddDisponible || d.odd || '—') + '\n' +
      'Edge: +' + (d.edge || '—') + '% — la casa paga más de lo que debería\n\n' +
      '💡 QUÉ PUEDE PASAR\n' +
      '🟢 Si ganas: +$' + ganancia + ' sobre $' + stake + '\n' +
      '🔴 Si pierdes: -$' + perdida + '\n' +
      'Ratio R/R: 1:' + ratioRR + '\n\n' +
      '🎯 PLAN\n' +
      'Stake: $' + stake + ' (2% bankroll)\n' +
      'Odd mínima aceptable: ' + oddMin + '\n' +
      'Casa: Ecuabet / Bet365 / Sportbet\n\n' +
      urgencia + '\n' +
      '⚠️ Modo simulación activo\n\n' +
      '📱 jh050447.github.io/JCASH/'
    );
  },

  _formatCryptoSignal: function(sym, d) {
    var capital  = d.capital || 20;
    var precio   = d.precio  || 0;
    var tp1      = d.tp1 || 0;
    var tp2      = d.tp2 || 0;
    var sl       = d.sl  || 0;

    var gananciaTP1 = tp1 && precio ? ((tp1 - precio) / precio * capital).toFixed(2) : '—';
    var gananciaTP2 = tp2 && precio ? ((tp2 - precio) / precio * capital).toFixed(2) : '—';
    var perdidaSL   = sl  && precio ? Math.abs((sl - precio) / precio * capital).toFixed(2) : '—';
    var pctTP1 = tp1 && precio ? (((tp1 - precio) / precio) * 100).toFixed(1) : '—';
    var pctTP2 = tp2 && precio ? (((tp2 - precio) / precio) * 100).toFixed(1) : '—';
    var pctSL  = sl  && precio ? (((precio - sl)  / precio) * 100).toFixed(1) : '—';
    var ratioRR = gananciaTP1 !== '—' && perdidaSL !== '—'
      ? (parseFloat(gananciaTP1) / parseFloat(perdidaSL)).toFixed(1) : '—';

    var fg = d.fearGreed || 50;
    var fgTexto = fg < 25
      ? '😱 Miedo Extremo (' + fg + ') — zona de compra históricamente'
      : '😐 Neutral (' + fg + ')';

    var bt = (typeof Storage !== 'undefined' && Storage.getBacktestResultados)
      ? Storage.getBacktestResultados()
      : {};
    var stats = bt[sym + '_4h'];
    var seccionHistorica = (stats && stats.total >= 10)
      ? '💡 BASADO EN ' + stats.total + ' SEÑALES HISTÓRICAS REALES\n' +
        '🟢 Prob. alcanzar TP1: ' + stats.hitRateTP1 + '%\n' +
        '🔴 Prob. tocar SL: ' + stats.hitRateSL + '%\n' +
        '⏱ Tiempo promedio: ' + stats.tiempoPromedioTP1 + 'h'
      : '💡 DATOS HISTÓRICOS\n' +
        '⏳ Acumulando señales... próximas alertas incluirán probabilidades reales';

    var tendencia = d.tendencia === 'alcista' ? '🟢 Alcista' : '🔴 Bajista';

    return (
      '⚡ SEÑAL DE COMPRA — ' + sym + ' · $' + (precio ? precio.toLocaleString() : '—') + '\n\n' +
      '📊 Score ' + d.score + '/100\n\n' +
      '💡 QUÉ PUEDE PASAR SI ENTRAS AHORA\n' +
      '🟢 TP2 ($' + (tp2 ? tp2.toLocaleString() : '—') + '): +$' + gananciaTP2 + ' (+' + pctTP2 + '%)\n' +
      '🟡 TP1 ($' + (tp1 ? tp1.toLocaleString() : '—') + '): +$' + gananciaTP1 + ' (+' + pctTP1 + '%)\n' +
      '🔴 SL ($' + (sl  ? sl.toLocaleString()  : '—') + '): -$' + perdidaSL + ' (-' + pctSL + '%)\n\n' +
      '🎯 PLAN DE OPERACIÓN\n' +
      'Entrada: $' + (precio ? precio.toLocaleString() : '—') + '\n' +
      'SL: $' + (sl  ? sl.toLocaleString()  : '—') + ' (-' + pctSL + '%)\n' +
      'TP1: $' + (tp1 ? tp1.toLocaleString() : '—') + ' (+' + pctTP1 + '%)\n' +
      'TP2: $' + (tp2 ? tp2.toLocaleString() : '—') + ' (+' + pctTP2 + '%)\n' +
      'Capital: $' + capital + ' · Ratio R/R: 1:' + ratioRR + '\n\n' +
      seccionHistorica + '\n\n' +
      '🌍 CONTEXTO\n' +
      fgTexto + '\n' +
      'Tendencia 1D: ' + tendencia + '\n\n' +
      '⚠️ MODO SIMULACIÓN ACTIVO\n\n' +
      '📱 jh050447.github.io/JCASH/crypto.html'
    );
  },
};
