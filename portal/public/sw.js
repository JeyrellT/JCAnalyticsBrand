/* ============================================================================
   public/sw.js — service worker del Portal JC Analytics (se sirve tal cual, sin build).

   · Armazón sin conexión: "/" (index.html) y sus JS/CSS quedan en caché.
   · /assets/* (nombres con hash, inmutables): caché primero.
   · Navegación: red primero; sin red, el armazón guardado (la app muestra "sin conexión").
   · /api/*: siempre a la red. NUNCA se guardan datos de la API: hay clientes y plata,
     y el celular o la compu pueden ser compartidos.
   · Avisos push, clic en el aviso, renovación de la suscripción y globo del ícono.

   Al cambiar este archivo o los íconos de public/icons/, subí VERSION.
   ============================================================================ */

const VERSION = 'v3.0.0';
const SHELL_CACHE = `jcp-shell-${VERSION}`;
const ASSET_CACHE = 'jcp-assets';   // con hash: sobreviven entre versiones, con tope de entradas
const META_CACHE = 'jcp-meta';      // clave pública VAPID y plataforma (la escribe src/lib/pwa.js)
const META_URL = '/__portal/push-meta';
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, META_CACHE]);
const MAX_ASSETS = 150;
const SHELL_URL = '/';
const FALLBACK_URL = '/buzon';
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon-32.png', '/icons/icon-192.png', '/icons/badge-96.png', '/icons/apple-touch-icon-180.png'];

// ── Ciclo de vida ───────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('jcp-') && !KEEP.has(name)).map((name) => caches.delete(name)));
    try { await self.registration.navigationPreload?.enable(); } catch { /* no soportado */ }
    await self.clients.claim();
  })());
});

async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(PRECACHE.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok || response.redirected) return;
      await cache.put(url, response.clone());
      if (url === SHELL_URL) await precacheShellAssets(await response.text());
    } catch { /* sin red: se completa en la próxima visita */ }
  }));
}

/** Guarda los JS/CSS que pide index.html para que el armazón abra sin conexión. */
async function precacheShellAssets(html) {
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((m) => m[1]))];
  const cache = await caches.open(ASSET_CACHE);
  await Promise.all(urls.map(async (url) => {
    try {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    } catch { /* se guarda al usarse */ }
  }));
}

// ── Red ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API y salud: directo a la red, sin caché (ni siquiera sin conexión).
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(event));
  } else if (url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
  }
});

async function networkFirstPage(event) {
  try {
    const response = (await event.preloadResponse) || (await fetch(event.request));
    const type = response.headers.get('content-type') || '';
    if (response.ok && !response.redirected && type.includes('text/html')) {
      // Toda ruta de la SPA devuelve el mismo index.html: se guarda como "/".
      const copy = response.clone();
      event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {}));
    }
    return response;
  } catch {
    const cached = (await caches.match(SHELL_URL, { cacheName: SHELL_CACHE })) || (await caches.match(SHELL_URL));
    return cached || offlinePage();
  }
}

async function cacheFirstAsset(event) {
  const { request } = event;
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    event.waitUntil(cache.put(request, copy).then(() => trimAssets(cache)).catch(() => {}));
  }
  return response;
}

async function trimAssets(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_ASSETS;
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

function offlinePage() {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#071a36"><title>Sin conexión · JC Analytics</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f8fb;color:#071a36;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px">
<div><p style="font-size:20px;font-weight:700;margin:0 0 6px">Sin conexión</p>
<p style="margin:0 0 20px;color:#5b6b82">Revisá tu internet y volvé a intentar.</p>
<a href="/" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#0065df;color:#fff;font-weight:600;text-decoration:none">Reintentar</a></div>
</body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// ── Avisos push ─────────────────────────────────────────────────────────────
// Payload del servidor: { title, body, url, tag, category, badge, ts } (docs/v3-contrato.md).
self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: data.url, category: data.category },
    timestamp: data.ts,
    lang: 'es-CR',
  };
  // renotify sin tag es un error en Chrome: solo con tag.
  if (data.tag) { options.tag = data.tag; options.renotify = true; }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title, options),
    setBadge(data.badge),
    tellClients({ type: 'portal:push', category: data.category }),
  ]));
});

