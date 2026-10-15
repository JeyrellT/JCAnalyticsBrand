// ============================================================================
//  demo/notifications.jsx
//  Avisos push SIMULADOS de la demo: un artefacto no puede usar service worker
//  ni push real, así que el push simulado del backend (backend.simulatePush)
//  llama showPhoneNotification() y aquí se dibuja un aviso tipo celular:
//  baja desde arriba, se apila (hasta 3), se va solo a los ~6 s, se descarta
//  deslizando y al tocarlo abre payload.url dentro de la demo.
//  También: <SimulateSheet>, la hoja "Simular un aviso" de la barra de la demo.
// ============================================================================

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Sunrise, Wallet, ListChecks, CalendarClock, BellRing } from 'lucide-react';
import logoMark from '../src/assets/logo-mark.webp';
import { navigate } from '../src/lib/router.jsx';
import { Modal, IconTile } from '../src/components/ui.jsx';

const MAX_VISIBLE = 3;
const LIFETIME_MS = 6000;
const LEAVE_MS = 260;

// ── Estado (fuera de React: el backend avisa desde cualquier lado) ──────────
let items = [];
let seq = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => items;

const safeUrl = (url) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/buzon');

/** Muestra un aviso tipo celular con el payload del push ({ title, body, url, category, … }). */
export function showPhoneNotification(payload) {
  const item = {
    id: ++seq,
    title: String(payload?.title ?? 'Aviso del portal'),
    body: String(payload?.body ?? ''),
    url: safeUrl(payload?.url),
    leaving: null,
  };
  const live = items.filter((i) => !i.leaving);
  // El más nuevo arriba; los que pasan de 3 se van (con su animación de salida).
  const overflow = new Set(live.slice(MAX_VISIBLE - 1).map((i) => i.id));
  items = [item, ...items.map((i) => (overflow.has(i.id) ? { ...i, leaving: 'up' } : i))];
  for (const id of overflow) setTimeout(() => remove(id), LEAVE_MS);
  emit();
  // Igual que el service worker real con el portal abierto: refresca los contadores del buzón.
  try { window.dispatchEvent(new CustomEvent('portal:push', { detail: { category: payload?.category ?? null } })); } catch { /* sin eventos */ }
}

function remove(id) {
  const next = items.filter((i) => i.id !== id);
  if (next.length !== items.length) { items = next; emit(); }
}

function dismiss(id, direction = 'up') {
  if (!items.some((i) => i.id === id && !i.leaving)) return;
  items = items.map((i) => (i.id === id ? { ...i, leaving: direction } : i));
  emit();
  setTimeout(() => remove(id), LEAVE_MS);
}

