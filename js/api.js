// ============================================================
// js/api.js — Todas las llamadas a APIs externas
// ============================================================

const API = {

  // ============================================================
  // CRYPTO — CoinGecko
  // ============================================================
  async getPrecios() {
    const ids = CONFIG.cryptos.map(c => c.id).join(',');
    const url = `${CONFIG.apis.coingecko}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      STATE.precios = data;
      return data;
    } catch (e) {
      console.error('Error CoinGecko:', e);
      return null;
    }
  },

  // ============================================================
  // IA — Claude API
  // ============================================================
  async consultarIA(mensaje, sistema) {
    const preciosCtx = Object.entries(STATE.precios)
      .map(([k, v]) => `${k}: $${v?.usd?.toLocaleString() || 'N/A'} (${v?.usd_24h_change?.toFixed(2) || '0'}%)`)
      .join(', ');

    const opsCtx = STATE.operaciones.length
      ? `Operaciones recientes: ${STATE.operaciones.slice(0, 3).map(o => `${o.desc} ${o.resultado >= 0 ? '+' : ''}$${o.resultado}`).join(', ')}`
      : 'Sin operaciones registradas aún';

    const sistemaCompleto = `${sistema}
Precios actuales del mercado: ${preciosCtx}.
${opsCtx}.
Índice JCAHS hoy: ${STATE.indice.total}/10.
Bankroll disponible: $${StateManager.getDisponible()}.
Win rate histórico: ${StateManager.getWinRate()}%.
Responde siempre en español con datos concretos, odds específicas y estrategias accionables.`;

    try {
      const res = await fetch(CONFIG.apis.anthropic, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CONFIG.ia.modelo,
          max_tokens: CONFIG.ia.maxTokens,
          system: sistemaCompleto,
          messages: [{ role: 'user', content: mensaje }]
        })
      });
      const data = await res.json();
      return data.content?.[0]?.text || 'Error en la respuesta de IA.';
    } catch (e) {
      console.error('Error Claude API:', e);
      return 'Error de conexión con la IA. Verifica tu internet.';
    }
  },

  // ============================================================
  // FEAR & GREED INDEX
  // ============================================================
  async getFearGreed() {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await res.json();
      return data.data?.[0] || null;
    } catch (e) {
      return null;
    }
  }

};

window.API = API;