function readPayload(event) {
  let raw = {};
  if (event.data) {
    try { raw = event.data.json(); } catch {
      try { raw = { body: event.data.text() }; } catch { raw = {}; }
    }
  }
  if (typeof raw === 'string') raw = { body: raw };
  if (!raw || typeof raw !== 'object') raw = {};
  const ts = typeof raw.ts === 'number' ? raw.ts : Date.parse(raw.ts);
  return {
    title: text(raw.title, 120) || 'Portal JC Analytics',
    body: text(raw.body, 500) || 'Tenés un aviso nuevo en el portal.',
    url: samePath(raw.url),
    tag: text(raw.tag, 160),
    category: text(raw.category, 40) || null,
    badge: Number.isFinite(raw.badge) ? Math.max(0, Math.floor(raw.badge)) : null,
    ts: Number.isFinite(ts) ? ts : Date.now(),
  };
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Solo rutas del propio portal; cualquier otra cosa abre el buzón. */
function samePath(value) {
  try {
    const url = new URL(typeof value === 'string' && value ? value : FALLBACK_URL, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search + url.hash : FALLBACK_URL;
  } catch {
    return FALLBACK_URL;
  }
}

async function setBadge(count) {
  if (count == null) return;
  try {
    if (count > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(count);
    else if (count <= 0 && self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch { /* sin permiso o no soportado */ }
}

async function tellClients(message) {
  try {
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((client) => client.postMessage(message));
  } catch { /* nada abierto */ }
}

// ── Clic en el aviso: enfocar el portal abierto (o abrirlo) en la ruta del aviso ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openPortal(samePath(event.notification.data?.url)));
});

async function openPortal(path) {
  const target = new URL(path, self.location.origin).href;
  const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .filter((client) => new URL(client.url).origin === self.location.origin);
  const client = windows.find((c) => c.focused) || windows.find((c) => c.visibilityState === 'visible') || windows[0];
  if (client) {
    try { await client.focus(); } catch { /* el sistema no lo permitió */ }
    if (client.url === target) return;
    // 1) La app cambia de sección sin recargar (src/lib/pwa.js responde por el canal).
    if (await askClientToRoute(client, path)) return;
    // 2) Si no respondió, se navega la ventana completa.
    try {
      if (client.navigate && (await client.navigate(target))) return;
    } catch { /* ventana no controlada */ }
  }
  if (self.clients.openWindow) await self.clients.openWindow(target);
}

function askClientToRoute(client, path) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 1500);
    channel.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data === true); };
    try {
      client.postMessage({ type: 'portal:navigate', url: path }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

// ── El navegador renovó la suscripción: volver a registrarla en el portal ───
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(resubscribe(event.oldSubscription, event.newSubscription).catch(() => {}));
});

async function resubscribe(oldSubscription, newSubscription) {
  const meta = await readMeta();
  let subscription = newSubscription;
  if (!subscription) {
    let key = oldSubscription?.options?.applicationServerKey || (meta.publicKey ? base64UrlToBytes(meta.publicKey) : null);
    if (!key) {
      const config = await fetch('/api/push/config', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (config?.available && config.publicKey) key = base64UrlToBytes(config.publicKey);
    }
    if (!key) return;
    subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await portalPost('/api/push/subscribe', { subscription: subscription.toJSON(), platform: meta.platform || guessPlatform() });
  if (oldSubscription?.endpoint && oldSubscription.endpoint !== subscription.endpoint) {
    await portalPost('/api/push/unsubscribe', { endpoint: oldSubscription.endpoint }).catch(() => {});
  }
}

async function readMeta() {
  try {
    const hit = await (await caches.open(META_CACHE)).match(META_URL);
    return hit ? await hit.json() : {};
  } catch {
    return {};
  }
}

async function portalPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Portal-Request': '1' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  return response.json().catch(() => null);
}

function base64UrlToBytes(value) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function guessPlatform() {
  const ua = self.navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// ── Mensajes de la app ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const type = typeof event.data === 'string' ? event.data : event.data?.type;
  if (type === 'clear-badge') event.waitUntil(setBadge(0));
  else if (type === 'set-badge') event.waitUntil(setBadge(Number(event.data.count) || 0));
  else if (type === 'skip-waiting') self.skipWaiting();
});
