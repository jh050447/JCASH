// ============================================================
// js/app.js — Núcleo principal de JCAHS
// ============================================================

const App = {

  // Inicializar toda la aplicación
  async init() {
    console.log('🚀 JCAHS v2.0 iniciando...');

    // Inicializar sistema IA
    STATE.sistemaIA = Asesores.sistemas.MASTER;

    // Inicializar módulos
    Dashboard.init();
    Historial.render();
    Historial.actualizarStats();
    Calculadora.calcCrypto();
    Calculadora.calcApuesta();

    // Cargar precios
    await this.cargarPrecios();

    // Actualizar precios cada minuto
    setInterval(() => this.cargarPrecios(), CONFIG.intervalos.precios);

    // Cerrar modal al click fuera
    document.getElementById('modal')?.addEventListener('click', function (e) {
      if (e.target === this) Fichas.cerrar();
    });

    console.log('✅ JCAHS listo');
  },

  // Cargar precios de APIs
  async cargarPrecios() {
    const precios = await API.getPrecios();
    if (precios) {
      Dashboard.actualizarPrecios(precios);
      if (STATE.moduloActivo === 'crypto') {
        Crypto.actualizarPrecios();
        Crypto.actualizarDetalle(Crypto.cryptoSeleccionada);
      }
    }
  },

  // Cambiar idioma
  setLang(lang) {
    StateManager.cambiarIdioma(lang);
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.lang-btn[onclick="App.setLang('${lang}')"]`)?.classList.add('active');
  },

  // Modo emergencia
  emergencia() {
    STATE.emergenciaActiva = !STATE.emergenciaActiva;
    const banner = document.getElementById('em-banner');
    if (banner) banner.classList.toggle('show', STATE.emergenciaActiva);
    Router.ir('dashboard', document.querySelectorAll('.nav-btn')[0]);
    if (STATE.emergenciaActiva) {
      alert('🚨 MODO EMERGENCIA ACTIVO\n\nSolo oportunidades 75%+ confianza\nApalancamiento máximo 3x\nJCAHS para cuando llegues a tu meta\n\nActúa con disciplina.');
    }
  }

};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;