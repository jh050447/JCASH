/**
 * JCAHS Proxy Worker
 * Cloudflare Worker — generic HTTP proxy with CORS headers.
 *
 * Rutas pathname (POST/GET):
 *   POST /telegram/send-with-buttons  — envía mensaje Telegram con botones ✅/❌
 *   POST /telegram/webhook            — recibe callback de Telegram (botones)
 *   POST /apuestas/guardar-pendiente  — guarda registro en KV como pendiente
 *   GET  /apuestas/pendientes         — lista confirmados pendientes de sync
 *   POST /apuestas/sincronizada       — marca registro como sincronizado (delete KV)
 *   GET  /apuestas/resultados-polymarket — lista resultados Polymarket resueltos por el cron
 *   POST /apuestas/resultado-aplicado    — borra resultado tras aplicarlo en historial.html
 *
 * Cron (scheduled handler, ver wrangler.proxy.toml [triggers] crons):
 *   Resuelve registros tipo:'polymarket' en polymkt_open_* cuya fechaCierre ya
 *   pasó, consultando la API real de Polymarket. Mecanismo PRINCIPAL — el
 *   respaldo client-side vive en crypto.html (resolverPolymarketPendientes).
 *
 * Rutas query string (legado):
 *   /?url=https://api.example.com/data             (generic proxy)
 *   /?url=...&provider=yahoo                        (Yahoo with browser headers)
 *   /?url=...&api=sportsapi                         (API-Sports)
 *   /?url=...&api=footballdata                      (Football-Data.org)
 *   /?url=...&api=owm                               (OpenWeatherMap)
 *   /?url=...&api=odds                              (The Odds API)
 *   /?url=...&api=gemini                            (Gemini)
 *   /?url=...&api=groq                              (Groq)
 *   /?url=...&api=tavily                            (Tavily)
 *   /?url=...&api=oddspapi                          (OddsPapi)
 *   /?url=...&api=oddsapio                          (odds-api.io)
 *   /?url=...&api=rapidapi&host=...                 (RapidAPI)
 *   /?url=...&api=finnhub                           (Finnhub)
 *   /?url=...&api=alphavantage                      (Alpha Vantage)
 *   /?telegram=1&chat_id=XXXXX&text=[encoded]       (Telegram simple — legado)
 *
 * Secrets en Cloudflare env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
 * FINNHUB_KEY, ALPHAVANTAGE_KEY, y los demás API keys.
 * KV binding: JCAHS_KV (configurar en wrangler.proxy.toml + dashboard)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
  'Cache-Control': 'no-cache',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url      = new URL(request.url);
    const pathname = url.pathname;

    // ── Keys (env secrets con fallback para wrangler dev) ──────────────────
    const OWM_KEY           = env.OWM_KEY           || '49d3ba9ad419cb6b820cb5b348efa66e';
    const ODDS_KEY          = env.ODDS_KEY           || '80e2cc925122c3aec2b46ba756ad0df1';
    const APISPORTS_KEY     = env.APISPORTS_KEY      || '9718242f5c1a4e31e5a14622569d087c';
    const FD_KEY            = env.FD_KEY             || 'b153b71ca08f4ae8bfe48f8f85f79014';
    const GEMINI_KEY        = env.GEMINI_KEY         || '';
    const GROQ_KEY          = env.GROQ_KEY           || '';
    const TAVILY_KEY        = env.TAVILY_KEY         || '';
    const ODDSPAPI_KEY      = env.ODDSPAPI_KEY       || '';
    const ODDS_API_IO_KEY   = env.ODDS_API_IO_KEY    || '';
    const RAPIDAPI_KEY      = env.RAPIDAPI_KEY       || '';
    const FINNHUB_KEY       = env.FINNHUB_KEY        || '';
    const ALPHAVANTAGE_KEY  = env.ALPHAVANTAGE_KEY   || '';
    const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
    const TELEGRAM_CHAT_ID   = env.TELEGRAM_CHAT_ID   || '1519036308';

    // ── Helper: enviar mensaje Telegram ────────────────────────────────────
    async function tgSend(method, body) {
      return fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    //  NUEVOS ENDPOINTS PATHNAME
    // ══════════════════════════════════════════════════════════════════════

    // ── POST /telegram/send-with-buttons ──────────────────────────────────
    // Envía mensaje Telegram con botones inline ✅ REGISTRAR / ❌ IGNORAR
    if (pathname === '/telegram/send-with-buttons') {
      if (!TELEGRAM_BOT_TOKEN) {
        return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
          status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const reqBody = await request.json();
        const { mensaje, callbackData } = reqBody;
        const res = await tgSend('sendMessage', {
          chat_id: TELEGRAM_CHAT_ID,
          text: mensaje,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ REGISTRAR', callback_data: 'registrar_' + callbackData },
              { text: '❌ IGNORAR',   callback_data: 'ignorar_'   + callbackData },
            ]],
          },
        });
        return new Response(await res.text(), {
          status: res.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── POST /telegram/webhook ─────────────────────────────────────────────
    // Recibe callbacks de Telegram cuando el usuario pulsa ✅ o ❌
    if (pathname === '/telegram/webhook') {
      try {
        const body = await request.json();
        const callbackQuery = body.callback_query;
        if (!callbackQuery) return new Response('ok');

        const data      = callbackQuery.data || '';
        const messageId = callbackQuery.message.message_id;
        const chatId    = callbackQuery.message.chat.id;

        if (data.startsWith('registrar_')) {
          const registroId      = data.replace('registrar_', '');
          const registroPendiente = env.JCAHS_KV
            ? await env.JCAHS_KV.get('pending_' + registroId)
            : null;

          if (registroPendiente) {
            const reg = JSON.parse(registroPendiente);
            const esPolymarket = reg.tipo === 'polymarket';

            // Mover a confirmados (TTL 30 días) — flujo de sync a localStorage sin cambios
            await env.JCAHS_KV.put('confirmed_' + registroId, registroPendiente, { expirationTtl: 86400 * 30 });
            await env.JCAHS_KV.delete('pending_' + registroId);

            // Polymarket: además persistir en polymkt_open_* — NO se borra al sincronizar
            // (a diferencia de confirmed_*), vive hasta que el cron detecte que la ventana
            // cerró y resuelva el resultado real contra la API de Polymarket.
            if (esPolymarket) {
              await env.JCAHS_KV.put('polymkt_open_' + registroId, registroPendiente, { expirationTtl: 86400 * 14 });
            }

            // Conteo separado por tipo — no mezclar metas de validación deportes/Polymarket
            const conteoKey = esPolymarket ? 'conteo_polymarket' : 'conteo_apuestas';
            const conteoRaw = env.JCAHS_KV ? await env.JCAHS_KV.get(conteoKey) : null;
            const conteo = JSON.parse(conteoRaw || '{"total":0}');
            conteo.total++;
            await env.JCAHS_KV.put(conteoKey, JSON.stringify(conteo));

            const total   = conteo.total;
            const meta    = total < 30 ? 30 : total < 100 ? 100 : total < 300 ? 300 : 1000;
            const faltan  = meta - total;
            const progreso = Math.round((total / meta) * 20);
            const barra   = '▓'.repeat(progreso) + '░'.repeat(20 - progreso);

            const tituloConfirmacion = esPolymarket
              ? `${reg.entrada?.token || ''} ${(reg.entrada?.timeframe || '').toUpperCase()} — ${reg.entrada?.direccion || ''}`
              : (reg.entrada?.partido || reg.partido || '');
            const etiqueta = esPolymarket ? 'Polymarket' : 'Apuesta';

            await tgSend('editMessageText', {
              chat_id: chatId,
              message_id: messageId,
              text: `✅ ${etiqueta} registrada — #${total}\n\n${tituloConfirmacion}\n\n📈 ${total}/${meta} señales · Faltan ${faltan} para validación\n${barra}`,
              reply_markup: { inline_keyboard: [] },
            });
          }
        }

        if (data.startsWith('ignorar_')) {
          const registroId = data.replace('ignorar_', '');
          if (env.JCAHS_KV) await env.JCAHS_KV.delete('pending_' + registroId);

          await tgSend('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: (callbackQuery.message.text || '') + '\n\n❌ Ignorada',
            reply_markup: { inline_keyboard: [] },
          });
        }

        // Requerido por Telegram — responder al callback
        await tgSend('answerCallbackQuery', { callback_query_id: callbackQuery.id });
        return new Response('ok');
      } catch (err) {
        console.error('webhook error:', err.message);
        return new Response('ok'); // siempre 200 a Telegram
      }
    }

    // ── POST /apuestas/guardar-pendiente ───────────────────────────────────
    // Guarda un registro en KV como pendiente (llamado desde index.html)
    if (pathname === '/apuestas/guardar-pendiente') {
      if (!env.JCAHS_KV) {
        return new Response(JSON.stringify({ error: 'KV not configured' }), {
          status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const { registroId, registro } = await request.json();
        await env.JCAHS_KV.put('pending_' + registroId, JSON.stringify(registro), { expirationTtl: 86400 * 7 });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── GET /apuestas/pendientes ───────────────────────────────────────────
    // Lista registros confirmados pendientes de sincronizar al browser
    if (pathname === '/apuestas/pendientes') {
      if (!env.JCAHS_KV) {
        return new Response('[]', { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
      try {
        const listed = await env.JCAHS_KV.list({ prefix: 'confirmed_' });
        const registros = [];
        for (const key of listed.keys) {
          const valor = await env.JCAHS_KV.get(key.name);
          if (valor) {
            try { registros.push(JSON.parse(valor)); } catch(_) {}
          }
        }
        return new Response(JSON.stringify(registros), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── POST /apuestas/sincronizada ────────────────────────────────────────
    // Elimina registro del KV una vez sincronizado al browser
    if (pathname === '/apuestas/sincronizada') {
      if (!env.JCAHS_KV) {
        return new Response('ok', { headers: CORS_HEADERS });
      }
      try {
        const { registroId } = await request.json();
        await env.JCAHS_KV.delete('confirmed_' + registroId);
        return new Response('ok', { headers: CORS_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── GET /apuestas/resultados-polymarket ────────────────────────────────
    // Lista resultados de Polymarket ya resueltos por el cron (scheduled), listos
    // para que historial.html los aplique a un registro existente en localStorage.
    if (pathname === '/apuestas/resultados-polymarket') {
      if (!env.JCAHS_KV) {
        return new Response('[]', { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
      try {
        const listed = await env.JCAHS_KV.list({ prefix: 'polymkt_resultado_' });
        const resultados = [];
        for (const key of listed.keys) {
          const valor = await env.JCAHS_KV.get(key.name);
          if (valor) {
            try { resultados.push(JSON.parse(valor)); } catch(_) {}
          }
        }
        return new Response(JSON.stringify(resultados), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── POST /apuestas/resultado-aplicado ──────────────────────────────────
    // Elimina el resultado del KV una vez que historial.html lo aplicó al registro local
    if (pathname === '/apuestas/resultado-aplicado') {
      if (!env.JCAHS_KV) {
        return new Response('ok', { headers: CORS_HEADERS });
      }
      try {
        const { registroId } = await request.json();
        await env.JCAHS_KV.delete('polymkt_resultado_' + registroId);
        return new Response('ok', { headers: CORS_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ENDPOINTS LEGADO (query string)
    // ══════════════════════════════════════════════════════════════════════

    const target   = url.searchParams.get('url');
    const provider = url.searchParams.get('provider') || '';
    const api      = url.searchParams.get('api') || '';

    // ── Telegram simple (legado) /?telegram=1&chat_id=...&text=... ─────────
    if (url.searchParams.get('telegram') === '1') {
      if (!TELEGRAM_BOT_TOKEN) {
        return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
          status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const chatId = url.searchParams.get('chat_id') || '';
      const text   = url.searchParams.get('text') || '';
      if (!chatId || !text) {
        return new Response(JSON.stringify({ error: 'Missing chat_id or text' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const tgUrl = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN +
        '/sendMessage?chat_id=' + encodeURIComponent(chatId) +
        '&text=' + encodeURIComponent(text) + '&parse_mode=HTML';
      try {
        const tgRes  = await fetch(tgUrl);
        const tgBody = await tgRes.text();
        return new Response(tgBody, {
          status: tgRes.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let targetUrl;
    let targetUrlObj;
    try {
      targetUrl    = decodeURIComponent(target);
      targetUrlObj = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid ?url= parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (api === 'owm') {
      targetUrlObj.searchParams.set('appid', OWM_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'odds') {
      targetUrlObj.searchParams.set('apiKey', ODDS_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'gemini') {
      targetUrlObj.searchParams.set('key', GEMINI_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'oddspapi') {
      targetUrlObj.searchParams.set('apiKey', ODDSPAPI_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'oddsapio') {
      targetUrlObj.searchParams.set('apiKey', ODDS_API_IO_KEY);
      targetUrl = targetUrlObj.toString();
    }
    if (api === 'alphavantage' || targetUrlObj.hostname.includes('alphavantage.co')) {
      targetUrlObj.searchParams.set('apikey', ALPHAVANTAGE_KEY);
      targetUrl = targetUrlObj.toString();
    }

    const reqHeaders = {};
    if (provider === 'yahoo') {
      Object.assign(reqHeaders, YAHOO_HEADERS);
    } else if (api === 'oddspapi') {
      reqHeaders['Accept'] = 'application/json';
    } else {
      reqHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      reqHeaders['Accept']     = 'application/json, text/plain, */*';
      reqHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    }

    if (api === 'sportsapi')   reqHeaders['x-apisports-key'] = APISPORTS_KEY;
    if (api === 'footballdata') reqHeaders['X-Auth-Token']    = FD_KEY;
    if (api === 'groq')        reqHeaders['Authorization']    = 'Bearer ' + GROQ_KEY;
    if (api === 'tavily')      reqHeaders['Authorization']    = 'Bearer ' + TAVILY_KEY;
    if (api === 'rapidapi') {
      reqHeaders['X-RapidAPI-Key']  = RAPIDAPI_KEY;
      reqHeaders['X-RapidAPI-Host'] = url.searchParams.get('host') || '';
    }
    if (api === 'finnhub' || targetUrlObj.hostname.includes('finnhub.io')) {
      reqHeaders['X-Finnhub-Token'] = FINNHUB_KEY;
    }

    const origAcceptEnc = request.headers.get('Accept-Encoding');
    if (origAcceptEnc) reqHeaders['Accept-Encoding'] = origAcceptEnc;

    try {
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const response = await fetch(targetUrl, {
        method:  request.method,
        headers: reqHeaders,
        body:    hasBody ? request.body : undefined,
        cf: { cacheTtl: 0, cacheEverything: false },
      });
      const body        = await response.text();
      const contentType = response.headers.get('Content-Type') || 'application/json';
      return new Response(body, {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': contentType, 'Cache-Control': 'no-store' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },

  // ── CRON: resolver ventanas Polymarket vencidas ────────────────────────
  // Mecanismo PRINCIPAL de resolución (corre solo, sin depender del navegador).
  // crypto.html tiene un respaldo client-side (resolverPolymarketPendientes)
  // por si este cron falla o KV queda con algún registro suelto.
  // Trigger configurado en wrangler.proxy.toml: [triggers] crons.
  async scheduled(event, env, ctx) {
    if (!env.JCAHS_KV) return;
    const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
    const TELEGRAM_CHAT_ID   = env.TELEGRAM_CHAT_ID   || '1519036308';
    const ahora = Date.now();

    let listed;
    try {
      listed = await env.JCAHS_KV.list({ prefix: 'polymkt_open_' });
    } catch (err) {
      console.error('cron: list polymkt_open_ failed', err.message);
      return;
    }

    for (const key of listed.keys) {
      try {
        const raw = await env.JCAHS_KV.get(key.name);
        if (!raw) continue;
        const reg = JSON.parse(raw);
        if (!reg.fechaCierre || reg.fechaCierre > ahora) continue; // ventana aún no cierra

        const slug = reg.entrada && reg.entrada.slug;
        if (!slug) continue;

        const resp = await fetch('https://gamma-api.polymarket.com/markets?slug=' + slug);
        const data = await resp.json();
        const m = Array.isArray(data) ? data[0] : null;
        if (!m || !m.closed) continue; // aún no resuelto oficialmente — reintenta el próximo cron

        const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : (m.outcomePrices || []);
        const precioUpFinal  = parseFloat(prices[0]);
        const resultadoReal  = precioUpFinal >= 0.5 ? 'UP' : 'DOWN';
        const acerto         = resultadoReal === reg.entrada.direccion;
        const stake          = reg.entrada.stake;
        const precioEntradaFrac = reg.entrada.precioEntrada / 100;
        const pnl = acerto ? stake * (1 / precioEntradaFrac - 1) : -stake;

        const registroId = key.name.replace('polymkt_open_', '');
        await env.JCAHS_KV.put('polymkt_resultado_' + registroId, JSON.stringify({
          id: registroId,
          estado: acerto ? 'ganada' : 'perdida',
          resultado: resultadoReal,
          acerto,
          pnl_usd: parseFloat(pnl.toFixed(2)),
        }), { expirationTtl: 86400 * 30 });

        await env.JCAHS_KV.delete(key.name);

        if (TELEGRAM_BOT_TOKEN) {
          const emoji = acerto ? '✅' : '❌';
          const texto = `${emoji} POLYMARKET RESUELTO — ${reg.entrada.token} ${String(reg.entrada.timeframe).toUpperCase()}\n\n` +
            `Apostaste: ${reg.entrada.direccion} · Resultado: ${resultadoReal}\n` +
            `${acerto ? 'GANASTE' : 'PERDISTE'}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
          await fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto }),
          });
        }
      } catch (err) {
        console.error('cron: error resolviendo', key.name, err.message);
      }
    }
  },
};
