/**
 * JCAHS — Storage Module
 * Punto central de acceso a localStorage
 * Todas las claves documentadas en un solo lugar
 */

'use strict';

var STORAGE_KEYS = {
  // Apuestas
  HISTORIAL_APUESTAS:    'jcahs_historial_apuestas',
  HISTORIAL_LEGACY:      'jcahs_historial',

  // Crypto
  HISTORIAL_SENALES:     'jcahs_historial_senales',
  OPERACIONES_CRYPTO:    'jcahs_ops',
  WATCHLIST:             'jcahs_watchlist',
  SATOSHI_CHAT:          'jcahs_satoshi_chat',
  IA_CHATS:              'jcahs_ia_chats',

  // Backtesting (clave: sym + '_' + tf, ej. 'BTC_4h')
  BACKTEST_RESULTADOS:   'jcahs_backtest_resultados',
  NOTICIAS_TRADUCIDAS:   'jcahs_noticias_traducidas',

  // Macro y cache
  MACRO_CACHE:           'jcahs_macro_cache',
  MACRO_LAST_FETCH:      'jcahs_macro_last_fetch',
  COINGECKO_CACHE:       'jcahs_coingecko_cache',

  // Configuración
  HISTORIAL_MODO:        'jcahs_historial_modo',
  BACKTEST_TF:           'jcahs_backtest_tf',

  // Telegram dedup (TTL 60min)
  TELEGRAM_ENVIADOS:     'jcahs_telegram_enviados',

  // Quota tracking
  ODDSPAPI_USED:         'oddsPapiUsed',
  ODDSPAPI_REMAINING:    'oddsPapiRemaining',
  ODDSAPI_USED:          'oddsApiUsed',
  ODDSAPI_REMAINING:     'oddsApiRemaining',
  THEODDS_USED:          'jcahs_theodds_used',
  THEODDS_REMAINING:     'jcahs_theodds_remaining',
};

var Storage = {
  get: function(key) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch(e) {
      console.error('Storage.get error [' + key + ']:', e.message);
      return null;
    }
  },

  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch(e) {
      console.error('Storage.set error [' + key + ']:', e.message);
      return false;
    }
  },

  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch(e) {
      return false;
    }
  },

  // ─── Helpers específicos ──────────────────────────────────────────────────

  getHistorialApuestas: function() {
    return this.get(STORAGE_KEYS.HISTORIAL_APUESTAS) || [];
  },

  setHistorialApuestas: function(data) {
    return this.set(STORAGE_KEYS.HISTORIAL_APUESTAS, data);
  },

  // Backtest: clave compuesta sym + '_' + tf (ej. 'BTC_4h')
  getBacktestResultados: function() {
    return this.get(STORAGE_KEYS.BACKTEST_RESULTADOS) || {};
  },

  setBacktestResultados: function(data) {
    return this.set(STORAGE_KEYS.BACKTEST_RESULTADOS, data);
  },

  mergeBacktestResultados: function(nuevos) {
    var existentes = this.getBacktestResultados();
    return this.set(STORAGE_KEYS.BACKTEST_RESULTADOS, Object.assign({}, existentes, nuevos));
  },

  getMacroCache: function() {
    return this.get(STORAGE_KEYS.MACRO_CACHE);
  },

  setMacroCache: function(data) {
    return this.set(STORAGE_KEYS.MACRO_CACHE, Object.assign({}, data, { timestamp: Date.now() }));
  },

  isMacroCacheValid: function(horasMax) {
    horasMax = horasMax || 24;
    var cache = this.getMacroCache();
    if (!cache || !cache.timestamp) return false;
    return (Date.now() - cache.timestamp) < horasMax * 60 * 60 * 1000;
  },

  // TTL cache genérico para cualquier clave
  getCached: function(key, horasMax) {
    horasMax = horasMax || 3;
    var data = this.get(key);
    if (!data || !data._ts) return null;
    if ((Date.now() - data._ts) > horasMax * 60 * 60 * 1000) return null;
    return data.value;
  },

  setCached: function(key, value) {
    return this.set(key, { value: value, _ts: Date.now() });
  },
};
