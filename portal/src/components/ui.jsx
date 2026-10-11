// Componentes de interfaz reutilizables del portal.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { initials } from '../lib/format.js';
import { errorMessage } from '../lib/api.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Badge({ tone = 'slate', children, className, dot = false }) {
  return (
    <span className={cx('chip', `tone-${tone}`, className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', `dot-${tone}`)} />}
      {children}
    </span>
  );
}

export function Avatar({ name, color = '#0065df', size = 28, title, ring = false }) {
  return (
    <span
      title={title ?? name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', ring && 'ring-2 ring-white')}
      style={{ width: size, height: size, background: color, fontSize: Math.max(10, size * 0.38) }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people = [], size = 24, max = 4 }) {
  const shown = people.slice(0, max);
  return (
    <span className="flex -space-x-1.5">
      {shown.map((p) => <Avatar key={p.id} name={p.name} color={p.color} size={size} ring />)}
      {people.length > max && <span className="inline-flex items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 ring-2 ring-white" style={{ width: size, height: size }}>+{people.length - max}</span>}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand', className)} aria-label="Cargando" />;
}

export function PageLoader({ error, onRetry }) {
  if (error) {
    return (
      <div className="card card-pad mx-auto mt-10 max-w-md text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-coral" />
        <p className="mt-3 font-semibold">No pudimos cargar esta sección.</p>
        <p className="mt-1 text-sm text-muted">{error.status === 404 ? 'El registro no existe o fue eliminado.' : 'Revisá la conexión e intentá de nuevo.'}</p>
        {onRetry && <button type="button" className="btn btn-outline mt-4" onClick={onRetry}>Reintentar</button>}
      </div>
    );
  }
  return <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>;
}

export function EmptyState({ icon: Icon = Info, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, tone, icon: Icon }) {
  const toneClass = { teal: 'text-teal-dark', red: 'text-coral', blue: 'text-brand', amber: 'text-amber-600', violet: 'text-violet-600' }[tone] ?? 'text-ink';
  return (
    <div className="card card-pad min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon className={cx('h-4 w-4 shrink-0', toneClass)} />}
      </div>
      <p className={cx('kpi-value mt-1.5 truncate', toneClass)}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value = 0, tone = 'brand', className, label }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = { brand: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber-500', red: 'bg-coral' }[tone];
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Formularios ───────────────────────────────────────────────────────────
export function Field({ label, hint, error, children, className }) {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {child}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

export function Select({ options, value, onChange, placeholder, id, className, ...props }) {
  return (
    <select id={id} className={cx('input', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Modal / hoja inferior en móvil ────────────────────────────────────────
let openModals = 0;
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Con modales anidados (p. ej. "Nuevo cliente" sobre "Nuevo proyecto"), el scroll
    // de la página se libera solo cuando se cierra el último.
    openModals += 1;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector('input:not([type=hidden]), select, textarea, button[data-autofocus]');
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      openModals = Math.max(0, openModals - 1);
      if (!openModals) document.body.style.overflow = '';
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" aria-label="Cerrar" onClick={onClose} />
      <div ref={panel} className={cx('animate-rise relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', width)}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ── Avisos (toasts) ───────────────────────────────────────────────────────
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('animate-rise pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg', t.tone === 'error' ? 'bg-coral text-white' : 'bg-ink text-white')}>
            {t.tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/** Envuelve una acción asíncrona: estado "guardando", aviso de éxito y error legible. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn, { success, onError } = {}) => {
    setBusy(true);
    try {
      const result = await fn();
      if (success) toast(success);
      return result;
    } catch (error) {
      const msg = errorMessage(error);
      onError?.(error, msg);
      toast(msg, 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return [run, busy];
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('inline-flex rounded-xl border border-line bg-white p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold transition', value === t.value ? 'bg-ink text-white' : 'text-muted hover:text-ink')}>
          {t.label}{t.count != null && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Confirmación dentro de la página ───────────────────────────────────────
// Reemplaza window.confirm (bloqueado en vistas embebidas y poco claro en móvil).
const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ title: '¿Confirmás?', confirmLabel: 'Confirmar', tone: 'primary', ...(typeof options === 'string' ? { message: options } : options), resolve });
  }), []);
  const close = (value) => { request?.resolve(value); setRequest(null); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal open onClose={() => close(false)} title={request.title} size="sm"
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={() => close(false)}>Cancelar</button>
            <button type="button" data-autofocus className={cx('btn', request.tone === 'danger' ? 'btn-danger' : 'btn-primary')} onClick={() => close(true)}>{request.confirmLabel}</button>
          </>}>
          {request.message && <p className="text-sm text-ink/80">{request.message}</p>}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, tone: 'danger' })) … */
export const useConfirm = () => useContext(ConfirmContext);
