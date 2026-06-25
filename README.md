# JCAHS — Sistema de Inteligencia Financiera Personal

**URL:** https://jh050447.github.io/JCASH/  
**Versión:** 2.0 — Arquitectura modular  
**Stack:** HTML/CSS/JS vanilla · GitHub Pages · Cloudflare Worker

---

## Módulos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Apuestas deportivas — Decision Engine, Mentor, CLV en vivo |
| `crypto.html` | Crypto — Scanner 8 tokens, Backtesting real, SATOSHI AI |
| `historial.html` | Historial — Validación, Monte Carlo, CLV histórico |

---

## APIs integradas

| API | Uso | Límite |
|-----|-----|--------|
| Kraken | OHLC crypto (fuente principal, sin geo-block) | Sin límite |
| OKX | Historial extendido para backtesting | Sin límite |
| OddsPapi | Value bets con de-vig Pinnacle | 250/mes |
| Finnhub | Noticias crypto | 60/min |
| Alpha Vantage | Macro S&P500, DXY, VIX | 25/día |
| Alternative.me | Fear & Greed Index | Sin límite |
| Groq LLaMA 3.3 | SATOSHI + FALCON AI | Generoso |
| Telegram Bot | Alertas al celular | Sin límite |

Todas las llamadas pasan por el Cloudflare Worker `jcahs-proxy.jh050447.workers.dev` para evitar CORS y proteger API keys.

---

## Arquitectura

Ver [ARQUITECTURA.md](ARQUITECTURA.md) para estructura completa de módulos, orden de imports y reglas.

```
js/core/     state.js · config.js · storage.js · notifications.js · api.js
js/shared/   math.js
js/crypto/   indicators.js · scanner.js · backtesting.js
js/betting/  kelly.js · decisionEngine.js
css/         main.css (2,067 líneas)
```

---

## Estado del sistema

- **Modo:** Simulación — no usar dinero real hasta 50 señales validadas en vivo
- **Validación:** Inicia 1 julio 2026 (reset cuota OddsPapi)
- **Meta:** \$20–50/día combinando apuestas deportivas + crypto

---

## Comandos

```bash
# Servidor local (Sistema Factoring JH)
$env:PYTHONIOENCODING="utf-8"
python app.py

# Deploy worker (después de editar worker-proxy.js)
# 1. git push → GitHub Pages actualiza automáticamente
# 2. Pegar worker-proxy.js completo en Cloudflare Dashboard (Workers)
```

---

## Notas técnicas

- **Encoding:** UTF-8 sin BOM en todos los archivos JS/HTML. PowerShell: `UTF8Encoding($false)`
- **Binance/Bybit:** geo-bloqueados desde IPs de Cloudflare — usar Kraken u OKX
- **Lambdas Poisson:** fijadas en 1.5 (local) / 1.2 (visitante) — sin endpoint de estadísticas disponible
- **Backtesting score:** umbrales adaptativos por TF — 1H≥65, 4H≥70, 1D≥40
