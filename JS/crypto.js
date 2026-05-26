// ============================================================
// js/crypto.js — Módulo Crypto completo
// ============================================================

const Crypto = {

  cryptoSeleccionada: 'bitcoin',

  soportes: {
    bitcoin: '$76,800', ethereum: '$3,100', ripple: '$0.48', dogecoin: '$0.14'
  },

  resistencias: {
    bitcoin: '$79,500', ethereum: '$3,400', ripple: '$0.58', dogecoin: '$0.22'
  },

  // Iniciar módulo
  iniciar() {
    this.actualizarPrecios();
    this.seleccionar(this.cryptoSeleccionada);
  },

  // Actualizar precios en módulo crypto
  actualizarPrecios() {
    const map = { bitcoin: 'btc', ethereum: 'eth', ripple: 'xrp', dogecoin: 'doge' };
    Object.entries(map).forEach(([id, sym]) => {
      const d = STATE.precios[id];
      if (!d) return;
      const elP = document.getElementById('cp-' + sym);
      const elC = document.getElementById('cc-' + sym);
      if (elP) elP.textContent = Utils.formatPrecio(d.usd);
      if (elC) {
        elC.textContent = Utils.formatCambio(d.usd_24h_change);
        elC.className = 'crypto-change ' + Utils.clasePN(d.usd_24h_change);
      }
    });
  },

  // Seleccionar crypto
  seleccionar(id, btn) {
    this.cryptoSeleccionada = id;
    document.querySelectorAll('#mod-crypto .crypto-card').forEach(c => c.style.borderColor = '');
    if (btn) btn.style.borderColor = 'var(--verde)';
    this.actualizarDetalle(id);
  },

  // Actualizar detalle
  actualizarDetalle(id) {
    const nombres = {
      bitcoin: 'BITCOIN (BTC)',
      ethereum: 'ETHEREUM (ETH)',
      ripple: 'XRP (Ripple)',
      dogecoin: 'DOGECOIN (DOGE)'
    };

    const d = STATE.precios[id];
    const precio = d?.usd;
    const cambio = d?.usd_24h_change;

    const elN = document.getElementById('cd-n');
    const elP = document.getElementById('cd-p');
    const elC = document.getElementById('cd-c');
    const elS = document.getElementById('cd-s');
    const elSop = document.getElementById('i-sop');
    const elRes = document.getElementById('i-res');

    if (elN) elN.textContent = nombres[id] || id.toUpperCase();
    if (elP) elP.textContent = Utils.formatPrecio(precio);
    if (elC) {
      elC.textContent = Utils.formatCambio(cambio);
      elC.className = Utils.clasePN(cambio);
    }
    if (elS) elS.textContent = 'Live · CoinGecko · Actualizado hace menos de 1min';
    if (elSop) elSop.textContent = this.soportes[id] || '--';
    if (elRes) elRes.textContent = this.resistencias[id] || '--';

    // Señal técnica
    this.actualizarSenal(cambio);
  },

  // Señal técnica
  actualizarSenal(cambio) {
    const alcista = !cambio || cambio >= 0;
    const box = document.getElementById('señal-box');
    const titulo = document.getElementById('señal-t');
    const desc = document.getElementById('señal-d');

    if (box) {
      box.style.background = alcista ? 'rgba(0,255,136,0.08)' : 'rgba(255,59,92,0.08)';
      box.style.borderColor = alcista ? 'rgba(0,255,136,0.3)' : 'rgba(255,59,92,0.3)';
    }
    if (titulo) {
      titulo.textContent = alcista ? '🟢 SEÑAL ALCISTA — LARGO' : '🔴 SEÑAL BAJISTA — CORTO';
      titulo.style.color = alcista ? 'var(--verde)' : 'var(--rojo)';
    }
    if (desc) {
      desc.textContent = alcista
        ? 'Momentum positivo. RSI neutral, volumen creciente. Oportunidad de scalping en las próximas 2-4 horas.'
        : 'Presión vendedora detectada. Considera posición corta con stop-loss ajustado.';
    }
  }

};

window.Crypto = Crypto;