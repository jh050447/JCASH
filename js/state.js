// ============================================================
// js/state.js — Estado global de JCAHS
// ============================================================

const STATE = {

  // IDIOMA
  lang: localStorage.getItem('jcahs_lang') || 'es',

  // MÓDULO ACTIVO
  moduloActivo: 'dashboard',

  // PRECIOS CRYPTO en tiempo real
  precios: {},

  // BANKROLL
  bankroll: {
    total:     parseFloat(localStorage.getItem('jcahs_bk_total')    || '500'),
    reserva:   parseFloat(localStorage.getItem('jcahs_bk_reserva')  || '50'),
    enJuego:   parseFloat(localStorage.getItem('jcahs_bk_juego')    || '0'),
  },

  // OKRs — progreso real
  okr: {
    pnlHoy:    parseFloat(localStorage.getItem('jcahs_pnl_hoy')   || '0'),
    pnlSemana: parseFloat(localStorage.getItem('jcahs_pnl_sem')   || '0'),
    pnlMes:    parseFloat(localStorage.getItem('jcahs_pnl_mes')   || '0'),
  },

  // OPERACIONES guardadas
  operaciones: JSON.parse(localStorage.getItem('jcahs_ops') || '[]'),

  // ASESOR IA activo
  asesorActivo: 'MASTER',
  sistemaIA: '',

  // EMERGENCIA
  emergenciaActiva: false,
  metaEmergencia: 0,

  // ÍNDICE JCAHS
  indice: {
    total:    8.5,
    crypto:   8.5,
    deportes: 9.0,
    global:   7.0,
    tuEstado: 8.5,
    historico:8.0
  },

  // ANTI-TILT
  tilt: {
    perdidasSeguidas: 0,
    enModoProteccion: false
  }

};

// ============================================================
// MÉTODOS para actualizar el estado
// ============================================================

const StateManager = {

  // Guardar operación nueva
  agregarOperacion(op) {
    STATE.operaciones.unshift(op);
    localStorage.setItem('jcahs_ops', JSON.stringify(STATE.operaciones));
    this.recalcularPNL();
    this.verificarTilt();
  },

  // Recalcular P&L
  recalcularPNL() {
    const hoy = new Date().toLocaleDateString('es-EC');
    STATE.okr.pnlHoy = STATE.operaciones
      .filter(o => o.fecha === hoy)
      .reduce((s, o) => s + o.resultado, 0);
    STATE.okr.pnlSemana = STATE.operaciones
      .slice(0, 50)
      .reduce((s, o) => s + o.resultado, 0);
    STATE.okr.pnlMes = STATE.operaciones
      .reduce((s, o) => s + o.resultado, 0);
    localStorage.setItem('jcahs_pnl_hoy', STATE.okr.pnlHoy);
    localStorage.setItem('jcahs_pnl_sem', STATE.okr.pnlSemana);
    localStorage.setItem('jcahs_pnl_mes', STATE.okr.pnlMes);
  },

  // Verificar tilt
  verificarTilt() {
    const ops = STATE.operaciones.slice(0, 5);
    let perdidas = 0;
    for (const op of ops) {
      if (op.resultado < 0) perdidas++;
      else break;
    }
    STATE.tilt.perdidasSeguidas = perdidas;
    STATE.tilt.enModoProteccion = perdidas >= CONFIG.antiTilt.maxPerdidasSeguidas;
  },

  // Actualizar bankroll
  actualizarBankroll(campo, valor) {
    STATE.bankroll[campo] = valor;
    localStorage.setItem('jcahs_bk_' + campo, valor);
  },

  // Cambiar idioma
  cambiarIdioma(lang) {
    STATE.lang = lang;
    localStorage.setItem('jcahs_lang', lang);
  },

  // Obtener disponible
  getDisponible() {
    return STATE.bankroll.total - STATE.bankroll.reserva - STATE.bankroll.enJuego;
  },

  // Win rate
  getWinRate() {
    if (!STATE.operaciones.length) return 0;
    const wins = STATE.operaciones.filter(o => o.resultado > 0).length;
    return Math.round((wins / STATE.operaciones.length) * 100);
  },

  // Racha actual
  getRacha() {
    if (!STATE.operaciones.length) return { tipo: null, count: 0 };
    const esGanadora = STATE.operaciones[0].resultado >= 0;
    let count = 0;
    for (const op of STATE.operaciones) {
      if ((op.resultado >= 0) === esGanadora) count++;
      else break;
    }
    return { tipo: esGanadora ? 'win' : 'loss', count };
  }

};

// Exportar
window.STATE = STATE;
window.StateManager = StateManager;