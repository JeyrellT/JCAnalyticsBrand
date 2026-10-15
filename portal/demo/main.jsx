// ============================================================================
//  demo/main.jsx — el portal completo en un solo archivo, sin servidor.
//  1. Abre SQLite en memoria (sql.js asm.js: JS puro, sin .wasm ni eval).
//  2. Corre migraciones y siembra los datos ficticios por la API real.
//  3. Conecta api() a ese backend (setTransport) y el router en modo memoria.
//  4. Monta la misma <Root /> de la app con un selector de personas en el login.
//  5. v3: push simulado (avisos tipo celular), motor de automatizaciones con su
//     propio intervalo y "Simular aviso" en la barra de la demo.
// ============================================================================

import './polyfills.js';
import { StrictMode, useCallback, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import { FlaskConical, Loader2, AlertTriangle, RefreshCw, BellRing } from 'lucide-react';
import '../src/index.css';
import { Root } from '../src/App.jsx';
import { api, setTransport, enableDemo } from '../src/lib/api.js';
import { setRouterMode } from '../src/lib/router.jsx';
import { ROLES } from '../shared/catalog.js';
import logoMark from '../src/assets/logo-mark.webp';
import { openDemoDatabase } from './sqljs-adapter.js';
import { createDemoBackend, DEMO_PASSWORD, VIEWER } from './backend.js';
import { createScenarios } from './scenarios.js';
import { PhoneNotifications, SimulateSheet, showPhoneNotification } from './notifications.jsx';

// ── Descargas: dentro de un artefacto no hay descargas ──────────────────────
let noticeTimer;
function showNotice(text) {
  let el = document.getElementById('demo-notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'demo-notice';
    el.setAttribute('role', 'status');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: 'calc(env(safe-area-inset-top, 0px) + 116px)', zIndex: '9999',
      width: 'max-content', maxWidth: 'calc(100vw - 32px)', padding: '10px 16px', borderRadius: '12px', background: '#071a36', color: '#fff',
      font: '600 14px/1.35 Inter, ui-sans-serif, system-ui, sans-serif', textAlign: 'center',
      boxShadow: '0 0 0 1px rgba(255,255,255,.18), 0 10px 30px rgba(7,26,54,.3)', pointerEvents: 'none', opacity: '0',
      transform: 'translate(-50%, -8px)', transition: 'opacity .18s ease, transform .18s ease',
    });
    document.body.appendChild(el);
  }
  el.textContent = text;
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translate(-50%, 0)'; });
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -8px)'; }, 2600);
}

const DOWNLOAD_NOTICE = 'Disponible en el portal publicado';
const isDownload = (a) => a.hasAttribute('download') || (a.getAttribute('href') ?? '').startsWith('/api/');

document.addEventListener('click', (event) => {
  const anchor = event.target instanceof Element ? event.target.closest('a[href^="/api/"], a[download]') : null;
  if (!anchor) return;
  event.preventDefault();
  event.stopPropagation();
  showNotice(DOWNLOAD_NOTICE);
}, true);

// Enlaces de descarga creados en memoria y "clickeados" sin estar en la página (archivo .ics).
const nativeAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click() {
  if (!this.isConnected && isDownload(this)) {
    showNotice(DOWNLOAD_NOTICE);
    return;
  }
  nativeAnchorClick.call(this);
};

// ── Quién está mirando (para la barra de la demo) ───────────────────────────
function createViewerStore(backend) {
  const listeners = new Set();
  let current = null;
  let key = '';
  return {
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get: () => current,
    sync() {
      const id = backend.sessions.get(VIEWER);
      const next = id == null ? null : backend.db.prepare('SELECT id, name, role, color FROM users WHERE id = ?').get(id) ?? null;
      const nextKey = JSON.stringify(next);
      if (nextKey === key) return;
      key = nextKey;
      current = next;
      listeners.forEach((fn) => fn());
    },
  };
}

