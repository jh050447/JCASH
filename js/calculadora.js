// ============================================================
// js/calculadora.js — Calculadoras de riesgo
// ============================================================

const Calculadora = {

  // Calculadora Crypto
  calcCrypto() {
    const cap = parseFloat(document.getElementById('cc-cap')?.value) || 500;
    const rp = parseInt(document.getElementById('cc-r')?.value) || 5;
    const ap = parseInt(document.getElementById('cc-a')?.value) || 3;
    const odd = parseFloat(document.getElementById('cc-o')?.value) || 1.75;

    const rvEl = document.getElementById('cc-rv');
    const avEl = document.getElementById('cc-av');
    if (rvEl) rvEl.textContent = rp + '%';
    if (avEl) avEl.textContent = ap + 'x';

    const arr = cap * (rp / 100);
    const pos = arr * ap;
    const gan = arr * (odd - 1);
    const liq = -(100 / ap).toFixed(0);

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('cr-a', '$' + arr.toFixed(2));
    setEl('cr-p', '$' + pos.toFixed(2));
    setEl('cr-g', '+$' + gan.toFixed(2));
    setEl('cr-l', liq + '%');

    const est = document.getElementById('cc-e');
    if (est) {
      if (rp <= 10 && ap <= 5) { est.className = 'calc-estado ok'; est.textContent = '✅ OPERACIÓN SALUDABLE'; }
      else if (rp <= 20 && ap <= 10) { est.className = 'calc-estado warn'; est.textContent = '⚠️ RIESGO MODERADO'; }
      else { est.className = 'calc-estado bad'; est.textContent = '🔴 RIESGO ALTO — No recomendado'; }
    }
  },

  // Calculadora Apuesta Deportiva
  calcApuesta() {
    const bk = parseFloat(document.getElementById('ca-bk')?.value) || 500;
    const pct = parseInt(document.getElementById('ca-p')?.value) || 5;
    const odd = parseFloat(document.getElementById('ca-o')?.value) || 1.85;
    const prob = parseFloat(document.getElementById('ca-pr')?.value) || 65;

    const pvEl = document.getElementById('ca-pv');
    if (pvEl) pvEl.textContent = pct + '%';

    const ap = bk * (pct / 100);
    const gan = ap * (odd - 1);
    const ev = (prob / 100) * gan - (1 - prob / 100) * ap;
    const fair = (100 / prob).toFixed(2);

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('ca-ap', '$' + ap.toFixed(2));
    setEl('ca-g', '+$' + gan.toFixed(2));
    setEl('ca-ev', (ev >= 0 ? '+' : '') + '$' + ev.toFixed(2));
    setEl('ca-f', fair);

    const est = document.getElementById('ca-e');
    if (est) {
      if (ev > 0 && odd > fair) { est.className = 'calc-estado ok'; est.textContent = '✅ APUESTA CON VALOR POSITIVO'; }
      else if (ev > 0) { est.className = 'calc-estado warn'; est.textContent = '⚠️ VALOR MARGINAL — Evaluar'; }
      else { est.className = 'calc-estado bad'; est.textContent = '🔴 SIN VALOR — No apostar'; }
    }
  }

};

window.Calculadora = Calculadora;