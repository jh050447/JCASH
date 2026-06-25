/**
 * JCAHS — Global State Module
 * Estado único compartido entre index.html, crypto.html e historial.html
 *
 * NOTA DE COEXISTENCIA:
 * index.html y crypto.html tienen su propio `const STATE = {...}` en el inline script.
 * Dado que `const` en otro <script> del mismo HTML causa SyntaxError por redeclaración,
 * este módulo usa `window.STATE = window.STATE || {...}` en lugar de `const STATE`.
 * Resultado:
 *   - historial.html: usa este STATE directamente (no tiene STATE propio).
 *   - index.html / crypto.html: el inline `const STATE` crea un binding léxico que
 *     shadowa window.STATE para todo el código de esa página. Este módulo sirve
 *     como esquema documentado y fallback para historial.html.
 * Migración completa en Día 6: reemplazar los inline STATE por Object.assign(STATE, {...}).
 */

'use strict';

window.STATE = window.STATE || {
  // ─── CAPITAL Y CONFIGURACIÓN ─────────────────────────────────
  capital:         1000,
  bankroll:        200,
  modoSimulacion:  true,

  // ─── CRYPTO ──────────────────────────────────────────────────
  precios:         {},
  ohlc:            {},
  changes24h:      {},
  fng:             null,
  macro:           { sp500: null, dxy: null, vix: null, timestamp: null },
  watchlistCoins:  [],
  senalesHistorial:[],
  alertasCrypto:   [],
  capitalCrypto:   200,
  cargando:        false,
  ultimaActualizacion: null,

  // ─── APUESTAS ─────────────────────────────────────────────────
  valueBets:       [],
  oddsGames:       [],
  senales:         {},
  senalesCripto:   {},
  analisisActual:  null,

  // ─── QUOTA APIs ───────────────────────────────────────────────
  quota: {
    oddsPapi:     { used: 0, remaining: 250, resetDate: null },
    oddsApi:      { used: 0, remaining: 500 },
    theOdds:      { used: 0, remaining: 500 },
    tavily:       { used: 0, remaining: 1000 },
    alphaVantage: { used: 0, remaining: 25 }
  },

  // ─── UI ───────────────────────────────────────────────────────
  seccionActiva: 'panel',
};
