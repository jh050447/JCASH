/**
 * JCAHS — Betting Kelly Module
 * Gestión de bankroll y sizing para apuestas deportivas
 * Depende de: js/shared/math.js (calcKelly, calcEdge)
 * Nota: calcKelly vive en math.js — aquí van las utilidades complementarias
 */

'use strict';

// ── MONTE CARLO POR APUESTA ───────────────────────────────
/**
 * Simula n escenarios de una apuesta individual
 * @param {number} odd - Cuota decimal
 * @param {number} probReal - Probabilidad real en % (0-100)
 * @param {number} monto - Stake en USD
 * @param {number} bankroll - Bankroll actual
 * @param {number} n - Número de simulaciones (default 1000)
 * @returns {object} { winRate, gananciaEsperada, valorEsperado, ganaSi, pierdeSi, esValuePositivo }
 */
function monteCarloBet(odd, probReal, monto, bankroll, n) {
  n = n || 1000;
  var prob = (probReal || 0) / 100;
  var victorias = 0, sumGanancia = 0;
  for (var i = 0; i < n; i++) {
    if (Math.random() < prob) { victorias++; sumGanancia += (odd - 1) * monto; }
    else sumGanancia -= monto;
  }
  var gananciaEsp = sumGanancia / n;
  return {
    winRate: victorias / n * 100,
    gananciaEsperada: gananciaEsp,
    valorEsperado: monto > 0 ? gananciaEsp / monto : 0,
    ganaSi: bankroll + (odd - 1) * monto,
    pierdeSi: bankroll - monto,
    esValuePositivo: gananciaEsp > 0
  };
}

// ── HISTORIAL SIMILAR ─────────────────────────────────────
/**
 * Busca apuestas históricas con probabilidad real similar (±10%)
 * @param {number} probReal - Probabilidad real en % (0-100)
 * @returns {object|null} { n, hitRate } o null si no hay datos
 */
function historialSimilar(probReal) {
  try {
    var hist = JSON.parse(localStorage.getItem('jcahs_historial') || '[]');
    var margin = 10;
    var sim = hist.filter(function(r) {
      return r.probReal != null && Math.abs(r.probReal - probReal) <= margin &&
             (r.resultado === 'GANÓ' || r.resultado === 'PERDIÓ');
    });
    if (!sim.length) return null;
    var gan = sim.filter(function(r) { return r.resultado === 'GANÓ'; }).length;
    return { n: sim.length, hitRate: gan / sim.length * 100 };
  } catch(e) { return null; }
}
