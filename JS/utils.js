// ============================================================
// js/utils.js — Funciones utilitarias reutilizables
// ============================================================

const Utils = {

  // Formatear precio
  formatPrecio(precio, decimales = 2) {
    if (!precio) return '$--';
    if (precio > 1) return '$' + precio.toLocaleString('en-US', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    return '$' + precio.toFixed(4);
  },

  // Formatear cambio %
  formatCambio(cambio) {
    if (cambio === undefined || cambio === null) return '--';
    return (cambio >= 0 ? '+' : '') + cambio.toFixed(2) + '%';
  },

  // Clase CSS para positivo/negativo
  clasePN(valor) {
    return valor >= 0 ? 'pos' : 'neg';
  },

  // Fecha actual ES
  fechaHoy() {
    return new Date().toLocaleDateString('es-EC');
  },

  // Fecha larga
  fechaLarga() {
    return new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  // Hora actual
  horaActual() {
    return new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  // Formatear dinero
  formatDinero(monto) {
    const abs = Math.abs(monto);
    return (monto >= 0 ? '+$' : '-$') + abs.toFixed(2);
  },

  // Calcular porcentaje
  calcPorcentaje(valor, total) {
    if (!total) return 0;
    return Math.min(100, Math.max(0, (valor / total) * 100));
  },

  // ID único
  generarId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },

  // Debounce
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Mostrar notificación
  notificar(mensaje, tipo = 'info') {
    const colores = { info: 'var(--verde)', error: 'var(--rojo)', warning: 'var(--dorado)' };
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;top:80px;right:20px;z-index:9999;padding:12px 20px;background:var(--gris2);border:1px solid ${colores[tipo]};border-radius:10px;font-family:'Orbitron',monospace;font-size:11px;color:${colores[tipo]};box-shadow:0 0 20px rgba(0,0,0,0.5);animation:fadeUp 0.3s ease;`;
    n.textContent = mensaje;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  },

  // Scroll suave al top
  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

};

window.Utils = Utils;