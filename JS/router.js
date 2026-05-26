// ============================================================
// js/router.js — Navegación entre módulos
// ============================================================

const Router = {

  modulos: ['dashboard', 'crypto', 'deportes', 'calculadora', 'historial', 'asesores'],

  // Navegar a módulo
  ir(id, btnEl) {
    // Ocultar todos los módulos
    document.querySelectorAll('.modulo').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Mostrar módulo seleccionado
    const modulo = document.getElementById('mod-' + id);
    if (modulo) modulo.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

    STATE.moduloActivo = id;
    Utils.scrollTop();

    // Ejecutar lógica específica del módulo
    this.onModuloChange(id);
  },

  // Acciones al cambiar de módulo
  onModuloChange(id) {
    switch (id) {
      case 'dashboard':
        Dashboard.actualizar();
        break;
      case 'crypto':
        Crypto.iniciar();
        break;
      case 'historial':
        Historial.render();
        Historial.actualizarStats();
        break;
      case 'calculadora':
        Calculadora.calcCrypto();
        Calculadora.calcApuesta();
        break;
    }
  }

};

window.Router = Router;