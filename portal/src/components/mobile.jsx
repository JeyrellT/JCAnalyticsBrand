// v8 · Piezas para el celular, compartidas por los portales del equipo, inversionistas y clientes.
//  · useTypingFlag: marca <html data-typing> mientras el teclado está abierto (la barra inferior se esconde).
//  · SectionJump:   botón flotante "Secciones" en fichas largas; salta a cualquier bloque con un toque.
//  · PullToRefresh: en la app instalada (sin barra del navegador), tirar hacia abajo recarga.
import { useEffect, useRef, useState } from 'react';
import { ListTree, ArrowUp, RotateCw } from 'lucide-react';
import { Sheet, SheetHeader } from './QuickActions.jsx';
import { cx } from './ui.jsx';

const TEXT_INPUT = /^(text|email|tel|number|password|search|url|date|time|datetime-local|month)$/;
const isTypingTarget = (el) => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && TEXT_INPUT.test(el.type || 'text')));

/** Con un campo de texto enfocado en pantalla táctil, <html data-typing>. */
export function useTypingFlag() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia?.('(pointer: coarse)').matches) return undefined;
    const root = document.documentElement;
    let timer;
    const onIn = (e) => { clearTimeout(timer); if (isTypingTarget(e.target)) root.dataset.typing = '1'; };
    // Al pasar de un campo a otro llega focusout y enseguida focusin: se espera un instante.
    const onOut = () => { clearTimeout(timer); timer = setTimeout(() => { if (!isTypingTarget(document.activeElement)) delete root.dataset.typing; }, 120); };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { clearTimeout(timer); document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); delete root.dataset.typing; };
  }, []);
}

/**
 * Botón flotante con el índice de la página (los títulos .section-title dentro de <main>).
 * Aparece al bajar en páginas con 4 bloques o más; se oculta en escritorio.
 * @param {{ routeKey: string, offset?: number }} props  offset: alto de la barra superior fija.
 */
export function SectionJump({ routeKey, offset = 72 }) {
  const [items, setItems] = useState([]);
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;
    let timer;
    const scan = () => {
      const titles = [...main.querySelectorAll('.section-title')].filter((el) => el.offsetParent !== null && el.textContent.trim());
      setItems(titles.map((el) => el.textContent.trim()));
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(scan, 250); };
    later();
    const observer = new MutationObserver(later);
    observer.observe(main, { childList: true, subtree: true });
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [routeKey]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setShown(window.scrollY > 480)); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, []);

  if (items.length < 4) return null;

  const go = (index) => {
    setOpen(false);
    const el = [...document.querySelectorAll('main .section-title')].filter((t) => t.offsetParent !== null && t.textContent.trim())[index];
    const block = el?.closest('.card, section') ?? el;
    if (!block) return;
    const top = block.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ir a una sección de la página"
        className={cx('float-jump fixed right-4 z-20 flex h-11 items-center gap-1.5 rounded-full bg-contrast px-4 text-[13px] font-semibold text-contrast-fg shadow-raised lg:hidden',
          shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0')}>
        <ListTree className="h-4 w-4" aria-hidden="true" />Secciones
      </button>
      {open && (
        <Sheet label="Secciones de la página" onClose={() => setOpen(false)}>
          <SheetHeader title="Ir a…" hint="Saltá directo a cualquier parte de esta página." onClose={() => setOpen(false)} />
          <ul className="space-y-1 px-3 pb-4">
            <li>
              <button type="button" data-autofocus onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-brand-ink hover:bg-surface-2">
                <ArrowUp className="h-4 w-4" aria-hidden="true" />Arriba de todo
              </button>
            </li>
            {items.map((text, i) => (
              <li key={`${i}-${text}`}>
                <button type="button" onClick={() => go(i)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-surface-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-muted">{i + 1}</span>
                  <span className="min-w-0 truncate">{text}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}

const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

/**
 * App instalada: tirar hacia abajo desde arriba de la página recarga los datos.
 * (El navegador ya trae su propio gesto; aquí solo se activa en modo app.)
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const start = useRef(null);
  const pullRef = useRef(0);
  const THRESHOLD = 80;

  useEffect(() => {
    if (!isStandalone()) return undefined;
    const set = (v) => { pullRef.current = v; setPull(v); };
    const onStart = (e) => {
      const blocked = document.body.style.overflow === 'hidden' || document.documentElement.dataset.typing;
      start.current = window.scrollY <= 0 && !blocked && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) { set(0); return; }
      set(Math.min(130, dy * 0.5));
    };
    const onEnd = () => {
      if (start.current != null && pullRef.current >= THRESHOLD) {
        set(THRESHOLD);
        window.location.reload();
        return;
      }
      start.current = null;
      set(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  if (!pull) return null;
  const ready = pull >= THRESHOLD;
  return (
    <div className="ptr-indicator pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center" style={{ transform: `translateY(calc(env(safe-area-inset-top, 0px) + ${pull - 28}px))`, opacity: Math.min(1, pull / 50) }} aria-hidden="true">
      <span className={cx('flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-raised', ready ? 'text-brand-ink' : 'text-muted')}>
        <RotateCw className={cx('h-5 w-5', ready && 'animate-spin')} style={ready ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </span>
    </div>
  );
}

/**
 * Listas largas: muestra las primeras `limit` y un botón "Ver N más" (en celular evita pantallas eternas).
 * Si `keepIndex` cae más abajo (p. ej. un aviso que se abrió desde una notificación), se muestra todo.
 */
export function useLimited(items, limit, keepIndex = -1) {
  const [all, setAll] = useState(false);
  const list = items ?? [];
  const full = all || list.length <= limit + 2 || keepIndex >= limit;
  const visible = full ? list : list.slice(0, limit);
  const hidden = list.length - visible.length;
  const more = hidden > 0 ? (
    <button type="button" onClick={() => setAll(true)} className="btn btn-outline mt-3 w-full">
      Ver {hidden} más
    </button>
  ) : null;
  return [visible, more];
}
