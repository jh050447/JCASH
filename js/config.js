// ============================================================
// js/config.js — Configuración global de JCAHS
// ============================================================

const CONFIG = {

  // APP
  app: {
    nombre: 'JCAHS',
    version: '2.0',
    idioma: 'es'
  },

  // APIs
  apis: {
    coingecko: 'https://api.coingecko.com/api/v3',
    anthropic: 'https://api.anthropic.com/v1/messages',
    cryptopanic: 'https://cryptopanic.com/api/v1'
  },

  // CRYPTOS monitoreadas
  cryptos: [
    { id: 'bitcoin',  simbolo: 'BTC', nombre: 'Bitcoin' },
    { id: 'ethereum', simbolo: 'ETH', nombre: 'Ethereum' },
    { id: 'ripple',   simbolo: 'XRP', nombre: 'XRP' },
    { id: 'dogecoin', simbolo: 'DOGE', nombre: 'Dogecoin' }
  ],

  // CASAS DE APUESTAS Ecuador
  casas: [
    'Ecuabet',
    'Bet365',
    '1xBet',
    'Betano',
    '22Bet',
    'Betsson'
  ],

  // DEPORTES activos
  deportes: [
    { id: 'futbol', nombre: 'Fútbol',    icono: '⚽' },
    { id: 'tenis',  nombre: 'Tenis',     icono: '🎾' },
    { id: 'mma',    nombre: 'MMA/Boxeo', icono: '🥊' },
    { id: 'mundial',nombre: 'Mundial 2026', icono: '🏆' }
  ],

  // BANKROLL por defecto
  bankroll: {
    total: 500,
    reserva: 50,
    maxRiesgoOperacion: 10,
    maxApalancamiento: 5
  },

  // OKRs
  objetivos: {
    dia:    60,
    semana: 200,
    mes:    700,
    año:    8400
  },

  // ÍNDICE JCAHS — pesos de cada dimensión
  indice: {
    crypto:    0.25,
    deportes:  0.25,
    global:    0.20,
    tuEstado:  0.15,
    historico: 0.15
  },

  // ANTI-TILT
  antiTilt: {
    maxPerdidasSeguidas: 2,
    maxPerdidaDiaria: 0.30,
    reduccionRiesgo: 0.50
  },

  // INTERVALOS de actualización (ms)
  intervalos: {
    precios: 60000,
    reloj: 1000
  },

  // MODELO IA
  ia: {
    modelo: 'claude-sonnet-4-20250514',
    maxTokens: 1000
  }

};

// Exportar para uso global
window.CONFIG = CONFIG;