// ── Estilos: siguen el tema del portal (tokens de src/index.css) ────────────
const CSS = `
.jcp-n-stack { position: fixed; z-index: 9998; left: 0; right: 0; top: calc(env(safe-area-inset-top, 0px) + 8px);
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 8px; pointer-events: none; }
.jcp-n { position: relative; width: 100%; max-width: 420px; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
  cursor: pointer; border-radius: 20px; background: color-mix(in oklab, var(--surface) 88%, transparent); color: var(--ink);
  -webkit-backdrop-filter: saturate(180%) blur(18px); backdrop-filter: saturate(180%) blur(18px);
  box-shadow: var(--shadow-pop), 0 0 0 1px var(--line);
  animation: jcp-n-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1.12) backwards; transition: transform 200ms ease, opacity 200ms ease; }
.jcp-n[data-dragging] { transition: none; }
.jcp-n[data-leaving] { pointer-events: none; animation: jcp-n-out-up 240ms ease-in forwards; }
.jcp-n[data-leaving="left"] { animation-name: jcp-n-out-left; }
.jcp-n[data-leaving="right"] { animation-name: jcp-n-out-right; }
.jcp-n-open { display: flex; width: 100%; align-items: flex-start; gap: 11px; padding: 11px 14px 12px 11px; border: 0; background: transparent;
  color: inherit; text-align: left; cursor: pointer; border-radius: 20px;
  font: 400 14px/1.3 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Inter, ui-sans-serif, system-ui, sans-serif; }
.jcp-n-open:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.jcp-n-icon { flex: none; width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg, var(--panel-2) 0%, var(--panel) 100%); box-shadow: inset 0 0 0 1px var(--panel-line); margin-top: 1px; }
.jcp-n-icon img { width: 26px; height: 26px; object-fit: contain; }
.jcp-n-text { min-width: 0; flex: 1; }
.jcp-n-app { display: flex; gap: 4px; font-size: 12.5px; line-height: 1.2; color: var(--muted); margin-bottom: 2px; }
.jcp-n-app b { font-weight: 600; color: var(--ink-2); }
.jcp-n-title { display: block; font-size: 15px; line-height: 1.25; font-weight: 650; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jcp-n-body { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
  margin-top: 1px; font-size: 14px; line-height: 1.3; color: var(--ink-2); overflow-wrap: anywhere; }
.jcp-n-x { position: absolute; top: -6px; left: -6px; width: 24px; height: 24px; border-radius: 999px; border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--ink-2); font: 600 15px/1 system-ui, sans-serif;
  box-shadow: var(--shadow-raised), 0 0 0 1px var(--line); opacity: 0; transition: opacity 120ms ease; }
.jcp-n:hover .jcp-n-x, .jcp-n:focus-within .jcp-n-x { opacity: 1; }
@keyframes jcp-n-in { from { transform: translateY(-120%); opacity: 0; } to { transform: none; opacity: 1; } }
/* Sin "from": la salida arranca desde donde quedó el dedo. */
@keyframes jcp-n-out-up { to { transform: translateY(-115%); opacity: 0; } }
@keyframes jcp-n-out-left { to { transform: translateX(-110%); opacity: 0; } }
@keyframes jcp-n-out-right { to { transform: translateX(110%); opacity: 0; } }
@keyframes jcp-n-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes jcp-n-fade-out { to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .jcp-n { animation: jcp-n-fade-in 160ms ease backwards; transition: opacity 160ms ease; }
  .jcp-n[data-leaving], .jcp-n[data-leaving="left"], .jcp-n[data-leaving="right"] { animation: jcp-n-fade-out 160ms ease forwards; }
}
`;

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// ── Un aviso ────────────────────────────────────────────────────────────────
function Banner({ item }) {
  const card = useRef(null);
  const timer = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);

  const startTimer = useCallback((ms = LIFETIME_MS) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(item.id, 'up'), ms);
  }, [item.id]);

  useEffect(() => {
    startTimer();
    return () => clearTimeout(timer.current);
  }, [startTimer]);

  /** Sigue al dedo (hacia arriba o a los lados); 0,0 vuelve a su lugar. */
  const follow = (x, y) => {
    const el = card.current;
    if (!el) return;
    el.style.transform = (x || y) && !reducedMotion() ? `translate(${x}px, ${Math.min(0, y)}px)` : '';
    el.style.opacity = x ? String(Math.max(0.35, 1 - Math.abs(x) / 260)) : '';
  };

  function onPointerDown(event) {
    if (item.leaving || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest('.jcp-n-x')) return;
    clearTimeout(timer.current);
    moved.current = false;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    card.current?.setAttribute('data-dragging', '');
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* sin captura */ }
  }

  function onPointerMove(event) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
    if (moved.current) follow(Math.abs(dx) > Math.abs(dy) ? dx : 0, Math.abs(dy) >= Math.abs(dx) ? dy : 0);
  }

  function endDrag(event, cancelled = false) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    card.current?.removeAttribute('data-dragging');
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!cancelled && moved.current && (dy < -28 || Math.abs(dx) > 72)) {
      // Deslizar hacia arriba o a un lado lo descarta (la salida sigue desde donde quedó).
      dismiss(item.id, dy < -28 && Math.abs(dy) >= Math.abs(dx) ? 'up' : dx < 0 ? 'left' : 'right');
      return;
    }
    follow(0, 0);
    startTimer(LIFETIME_MS / 2);
  }

  // Con la captura del puntero el "click" llega al contenedor: aquí se abre (toque,
  // clic o Enter en el botón interno); el arrastre no cuenta como toque.
  function onClick() {
    if (moved.current) { moved.current = false; return; }
    if (item.leaving) return;
    dismiss(item.id, 'up');
    navigate(item.url);
  }

  return (
    <div ref={card} className="jcp-n" data-leaving={item.leaving ?? undefined} onClick={onClick}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)} onPointerCancel={(e) => endDrag(e, true)}
      onKeyDown={(e) => { if (e.key === 'Escape') dismiss(item.id, 'up'); }}>
      <button type="button" className="jcp-n-open" aria-label={`${item.title}. ${item.body}. Abrir en el portal`}>
        <span className="jcp-n-icon" aria-hidden="true"><img src={logoMark} alt="" draggable="false" /></span>
        <span className="jcp-n-text">
          <span className="jcp-n-app" aria-hidden="true"><b>JC Portal</b><span>·</span><span>ahora</span></span>
          <span className="jcp-n-title">{item.title}</span>
          {item.body && <span className="jcp-n-body">{item.body}</span>}
        </span>
      </button>
      <button type="button" className="jcp-n-x" aria-label="Descartar aviso"
        onClick={(e) => { e.stopPropagation(); dismiss(item.id, 'up'); }}>×</button>
    </div>
  );
}

