// Componentes de interfaz reutilizables del portal (sistema visual v4).
// Todo color pasa por tokens semánticos (src/index.css): funcionan en claro y oscuro.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, CheckCircle2, Info, Sun, Moon, MonitorSmartphone, ChevronRight } from 'lucide-react';
import { initials } from '../lib/format.js';
import { errorMessage } from '../lib/api.js';
import { useTheme, THEMES } from '../lib/theme.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Badge({ tone = 'slate', children, className, dot = false }) {
  return (
    <span className={cx('chip', `tone-${tone}`, className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', `dot-${tone}`)} />}
      {children}
    </span>
  );
}

/** Mosaico de ícono con tono: <IconTile icon={Wallet} tone="teal" size="sm|md|lg" />; también admite children (p. ej. una inicial). */
export function IconTile({ icon: Icon, tone = 'blue', size = 'md', className, iconClassName, children }) {
  const sizeClass = { sm: 'icon-tile-sm', md: '', lg: 'icon-tile-lg' }[size] ?? '';
  const iconSize = { sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-6 w-6' }[size];
  return (
    <span className={cx('icon-tile font-display font-bold', sizeClass, `tile-${tone}`, className)} aria-hidden="true">
      {Icon ? <Icon className={cx(iconSize, iconClassName)} strokeWidth={2} /> : children}
    </span>
  );
}

export function Avatar({ name, color = '#0065df', size = 28, title, ring = false, className }) {
  return (
    <span
      title={title ?? name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', ring && 'ring-2 ring-surface', className)}
      style={{ width: size, height: size, background: `linear-gradient(160deg, color-mix(in oklab, ${color} 82%, white), ${color})`, fontSize: Math.max(10, size * 0.38), boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)' }}
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
      {people.length > max && <span className="inline-flex items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-2 ring-2 ring-surface" style={{ width: size, height: size }}>+{people.length - max}</span>}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand', className)} aria-label="Cargando" />;
}

export function PageLoader({ error, onRetry }) {
  if (error) {
    return (
      <div className="card card-pad animate-pop mx-auto mt-10 max-w-md text-center">
        <IconTile icon={AlertTriangle} tone="red" size="lg" className="mx-auto" />
        <p className="mt-3 font-semibold">No pudimos cargar esta sección.</p>
        <p className="mt-1 text-sm text-muted">{error.status === 404 ? 'El registro no existe o fue eliminado.' : 'Revisá la conexión e intentá de nuevo.'}</p>
        {onRetry && <button type="button" className="btn btn-outline mt-4" onClick={onRetry}>Reintentar</button>}
      </div>
    );
  }
  return <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>;
}

export function EmptyState({ icon: Icon = Info, title, children, action, tone = 'blue', className }) {
  return (
    <div className={cx('grid-dots flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/70 px-6 py-10 text-center', className)}>
      <IconTile icon={Icon} tone={tone} size="lg" className="shadow-card" />
      <p className="mt-3 font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, icon: Icon, tone = 'blue', back }) {
  return (
    <header className="animate-rise mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <IconTile icon={Icon} tone={tone} size="lg" className="mt-0.5 hidden sm:inline-flex" />}
        <div className="min-w-0">
          {back}
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="font-display text-[26px] font-bold leading-tight sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Encabezado de sección dentro de una tarjeta: ícono en mosaico, título y acción a la derecha. */
export function SectionHead({ icon: Icon, tone = 'blue', title, hint, action, id, className, flush = false }) {
  return (
    <div className={cx('section-head', flush ? 'border-b border-line px-4 py-3.5 sm:px-5 sm:py-4' : 'mb-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <IconTile icon={Icon} tone={tone} size="sm" />}
        <div className="min-w-0">
          <h2 id={id} className="section-title truncate">{title}</h2>
          {hint && <p className="truncate text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

const STAT_TONE = {
  teal: { text: 'text-teal-ink', bar: 'bg-teal' },
  red: { text: 'text-coral-ink', bar: 'bg-coral' },
  blue: { text: 'text-brand-ink', bar: 'bg-brand' },
  amber: { text: 'text-amber-ink', bar: 'bg-amber' },
  violet: { text: 'text-violet-ink', bar: 'bg-violet' },
  slate: { text: 'text-ink', bar: 'bg-slate' },
};

/** Indicador: mosaico de ícono, valor grande y una barra de tono al pie. */
export function Stat({ label, value, hint, tone, icon: Icon, className, to }) {
  const t = STAT_TONE[tone] ?? { text: 'text-ink', bar: 'bg-line-strong' };
  const Tag = to ? 'a' : 'div';
  return (
    <Tag href={to} className={cx('card relative min-w-0 overflow-hidden p-4', to && 'card-hover block', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        {Icon && <IconTile icon={Icon} tone={tone ?? 'slate'} size="sm" />}
      </div>
      <p className={cx('kpi-value mt-2 truncate', t.text)}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
      <span className={cx('absolute inset-x-0 bottom-0 h-[3px] opacity-70', t.bar)} aria-hidden="true" />
    </Tag>
  );
}

export function ProgressBar({ value = 0, tone = 'brand', className, label }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = { brand: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber', red: 'bg-coral', violet: 'bg-violet' }[tone] ?? 'bg-brand';
  return (
    <div className={cx('track', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Fila de lista con flecha a la derecha (para enlaces dentro de tarjetas). */
export function RowArrow({ className }) {
  return <ChevronRight className={cx('h-4 w-4 shrink-0 text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-ink', className)} aria-hidden="true" />;
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
      {error && <p className="mt-1 text-xs font-medium text-coral-ink">{error}</p>}
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

// ── Tema ───────────────────────────────────────────────────────────────────
/** Botón sol/luna: alterna claro y oscuro. `light` = sobre fondo tinta. */
export function ThemeToggle({ className, light = false }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button type="button" onClick={toggle} aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'}
      className={cx('tap flex items-center justify-center rounded-xl transition', light ? 'text-panel-muted hover:bg-white/10 hover:text-white' : 'text-muted hover:bg-surface-3 hover:text-ink', className)}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Selector de tres opciones (automático, claro, oscuro). */
export function ThemePicker({ className }) {
  const { preference, setPreference } = useTheme();
  const icons = { auto: MonitorSmartphone, light: Sun, dark: Moon };
  return (
    <div className={cx('grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-2 p-1', className)} role="radiogroup" aria-label="Tema">
      {THEMES.map((t) => {
        const Icon = icons[t.value];
        const on = preference === t.value;
        return (
          <button key={t.value} type="button" role="radio" aria-checked={on} onClick={() => setPreference(t.value)} title={t.hint}
            className={cx('tap flex items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition', on ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink')}>
            <Icon className="h-4 w-4" />{t.label}
          </button>
        );
      })}
    </div>
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
  // Se monta en <body>: dentro de una tarjeta con animación (transform) el fondo fijo quedaría
  // recortado a la tarjeta en vez de cubrir la pantalla.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="animate-fade absolute inset-0 bg-panel/55 backdrop-blur-[3px]" aria-label="Cerrar" onClick={onClose} />
      <div ref={panel} className={cx('animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-pop sm:rounded-3xl', width)}>
        <span className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm -mr-1" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/60 px-5 py-3 sm:rounded-b-3xl">{footer}</div>}
      </div>
    </div>,
    document.body,
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
          <div key={t.id} className={cx('animate-pop pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-pop', t.tone === 'error' ? 'bg-coral text-white' : 'bg-contrast text-contrast-fg')}>
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
    <div className={cx('inline-flex rounded-xl border border-line bg-surface p-1 shadow-card', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold transition', value === t.value ? 'bg-contrast text-contrast-fg shadow-card' : 'text-muted hover:text-ink')}>
          {t.label}{t.count != null && <span className={cx('ml-1.5 tabular-nums', value === t.value ? 'opacity-70' : 'text-muted-2')}>{t.count}</span>}
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
          {request.message && <p className="text-sm text-ink-2">{request.message}</p>}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, tone: 'danger' })) … */
export const useConfirm = () => useContext(ConfirmContext);
