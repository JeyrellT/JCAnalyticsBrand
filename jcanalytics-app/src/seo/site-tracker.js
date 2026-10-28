// ============================================================================
//  src/seo/site-tracker.js
//  Medición propia del sitio hacia el portal del equipo (portal.jcanalytic.com):
//  qué secciones se leen y cuánto tiempo, hasta dónde se baja, qué se toca y si
//  se llega a los formularios. También envía las consultas de quien deja sus datos.
//
//  Privacidad y costo:
//    · Sin cookies ni identificadores persistentes: un id al azar por pestaña
//      (sessionStorage) que muere al cerrarla.
//    · Nunca lee lo que la persona escribe en un campo; de los botones solo el texto visible.
//    · Respeta Do Not Track / Global Privacy Control y no mide navegadores
//      automatizados (prerender, pruebas, bots).
//    · Un solo IntersectionObserver, un listener de scroll pasivo con rAF y envíos
//      agrupados con sendBeacon (text/plain: sin preflight y sin bloquear la página).
// ============================================================================
import { PORTAL_URL } from '../components/site/links';
import { ATTRIBUTION } from './attribution';
import { locale } from '../i18n/locale';

const INGEST = import.meta.env.VITE_PORTAL_INGEST_URL || `${PORTAL_URL}/ingest`;
const FLUSH_MS = 15_000;
const MAX_QUEUE = 40;
const SECTION_MIN_MS = 300;

const optedOut = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
// Las pruebas del sitio activan la medición a propósito con esta marca.
const automated = () => navigator.webdriver === true && window.__JC_TRACK_TEST !== true;

let sessionId = null;
function sid() {
  if (sessionId) return sessionId;
  try { sessionId = window.sessionStorage.getItem('jc_sid'); } catch { /* almacenamiento bloqueado */ }
  if (!sessionId || !/^[a-z0-9]{16,40}$/.test(sessionId)) {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    sessionId = Array.from(bytes, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36);
    try { window.sessionStorage.setItem('jc_sid', sessionId); } catch { /* vale solo para esta página */ }
  }
  return sessionId;
}

function device() {
  const w = window.innerWidth;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return w < 768 ? 'mobile' : coarse && w < 1200 ? 'tablet' : 'desktop';
}

const visit = () => ({
  sid: sid(),
  lang: locale,
  device: device(),
  src: { source: ATTRIBUTION?.source ?? '', medium: ATTRIBUTION?.medium ?? '', campaign: ATTRIBUTION?.campaign ?? '', ref: document.referrer || '' },
});

function post(path, body, { beacon = true } = {}) {
  const payload = JSON.stringify(body);
  if (beacon && navigator.sendBeacon) {
    try { if (navigator.sendBeacon(`${INGEST}/${path}`, new Blob([payload], { type: 'text/plain' }))) return Promise.resolve(true); } catch { /* sigue con fetch */ }
  }
  return fetch(`${INGEST}/${path}`, { method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true, mode: 'cors' })
    .then((res) => res.ok, () => false);
}

// ── Cola de eventos ─────────────────────────────────────────────────────────
let active = false;
const queue = [];
const sectionMs = new Map();
let current = null; // { id, since }

function push(event) {
  if (!active) return;
  queue.push(event);
  if (queue.length >= MAX_QUEUE) flush();
}

/** Cierra el tramo de la sección visible (al cambiar de sección, ocultar la pestaña o enviar). */
function settleSection(restart) {
  if (!current) return;
  const now = performance.now();
  sectionMs.set(current.id, (sectionMs.get(current.id) ?? 0) + (now - current.since));
  current = restart ? { id: current.id, since: now } : null;
}

function flush() {
  if (!active) return;
  settleSection(document.visibilityState === 'visible');
  for (const [s, ms] of sectionMs) if (ms >= SECTION_MIN_MS) queue.push({ t: 'section', s, v: Math.round(ms) });
  sectionMs.clear();
  if (!queue.length) return;
  const events = queue.splice(0, MAX_QUEUE);
  post('events', { ...visit(), events });
}

