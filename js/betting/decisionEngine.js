/**
 * JCAHS — Betting Decision Engine Module
 * De-vig, edge real y probabilidades de apuestas deportivas
 * Depende de: js/shared/math.js (calcEdge ya está ahí)
 *
 * NOTA: calcularScoreMentor y generarSugerencias permanecen en index.html
 *       (usan MENTOR_FILTROS, STATE y funciones de renderizado fuertemente acopladas)
 */

'use strict';

// ── DE-VIG PINNACLE ───────────────────────────────────────
/**
 * Elimina el margen de la casa de las odds de Pinnacle (referencia "sharp")
 * y devuelve las probabilidades verdaderas (sin vig).
 *
 * @param {object} oddsPinnacle - Mapa outcome_id → cuota decimal
 *   Ejemplo: { '101': 1.82, '102': 3.60, '103': 4.20 }
 * @returns {object} Mapa outcome_id → probabilidad verdadera (0-1)
 *   Ejemplo: { '101': 0.523, '102': 0.263, '103': 0.214 }
 */
function calcDeVigPinnacle(oddsPinnacle) {
  var keys = Object.keys(oddsPinnacle);
  if (keys.length === 0) return {};
  var sumInv = keys.reduce(function(acc, k) {
    return acc + (oddsPinnacle[k] > 0 ? 1 / oddsPinnacle[k] : 0);
  }, 0);
  if (sumInv === 0) return {};
  var result = {};
  keys.forEach(function(k) {
    result[k] = oddsPinnacle[k] > 0 ? (1 / oddsPinnacle[k]) / sumInv : 0;
  });
  return result;
}

// ── EDGE REAL ─────────────────────────────────────────────
/**
 * Calcula el edge real de una apuesta usando Pinnacle como referencia.
 * edge = (prob_verdadera × odd_soft − 1) × 100
 *
 * @param {number} trueProb - Probabilidad verdadera de Pinnacle (0-1)
 * @param {number} oddSoft  - Cuota del libro blando (Bet365, etc.)
 * @returns {number} Edge en porcentaje (positivo = value)
 */
function calcEdgePinnacle(trueProb, oddSoft) {
  if (!trueProb || !oddSoft || oddSoft <= 0) return 0;
  return (trueProb * oddSoft - 1) * 100;
}

// ── KELLY DIRECTO PARA APUESTA ────────────────────────────
/**
 * Kelly fraccionado para una apuesta individual
 * @param {number} trueProb - Probabilidad verdadera (0-1)
 * @param {number} odd      - Cuota decimal del libro blando
 * @param {number} fraccion - Fracción de Kelly (default 0.25)
 * @returns {number} Fracción del bankroll a apostar (0-1)
 */
function calcKellyBet(trueProb, odd, fraccion) {
  fraccion = fraccion !== undefined ? fraccion : 0.25;
  return calcKelly(trueProb, odd, fraccion);
}
