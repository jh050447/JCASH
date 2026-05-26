// ============================================================
// js/dashboard.js — Módulo Dashboard principal
// ============================================================

const Dashboard = {

  // Inicializar dashboard
  init() {
    this.iniciarReloj();
    this.actualizar();
  },

  // Reloj en tiempo real
  iniciarReloj() {
    const tick = () => {
      const el_reloj = document.getElementById('reloj');
      const el_fecha_l = document.getElementById('fecha-l');
      const el_fecha_c = document.getElementById('fecha-c');
      if (el_reloj) el_reloj.textContent = Utils.horaActual();
      if (el_fecha_l) el_fecha_l.textContent = Utils.fechaLarga();
      if (el_fecha_c) el_fecha_c.textContent = Utils.fechaHoy();
    };
    tick();
    setInterval(tick, CONFIG.intervalos.reloj);
  },

  // Actualizar todo el dashboard
  actualizar() {
    this.actualizarPNL();
    this.actualizarBankroll();
    this.actualizarRacha();
    this.actualizarIndice();
  },

  // P&L y OKRs
  actualizarPNL() {
    const pnl = STATE.okr.pnlHoy;
    const meta = CONFIG.objetivos.dia;
    const pct = Utils.calcPorcentaje(pnl, meta);

    const elVal = document.getElementById('pnl-v');
    const elProg = document.getElementById('pnl-p');
    const elPct = document.getElementById('pnl-pct');
    const elSem = document.getElementById('okr-s');
    const elMes = document.getElementById('okr-m');
    const progSem = document.getElementById('ps');
    const progMes = document.getElementById('pm');

    if (elVal) {
      elVal.textContent = Utils.formatDinero(pnl);
      elVal.style.color = pnl >= 0 ? 'var(--verde)' : 'var(--rojo)';
    }
    if (elProg) elProg.style.width = pct + '%';
    if (elPct) elPct.textContent = Math.round(pct) + '%';
    if (elSem) elSem.textContent = `$${STATE.okr.pnlSemana.toFixed(0)}/$${CONFIG.objetivos.semana}`;
    if (elMes) elMes.textContent = `$${STATE.okr.pnlMes.toFixed(0)}/$${CONFIG.objetivos.mes}`;
    if (progSem) progSem.style.width = Utils.calcPorcentaje(STATE.okr.pnlSemana, CONFIG.objetivos.semana) + '%';
    if (progMes) progMes.style.width = Utils.calcPorcentaje(STATE.okr.pnlMes, CONFIG.objetivos.mes) + '%';
  },

  // Bankroll
  actualizarBankroll() {
    const el_t = document.getElementById('bk-t');
    const el_d = document.getElementById('bk-d');
    const el_j = document.getElementById('bk-j');
    const el_r = document.getElementById('bk-r');
    if (el_t) el_t.textContent = '$' + STATE.bankroll.total.toFixed(0);
    if (el_d) el_d.textContent = '$' + StateManager.getDisponible().toFixed(0);
    if (el_j) el_j.textContent = '$' + STATE.bankroll.enJuego.toFixed(0);
    if (el_r) el_r.textContent = '$' + STATE.bankroll.reserva.toFixed(0);
  },

  // Racha actual
  actualizarRacha() {
    const racha = StateManager.getRacha();
    const dots = document.getElementById('racha-dots');
    const estado = document.getElementById('racha-e');

    if (dots && STATE.operaciones.length) {
      dots.innerHTML = STATE.operaciones.slice(0, 5).map(o =>
        `<div class="rdot ${o.resultado >= 0 ? 'w' : 'l'}">${o.resultado >= 0 ? '✓' : '✗'}</div>`
      ).join('');
    }

    if (estado) {
      if (!STATE.operaciones.length) {
        estado.textContent = 'Sin operaciones — ¡Comienza hoy!';
      } else if (racha.tipo === 'win') {
        estado.textContent = `🔥 ${racha.count} victorias consecutivas`;
        estado.style.color = 'var(--verde)';
      } else {
        estado.textContent = `⚠️ ${racha.count} pérdidas seguidas — Precaución`;
        estado.style.color = 'var(--rojo)';
      }
    }

    // Anti-tilt warning
    if (STATE.tilt.enModoProteccion) {
      Utils.notificar('⚠️ MODO PROTECCIÓN ACTIVO — Reduce tu riesgo', 'warning');
    }
  },

  // Índice JCAHS
  actualizarIndice() {
    const el = document.getElementById('indice-num');
    if (el) el.innerHTML = `${STATE.indice.total}<span>/10</span>`;
  },

  // Actualizar precios en dashboard
  actualizarPrecios(precios) {
    const map = { bitcoin: 'btc', ethereum: 'eth', ripple: 'xrp', dogecoin: 'doge' };
    Object.entries(map).forEach(([id, sym]) => {
      const d = precios[id];
      if (!d) return;
      const elP = document.getElementById('p-' + sym);
      const elC = document.getElementById('c-' + sym);
      if (elP) elP.textContent = Utils.formatPrecio(d.usd);
      if (elC) {
        elC.textContent = Utils.formatCambio(d.usd_24h_change);
        elC.className = 'crypto-change ' + Utils.clasePN(d.usd_24h_change);
      }
    });
  }

};

window.Dashboard = Dashboard;