export function trackEvent(t, data = {}) { push({ t, p: window.location.pathname, ...data }); }

// ── Qué se tocó ─────────────────────────────────────────────────────────────
function classify(el) {
  const href = el.getAttribute('href') ?? '';
  if (el.dataset.package) return 'package';
  if (href.startsWith('https://wa.me/')) return 'whatsapp';
  if (href.startsWith('tel:')) return 'phone';
  if (href.startsWith('mailto:')) return 'email';
  if (el.closest('#contacto form') || el.dataset.track === 'contact') return 'contact';
  if (el.closest('header, nav, #menu-movil')) return 'nav';
  if (el.closest('.works-list, .works-gallery, .package-card__example')) return 'project';
  return el.tagName === 'A' ? 'link' : 'button';
}

function label(el) {
  const text = el.dataset.trackLabel || el.getAttribute('aria-label') || el.textContent || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 60);
}

function onClick(event) {
  const el = event.target.closest?.('a[href], button');
  if (!el || el.closest('.assistant-dialog')) return;
  push({ t: 'click', p: window.location.pathname, k: classify(el), l: label(el), s: el.closest('section[id]')?.id });
}

const startedForms = new Set();
function onFocus(event) {
  const field = event.target.closest?.('input, textarea, select');
  const form = field?.closest('form');
  if (!form || field.type === 'hidden') return;
  const id = form.dataset.track || form.closest('section[id]')?.id;
  if (!id || startedForms.has(id)) return;
  startedForms.add(id);
  push({ t: 'form_start', p: window.location.pathname, k: id, s: form.closest('section[id]')?.id });
}

// ── Hasta dónde se baja ─────────────────────────────────────────────────────
const marks = new Set();
let scrollFrame = 0;
function onScroll() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    const doc = document.documentElement;
    const pct = ((window.scrollY + window.innerHeight) / Math.max(1, doc.scrollHeight)) * 100;
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark - 1 && !marks.has(mark)) { marks.add(mark); push({ t: 'scroll', p: window.location.pathname, v: mark }); }
    }
  });
}

/** Arranca la medición una sola vez por página. Devuelve una función para detenerla. */
export function startSiteTracking() {
  if (active || optedOut() || automated() || !INGEST) return () => {};
  active = true;
  trackEvent('view');

  // Una banda de 10 % en el centro de la pantalla: la sección que la cruza es la que se está leyendo.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        settleSection(false);
        if (document.visibilityState === 'visible') current = { id: entry.target.id, since: performance.now() };
      } else if (current?.id === entry.target.id) settleSection(false);
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  const observeAll = () => document.querySelectorAll('main section[id]').forEach((s) => observer.observe(s));
  observeAll();
  // Las secciones montadas después (el blog carga en diferido) también se miden.
  const late = window.setTimeout(observeAll, 4000);

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') { flush(); current = null; }
  };
  const timer = window.setInterval(flush, FLUSH_MS);
  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocus);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flush);
  onScroll();
  return () => {
    flush();
    active = false;
    observer.disconnect();
    window.clearTimeout(late);
    window.clearInterval(timer);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('focusin', onFocus);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flush);
  };
}

/**
 * Envía una consulta al portal (bandeja "Consultas"). Devuelve true si llegó.
 * `startedAt` (performance.now() al mostrar el formulario) sirve contra bots que llenan al instante.
 */
export async function sendLead({ channel, name, phone, email, need, message, packageName, website, startedAt }) {
  trackEvent('form_submit', { k: channel === 'devolucion' ? 'devolucion' : 'contacto', s: 'contacto' });
  flush();
  return post('lead', {
    ...visit(), channel, name, phone, email, need, message, package: packageName, website,
    page: window.location.pathname, elapsed: Math.round(performance.now() - (startedAt ?? 0)),
  }, { beacon: false });
}
