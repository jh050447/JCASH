// ============================================================
// js/historial.js — Módulo Historial de operaciones
// ============================================================

const Historial = {

  // Mostrar/ocultar formulario
  toggleForm() {
    const f = document.getElementById('form-op');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
  },

  // Guardar operación
  guardar() {
    const tipo = document.getElementById('op-t')?.value;
    const desc = document.getElementById('op-d')?.value || 'Operación';
    const resultado = parseFloat(document.getElementById('op-r')?.value) || 0;
    const plataforma = document.getElementById('op-p')?.value || 'N/A';

    const op = {
      id: Utils.generarId(),
      tipo,
      desc,
      resultado,
      plataforma,
      fecha: Utils.fechaHoy()
    };

    StateManager.agregarOperacion(op);

    // Limpiar formulario
    document.getElementById('form-op').style.display = 'none';
    ['op-d', 'op-r', 'op-p'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    this.render();
    this.actualizarStats();
    Dashboard.actualizar();
    Utils.notificar('✅ Operación registrada correctamente', 'info');
  },

  // Renderizar lista
  render() {
    const lista = document.getElementById('h-lista');
    if (!lista) return;

    if (!STATE.operaciones.length) {
      lista.innerHTML = '<div style="text-align:center;padding:30px;color:var(--texto-dim);font-family:Share Tech Mono,monospace;font-size:12px">Sin operaciones registradas aún. ¡Registra tu primera operación arriba!</div>';
      return;
    }

    lista.innerHTML = STATE.operaciones.map(op => `
      <div class="hist-item">
        <div class="hist-tipo ${op.resultado >= 0 ? 'g' : 'r'}">${op.resultado >= 0 ? '✅ WIN' : '❌ LOSS'}</div>
        <div class="hist-desc">
          <div class="hist-nombre">${op.desc}</div>
          <div class="hist-sub">${op.tipo?.toUpperCase()} · ${op.plataforma} · ${op.fecha}</div>
        </div>
        <div class="hist-monto" style="color:${op.resultado >= 0 ? 'var(--verde)' : 'var(--rojo)'}">
          ${op.resultado >= 0 ? '+' : ''}$${op.resultado.toFixed(2)}
        </div>
      </div>
    `).join('');
  },

  // Actualizar estadísticas
  actualizarStats() {
    const ops = STATE.operaciones;
    const total = ops.reduce((s, o) => s + o.resultado, 0);
    const wr = StateManager.getWinRate();
    const best = ops.length ? Math.max(...ops.map(o => o.resultado)) : 0;

    const setEl = (id, val, clase) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = val; if (clase) el.className = clase; }
    };

    setEl('h-t', (total >= 0 ? '+' : '') + '$' + total.toFixed(2), 'hist-stat-val ' + (total >= 0 ? 'g' : 'r'));
    setEl('h-o', ops.length);
    setEl('h-w', wr + '%');
    setEl('h-b', '+$' + best.toFixed(2));
  }

};

window.Historial = Historial;