function DemoBar({ store, scenarios }) {
  const viewer = useSyncExternalStore(store.subscribe, store.get);
  const [simulating, setSimulating] = useState(false);
  const closeSheet = useCallback(() => setSimulating(false), []);
  if (!viewer) return null;
  async function switchPersona() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ya sin sesión */ }
    // Un 401 avisa a la sesión de la app (onUnauthenticated) y vuelve al selector.
    await api('/api/me').catch(() => {});
  }
  const chip = 'flex shrink-0 items-center gap-1 rounded-lg bg-surface px-2.5 py-1 font-semibold text-amber-ink ring-1 ring-amber/40 transition hover:bg-amber/15';
  return (
    <>
      <div className="flex items-center gap-2 border-b border-amber/30 bg-amber-soft px-4 py-1.5 text-xs text-amber-ink lg:px-6">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate">
          <span className="font-bold">Demo</span> · {viewer.name.split(' ')[0]} <span className="opacity-75">({ROLES[viewer.role]?.label ?? viewer.role})</span>
        </p>
        <button type="button" onClick={() => setSimulating(true)} className={chip} aria-haspopup="dialog">
          <BellRing className="h-3.5 w-3.5" aria-hidden="true" />Simular aviso
        </button>
        <button type="button" onClick={switchPersona} className={chip} aria-label="Cambiar de persona">
          <span className="sm:hidden">Cambiar</span><span className="hidden sm:inline">Cambiar de persona</span>
        </button>
      </div>
      <SimulateSheet open={simulating} onClose={closeSheet} scenarios={scenarios} onNotice={showNotice} />
    </>
  );
}

/**
 * Motor de automatizaciones en la pestaña (en el servidor lo corre index.mjs cada
 * minuto): arranca con la primera persona, corre ~3 s después de cada ingreso y
 * luego cada 30 s. Nunca rompe la interfaz.
 */
function startAutomations(backend, viewer) {
  let interval = null;
  let soon = null;
  let current = null;
  const tick = () => {
    try {
      Promise.resolve(backend.ctx.automations.runDue()).catch((error) => console.warn('[demo] automatizaciones', error));
    } catch (error) {
      console.warn('[demo] automatizaciones', error);
    }
  };
  viewer.subscribe(() => {
    const id = viewer.get()?.id ?? null;
    if (id === current) return;
    current = id;
    clearTimeout(soon);
    if (id == null) return;
    soon = setTimeout(tick, 3000);
    interval ??= setInterval(tick, 30_000);
  });
}

// ── Arranque ────────────────────────────────────────────────────────────────
function Boot({ error }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <img src={logoMark} alt="" className="h-14 w-14 rounded-2xl bg-white p-1.5 shadow-sm" />
      {error ? (
        <>
          <AlertTriangle className="h-7 w-7 text-coral" aria-hidden="true" />
          <div>
            <p className="font-display text-lg font-bold">No se pudo preparar la demo</p>
            <p className="mt-1 max-w-xs text-sm text-muted">{String(error?.message ?? error).slice(0, 200)}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Reintentar</button>
        </>
      ) : (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden="true" />
          <div role="status">
            <p className="font-display text-lg font-bold">Preparando la demo…</p>
            <p className="mt-1 text-sm text-muted">Cargando datos ficticios del equipo en este dispositivo.</p>
          </div>
        </>
      )}
    </div>
  );
}

/** Deja que el navegador pinte la pantalla de carga antes del trabajo pesado. */
const nextPaint = () => new Promise((resolve) => {
  setTimeout(resolve, 120);
  requestAnimationFrame(() => setTimeout(resolve, 0));
});

async function boot() {
  const root = createRoot(document.getElementById('root'));
  flushSync(() => root.render(<Boot />));
  await nextPaint();
  try {
    const db = await openDemoDatabase(initSqlJs);
    performance.mark?.('demo:sqlite-ready');
    const backend = createDemoBackend({ db });
    await backend.seed();
    performance.mark?.('demo:seeded');
    const viewer = createViewerStore(backend);
    // Avisos: el push simulado muestra en pantalla lo que la política envía a quien mira.
    backend.simulatePush(showPhoneNotification);
    const scenarios = createScenarios(backend);
    setTransport(async (path, options) => {
      // "Probar ahora" del resumen se puede repetir en la demo (ver scenarios.freeDigest).
      if (String(options?.method ?? 'GET').toUpperCase() === 'POST' && path.split('?')[0] === '/api/automations/resumen_diario/run') {
        const id = backend.viewerId();
        if (id != null) scenarios.freeDigest(id);
      }
      const response = await backend.dispatch(path, options, VIEWER);
      viewer.sync();
      return response;
    });
    startAutomations(backend, viewer);
    enableDemo({ personas: backend.personas(), password: DEMO_PASSWORD });
    setRouterMode('memory', { initialPath: '/' });
    root.render(
      <StrictMode>
        <DemoBar store={viewer} scenarios={scenarios} />
        <Root />
        <PhoneNotifications />
      </StrictMode>,
    );
  } catch (error) {
    console.error('[demo] no se pudo iniciar', error);
    root.render(<Boot error={error} />);
  }
}

boot();
