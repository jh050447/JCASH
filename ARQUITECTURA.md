# JCAHS — Arquitectura v2.0

**Fecha:** Junio 2026  
**Versión:** 2.0 — Refactorización modular completa

---

## Estructura de archivos

```
JCAHS/
├── index.html          # Apuestas deportivas — Decision Engine + Mentor
├── crypto.html         # Módulo crypto — Scanner + Backtesting + SATOSHI
├── historial.html      # Historial apuestas — CLV + Monte Carlo
│
├── js/
│   ├── core/
│   │   ├── state.js          # STATE global compartido (window.STATE)
│   │   ├── config.js         # Constantes del sistema (CONFIG)
│   │   ├── storage.js        # localStorage centralizado (Storage + STORAGE_KEYS)
│   │   ├── notifications.js  # Chrome + Telegram unificados (Notifications)
│   │   └── api.js            # Todas las APIs via Worker (API)
│   │
│   ├── shared/
│   │   └── math.js           # Funciones matemáticas puras compartidas
│   │                         # calcKelly, calcRSI, calcRSIArray,
│   │                         # calcEMA, calcEMAArray, calcATRArray,
│   │                         # calcMACD, calcBollingerBands, escHtml
│   │
│   ├── crypto/
│   │   ├── indicators.js     # Indicadores técnicos
│   │   │                     # calcATR, calcVolumeSignal,
│   │   │                     # calcStochasticRSI, calcSoportesResistencias,
│   │   │                     # calcDivergenciaAlcista, detectarCruceEMAReciente
│   │   ├── scanner.js        # Score + operación + confluencia
│   │   │                     # calcScore, calcOperacion,
│   │   │                     # calcRsiSemanal, analizarConfluencia
│   │   └── backtesting.js    # Motor backtesting + OKX histórico
│   │                         # cargarHistorialOKX, ejecutarBacktestingReal,
│   │                         # calcularEstadisticasBacktest,
│   │                         # generarStorytellingBacktest
│   │
│   └── betting/
│       ├── kelly.js          # Gestión bankroll apuestas
│       │                     # monteCarloBet, historialSimilar
│       └── decisionEngine.js # De-vig + edge + scoring
│                             # calcDeVigPinnacle, calcEdgePinnacle, calcKellyBet
│
└── css/
    └── main.css              # Estilos unificados (2,067 líneas)
                              # Consolida index.html + crypto.html + historial.html
```

---

## Orden de imports (obligatorio en los 3 HTML)

```html
<!-- 1. Core primero — definen STATE y CONFIG para todos los demás -->
<script src="js/core/state.js"></script>
<script src="js/core/config.js"></script>

<!-- 2. Shared — funciones puras sin dependencias -->
<script src="js/shared/math.js"></script>
<script src="js/core/storage.js"></script>
<script src="js/core/notifications.js"></script>
<script src="js/core/api.js"></script>

<!-- 3. Módulos específicos por página -->
<!-- Solo en crypto.html: -->
<script src="js/crypto/indicators.js"></script>
<script src="js/crypto/backtesting.js"></script>
<script src="js/crypto/scanner.js"></script>

<!-- Solo en index.html: -->
<script src="js/betting/kelly.js"></script>
<script src="js/betting/decisionEngine.js"></script>

<!-- 4. CSS (puede ir en <head> junto con los scripts o antes) -->
<link rel="stylesheet" href="css/main.css">
```

---

## STATE global

El STATE es un único objeto compartido entre módulos y HTML:

```js
// js/core/state.js — inicializa el schema base
window.STATE = window.STATE || {
  capital: 1000, bankroll: 200,
  precios: {}, ohlc: {}, fng: null, macro: {},
  valueBets: [], quota: { ... },
  // ... campos comunes
};

// Cada HTML extiende con sus campos específicos:
Object.assign(window.STATE, {
  // campos específicos de esa página (IIFEs de localStorage, etc.)
});
const STATE = window.STATE; // alias — Object.is(window.STATE, STATE) === true
```

