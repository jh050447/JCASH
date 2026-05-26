// ============================================================
// js/fichas.js — Fichas de decisión
// ============================================================

const Fichas = {

  datos: {
    btc: {
      n: 'FICHA #001', t: 'BTC/USDT — Scalping Largo', s: 'KuCoin · Futuros Perpetuos · 3x',
      tec: [['Tendencia 4H','ALCISTA ↑','g'],['RSI (14)','58.4 Neutral ✅',''],['MACD','Cruce alcista ✅','g'],['Soporte','$76,800',''],['Resistencia 🎯','$79,500','d']],
      com: [['Dirección','LARGO ↑','g'],['Entrada','$77,200',''],['Stop-Loss ⚠️','$76,400','r'],['Take Profit','$79,500 🎯','g'],['Apalancamiento','3x máximo','d'],['Ratio R/G','1:2.9 ✅','g']],
      ins: '1. KuCoin → Futuros → BTC/USDT Perp.\n2. Apalancamiento: 3x\n3. Orden LÍMITE a $77,200\n4. Stop-Loss PRIMERO: $76,400\n5. Take Profit: $79,500\n⚠️ NO entres sin stop puesto',
      pg: '71%', pp: '29%', mg: '+$28', mp: '-$12',
      ia: 'Momentum positivo con volumen confirmado. Dato Fed a las 15:00 — si no entraste antes de las 14:30, espera al anuncio. El riesgo sube considerablemente cerca de eventos macro.'
    },
    tenis: {
      n: 'FICHA #002', t: 'Alcaraz vs Zverev — Roland Garros', s: '1xBet · Pre-partido · Mejor odd disponible',
      tec: [['H2H Alcaraz','8 victorias','g'],['H2H Zverev','4 victorias',''],['Superficie','Arcilla 🟤','d'],['Alcaraz arcilla','87% victorias','g'],['Zverev condición','Molestia rodilla ⚠️','r']],
      com: [['Pick','Alcaraz gana','g'],['Casa','1xBet ✅','g'],['Odd','1.65','d'],['Odd mínima','1.55 (si baja no entres)','r'],['Tipo','Resultado directo',''],['Apuesta','$40-60','d']],
      ins: '1. Abre 1xBet\n2. Roland Garros → Alcaraz vs Zverev\n3. Selecciona: Alcaraz gana\n4. Verifica odd mínima 1.55\n5. Confirma y registra en HISTORIAL',
      pg: '74%', pp: '26%', mg: '+$42', mp: '-$50',
      ia: 'Alcaraz domina en arcilla con 87% victorias. Zverev tiene molestia en rodilla confirmada. La odd 1.65 tiene valor real — el mercado subestima a Alcaraz en esta superficie.'
    },
    funding: {
      n: 'FICHA #003', t: 'XRP — Funding Rate Positivo', s: 'KuCoin · Futuros · Ingreso pasivo diario',
      tec: [['Funding Rate','+0.025% cada 8h','g'],['Pagos/día','3 veces','g'],['Ganancia diaria','~0.075%','g'],['Riesgo precio','Bajo con 1x','g'],['Duración','Hasta que rate baje a 0%','']],
      com: [['Dirección','CORTO (cobrar funding)','g'],['Apalancamiento','1x — sin liquidación','g'],['Capital','$100-200','d'],['Ganancia/día','$1.50-3.00','g'],['Cuándo salir','Rate baja de 0.01%','r'],['Plataforma','KuCoin → Futuros → XRP','']],
      ins: '1. KuCoin → Futuros → XRP/USDT\n2. Apalancamiento: 1x\n3. Abre posición CORTA\n4. Cobras funding cada 8h automático\n5. Revisa la tasa diariamente',
      pg: '90%', pp: '10%', mg: '+$1.8/día', mp: 'Si XRP se mueve mucho',
      ia: 'El funding rate positivo significa que los traders largos te pagan por estar corto. Sin necesidad de dirección — ganas cada 8h. Cashflow pasivo real.'
    },
    earn: {
      n: 'FICHA #004', t: 'USDT Flexible — KuCoin Earn', s: 'KuCoin · Earn · Pasivo garantizado',
      tec: [['Tasa actual','10.5% anual','g'],['Ganancia diaria','$1.50 (con $150)','g'],['Ganancia mensual','~$45','g'],['Liquidez','Retiro inmediato','g'],['Riesgo','Mínimo','g']],
      com: [['Ir a','KuCoin → Earn → Flexible','g'],['Buscar','USDT Flexible',''],['Capital','$150-200','d'],['Plazo','Sin plazo fijo','g'],['Retiro','Inmediato','g'],['Resultado','+$1.50/día automático','g']],
      ins: '1. KuCoin → Earn → Flexible\n2. Busca USDT\n3. Click en Suscribir\n4. Ingresa el monto\n5. Los intereses se acumulan diariamente',
      pg: '99%', pp: '1%', mg: '+$1.5/día', mp: 'Riesgo de plataforma',
      ia: 'Capital parado no trabaja. Con $150 en USDT Earn al 10.5% anual generas $1.50 diarios sin hacer nada. Retiras cuando quieras.'
    }
  },

  // Abrir ficha
  abrir(id) {
    const f = this.datos[id];
    if (!f) return;

    const setEl = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
    const setHTML = (elId, val) => { const el = document.getElementById(elId); if (el) el.innerHTML = val; };

    setEl('f-n', f.n);
    setEl('f-t', f.t);
    setEl('f-s', f.s);
    setEl('f-ia', f.ia);
    setEl('f-pg', f.pg);
    setEl('f-pp', f.pp);
    setEl('f-mg', f.mg);
    setEl('f-mp', f.mp);

    setHTML('f-tec', f.tec.map(([k, v, c]) => `<div class="frow"><span class="fkey">${k}</span><span class="fval ${c}">${v}</span></div>`).join(''));
    setHTML('f-com', f.com.map(([k, v, c]) => `<div class="frow"><span class="fkey">${k}</span><span class="fval ${c}">${v}</span></div>`).join(''));
    setHTML('f-ins', f.ins.split('\n').map(p => `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03)">${p}</div>`).join(''));

    document.getElementById('modal').classList.add('show');
  },

  // Cerrar modal
  cerrar() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('show');
  },

  // Ejecutar operación
  ejecutar() {
    this.cerrar();
    Utils.notificar('✅ Registra el resultado en HISTORIAL cuando cierre', 'info');
    alert('✅ Operación aceptada\n\nRecuerda:\n1. Stop-Loss PRIMERO\n2. Take Profit SEGUNDO\n3. Registra en HISTORIAL\n\n¡Disciplina siempre!');
  }

};

window.Fichas = Fichas;