/** Pila de avisos simulados (montar una sola vez, junto a <Root />). */
export function PhoneNotifications() {
  const list = useSyncExternalStore(subscribe, snapshot);
  return (
    <>
      <style>{CSS}</style>
      <div className="jcp-n-stack" aria-live="polite" aria-relevant="additions" aria-label="Avisos del portal (simulados)">
        {list.map((item) => <Banner key={item.id} item={item} />)}
      </div>
    </>
  );
}

// ── Hoja "Simular un aviso" ─────────────────────────────────────────────────
const SCENARIO_ICONS = { resumen: Sunrise, dinero: Wallet, tarea: ListChecks, cita: CalendarClock };

/**
 * @param {object} p
 * @param {boolean} p.open
 * @param {() => void} p.onClose
 * @param {{ list: () => Array<{key,title,hint}>, run: (key: string) => Promise<{shown:number,message:string|null}> }} p.scenarios
 * @param {(text: string) => void} p.onNotice  aviso corto en pantalla (p. ej. por qué no apareció)
 */
export function SimulateSheet({ open, onClose, scenarios, onNotice }) {
  const options = open ? scenarios.list() : [];

  function pick(key) {
    onClose();
    scenarios.run(key).then(
      (result) => { if (result?.message) onNotice(result.message); },
      (error) => {
        console.warn('[demo] no se pudo simular el aviso', error);
        onNotice('No se pudo simular el aviso. Probá de nuevo.');
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Simular un aviso" size="sm">
      <p className="text-sm text-muted">
        Otra persona del equipo hace la acción en el portal (de verdad, con sus permisos). El aviso te llega arriba, como en el celular,
        y queda en tu buzón. Tocalo para ir directo.
      </p>
      <ul className="mt-4 space-y-2">
        {options.map((s) => {
          const Icon = SCENARIO_ICONS[s.key] ?? BellRing;
          return (
            <li key={s.key}>
              <button type="button" onClick={() => pick(s.key)}
                className="card card-hover flex min-h-16 w-full items-center gap-3 p-3 text-left">
                <IconTile icon={Icon} tone="blue" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{s.title}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Las automatizaciones también avisan solas mientras la demo está abierta (vencimientos, avances de 72 h, fin de soporte…).
        En el portal publicado los avisos llegan al celular aunque la app esté cerrada.
      </p>
    </Modal>
  );
}