### Campos por origen

| Campo | Origen | Usado en |
|-------|--------|----------|
| `precios` | state.js + HTML | crypto, index |
| `ohlc` | state.js + crypto.html | crypto |
| `capital`, `bankroll` | state.js | todas |
| `fng`, `macro` | state.js | crypto |
| `valueBets` | state.js + index.html | index |
| `quota.*` | state.js | index, crypto |
| `an`, `mentor`, `wizard` | index.html | index |
| `capitalCrypto` | crypto.html | crypto |

---

## Módulos y sus dependencias

```
math.js          ←── ninguna (funciones puras)
storage.js       ←── ninguna
config.js        ←── ninguna
state.js         ←── ninguna
notifications.js ←── storage.js (Storage)
api.js           ←── ninguna

indicators.js    ←── math.js (calcRSI, calcRSIArray, calcEMAArray), STATE global
backtesting.js   ←── math.js, STATE global, COIN_COLOR global, PROXY global
scanner.js       ←── math.js, indicators.js, STATE global, fmt global
betting/kelly.js ←── math.js (calcKelly via window)
decisionEngine.js←── math.js (calcKelly)
```

---

## Reglas de la arquitectura

1. **Nunca hardcodear URLs o keys en HTML** — usar `CONFIG.PROXY_URL`, `CONFIG.WORKER_URL`
2. **Nunca usar `localStorage` directamente** — usar `Storage.get(key)` / `Storage.set(key, val)`
3. **Nunca duplicar funciones matemáticas** — van en `math.js`
4. **Toda clave nueva de localStorage** → agregar primero a `STORAGE_KEYS` en `storage.js`
5. **Lógica nueva** → módulo JS; solo render/DOM va en los HTML
6. **Encoding** → siempre UTF-8 sin BOM. En PowerShell usar `UTF8Encoding($false)`

---

## Convenciones de nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Funciones puras | `calcXxx`, `fmtXxx` | `calcKelly`, `fmtPrecio` |
| Funciones de carga | `cargarXxx` | `cargarOHLCMultiTF` |
| Funciones de render | `renderXxx` | `renderCoinCard` |
| Claves localStorage | `jcahs_xxx` | `jcahs_backtest_resultados` |
| Claves backtesting | `SYM_tf` | `BTC_4h`, `ETH_1d` |
| Globals de módulo | `MAYUSCULAS` | `CONFIG`, `STATE`, `API` |

---

## Pendientes Fase 3 (post-validación, a partir de agosto 2026)

- [ ] Extraer renderizado a `js/ui/` (`betting-ui.js`, `crypto-ui.js`, `historial-ui.js`)
- [ ] Migrar CSS a variables CSS más granulares (por componente)
- [ ] Eliminar `fmt()` de crypto.html y centralizar en math.js
- [ ] Reemplazar `fmtPrecio` de crypto.html con versión en math.js
- [ ] Agregar tests automatizados con un runner ligero
- [ ] Migrar claves de localStorage que aún no están en `STORAGE_KEYS`

---

## Historial de refactorización

| Día | Cambios |
|-----|---------|
| 1 | Creados: `math.js`, `storage.js`, `notifications.js` |
| 2 | Imports en 3 HTML; eliminadas `calcKelly`, `calcRSI`, `escHtml` duplicadas |
| 3 | `indicators.js`, `backtesting.js`, `kelly.js`; −13 funciones de crypto.html |
| 4 | `scanner.js`, `decisionEngine.js`, `api.js`; −5 funciones de crypto.html |
| 5 | `state.js`, `config.js`; schema STATE documentado |
| 6 | CSS → `main.css` (2,067 líneas); STATE migrado a `Object.assign` |
| Fix | Encoding UTF-8 BOM corregido; `generarExplicaciones` restaurada |
