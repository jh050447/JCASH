// ============================================================
// js/asesores.js — Módulo Asesores IA
// ============================================================

const Asesores = {

  sistemas: {
    MASTER: 'Eres JCAHS-MASTER, asesor financiero experto en crypto y apuestas deportivas. Das estrategias de cashflow concretas con números reales. Siempre orientado a generar dinero con disciplina y gestión de riesgo.',
    BTC: 'Eres JCAHS-BTC, especialista en Bitcoin y criptomonedas. Analizas RSI, MACD, funding rates, scalping y swing trading. Siempre das fichas de decisión concretas con entrada, stop-loss y take profit.',
    ETH: 'Eres JCAHS-ETH, especialista en Ethereum, altcoins y DeFi. Analizas oportunidades en ETH, memecoins y yield farming con gestión de riesgo.',
    FUTBOL: 'Eres JCAHS-FUTBOL, especialista en apuestas de fútbol. Analizas todos los mercados: resultado, goles, córners, tarjetas, handicaps. Siempre comparas odds entre casas de apuestas de Ecuador.',
    TENIS: 'Eres JCAHS-TENIS, especialista en apuestas de tenis. Analizas H2H, superficie, forma reciente y condición física. Das picks con valor matemático real.',
    MMA: 'Eres JCAHS-MMA, especialista en MMA y boxeo. Analizas estilos de pelea, rachas, métodos de victoria y valor de las odds. Das análisis técnicos de peleas.'
  },

  // Cambiar asesor
  seleccionar(nombre, avatar, sub, btn) {
    STATE.asesorActivo = nombre;
    STATE.sistemaIA = this.sistemas[nombre] || this.sistemas.MASTER;

    document.querySelectorAll('.ia-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const elAv = document.getElementById('ia-av');
    const elN = document.getElementById('ia-n');
    const elS = document.getElementById('ia-s');
    if (elAv) elAv.textContent = avatar;
    if (elN) elN.textContent = 'JCAHS-' + nombre;
    if (elS) elS.textContent = sub;

    const chat = document.getElementById('ia-chat');
    if (chat) {
      chat.innerHTML = `<div class="msg ia"><div class="msg-label">JCAHS-${nombre}</div>Asesor ${nombre} activado. ${sub}. ¿Qué analizamos hoy?</div>`;
    }
  },

  // Enviar mensaje
  async enviar() {
    const input = document.getElementById('ia-inp');
    const msg = input?.value?.trim();
    if (!msg) return;

    input.value = '';
    const chat = document.getElementById('ia-chat');
    const btn = document.getElementById('ia-sbtn');
    const typing = document.getElementById('typing');

    // Mostrar mensaje usuario
    if (chat) {
      chat.innerHTML += `<div class="msg user"><div class="msg-label">TÚ</div>${msg}</div>`;
      chat.scrollTop = chat.scrollHeight;
    }

    if (btn) btn.disabled = true;
    if (typing) typing.classList.add('show');

    // Llamar a la IA
    const sistema = STATE.sistemaIA || this.sistemas.MASTER;
    const respuesta = await API.consultarIA(msg, sistema);

    if (typing) typing.classList.remove('show');
    if (btn) btn.disabled = false;

    if (chat) {
      chat.innerHTML += `<div class="msg ia"><div class="msg-label">JCAHS-${STATE.asesorActivo}</div>${respuesta}</div>`;
      chat.scrollTop = chat.scrollHeight;
    }
  },

  // Pregunta rápida
  preguntaRapida(q) {
    const input = document.getElementById('ia-inp');
    if (input) input.value = q;
    Router.ir('asesores', document.querySelectorAll('.nav-btn')[5]);
    setTimeout(() => this.enviar(), 300);
  }

};

window.Asesores = Asesores;