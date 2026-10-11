// Botón "Crear": acciones rápidas del día a día en una hoja (inferior en el celular, centrada en escritorio).
// También exporta <Sheet>, la hoja accesible que usa la navegación móvil.
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import {
  ListChecks, CalendarPlus, Send, Building2, HandCoins, ChevronRight, ArrowLeft, X, FolderKanban,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { Spinner, cx } from './ui.jsx';
import { SlaBadge } from './common.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
const focusFirst = (root) => (root?.querySelector('[data-autofocus]') ?? root?.querySelector(FOCUSABLE))?.focus({ preventScroll: true });

/**
 * Hoja modal: cierra con Escape o tocando el fondo, enfoca su primer control,
 * mantiene el foco adentro y lo devuelve al cerrar.
 * placement: 'bottom' (hoja inferior en móvil, centrada desde 640 px) o 'right' (cajón lateral).
 * focusKey: al cambiar (p. ej. un paso interno), el foco vuelve al primer control.
 */
export function Sheet({ label, onClose, placement = 'bottom', className, focusKey, children }) {
  const panel = useRef(null);
  const mounted = useRef(false);
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (mounted.current) focusFirst(panel.current);
    mounted.current = true;
  }, [focusKey]);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = panel.current;
    focusFirst(root);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !root) return;
      const items = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const right = placement === 'right';
  return (
    <div className={cx('fixed inset-0 z-50 flex', right ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-4')} role="dialog" aria-modal="true" aria-label={label}>
      <div className="animate-fade absolute inset-0 bg-ink/50 backdrop-blur-[2px]" aria-hidden="true" onClick={onClose} />
      <div ref={panel}
        className={cx('relative flex flex-col overflow-y-auto overscroll-contain shadow-2xl',
          right ? 'animate-drawer h-full w-[86%] max-w-xs' : 'animate-sheet sheet-panel max-h-[88dvh] w-full rounded-t-3xl sm:max-w-md sm:rounded-3xl',
          className ?? 'bg-white')}>
        {!right && <span className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />}
        {children}
      </div>
    </div>
  );
}

/** Encabezado de hoja: título visible, ayuda corta y botón de cerrar. */
export function SheetHeader({ title, hint, onClose, onBack }) {
  return (
    <div className="flex items-start gap-2 px-5 pb-2 pt-3 sm:pt-5">
      {onBack && (
        <button type="button" onClick={onBack} className="tap -ml-2 flex items-center justify-center rounded-xl text-ink hover:bg-slate-100" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1 pt-1.5">
        <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      <button type="button" onClick={onClose} className="tap -mr-2 flex items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-ink" aria-label="Cerrar">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

const TONES = {
  blue: 'bg-brand-soft text-brand',
  violet: 'bg-violet-50 text-violet-700',
  teal: 'bg-teal-soft text-teal-dark',
  amber: 'bg-amber-50 text-amber-700',
  ink: 'bg-ink text-white',
};

function ActionRow({ icon: Icon, tone, title, hint, to, onClick, autoFocus }) {
  const hintId = useId();
  const body = (
    <>
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', TONES[tone])}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
        <span id={hintId} className="block text-[13px] leading-snug text-muted">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </>
  );
  const props = {
    className: 'flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100',
    'aria-label': title,
    'aria-describedby': hintId,
    'data-autofocus': autoFocus ? '' : undefined,
  };
  return to
    ? <li><Link to={to} onClick={onClick} {...props}>{body}</Link></li>
    : <li><button type="button" onClick={onClick} {...props}>{body}</button></li>;
}

const SLA_ORDER = { late: 0, warn: 1, ok: 2 };

/** Proyectos de cliente activos, primero los que tienen el avance vencido. */
function ClientProjectPicker({ onPicked }) {
  const { data, error, reload } = useResource('/api/projects');
  const projects = useMemo(() => (data?.projects ?? [])
    .filter((p) => p.kind === 'cliente' && ['en_curso', 'en_revision'].includes(p.status))
    .sort((a, b) => (SLA_ORDER[a.sla_state] ?? 3) - (SLA_ORDER[b.sla_state] ?? 3) || (b.hours_since_update ?? 0) - (a.hours_since_update ?? 0)), [data]);

  if (error) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-sm text-muted">No pudimos cargar los proyectos.</p>
        <button type="button" className="btn btn-outline mt-3" onClick={reload}>Reintentar</button>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!projects.length) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-sm text-muted">No hay proyectos de cliente en curso ni en revisión.</p>
        <Link to="/proyectos" onClick={onPicked} className="btn btn-outline mt-3"><FolderKanban className="h-4 w-4" />Ver proyectos</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-1 px-2 pb-2" aria-label="Proyectos de cliente activos">
      {projects.map((p, i) => (
        <li key={p.id}>
          <Link to={`/proyectos/${p.id}?avance=1`} onClick={onPicked} data-autofocus={i === 0 ? '' : undefined}
            className="flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-50 active:bg-slate-100">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{p.client || p.name}</span>
              <span className="block truncate text-[13px] text-muted">{p.name}</span>
            </span>
            <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Hoja "Crear": se monta abierta; al desmontarse vuelve al menú. */
export default function QuickActions({ onClose }) {
  const { canInvest, settings } = useSession();
  const [step, setStep] = useState('menu');
  const sla = Number(settings?.update_sla_hours) || 72;

  return (
    <Sheet label="Crear" onClose={onClose} focusKey={step}>
      {step === 'menu' ? (
        <>
          <SheetHeader title="Crear" hint="¿Qué querés hacer?" onClose={onClose} />
          <ul className="space-y-1 px-2 pb-2">
            <ActionRow icon={ListChecks} tone="blue" title="Nueva tarea" hint="Algo por hacer, con responsable y fecha." to="/tablero?nueva=1" onClick={onClose} autoFocus />
            <ActionRow icon={CalendarPlus} tone="violet" title="Agendar cita" hint="Reunión, demo o entrega con un cliente o el equipo." to="/agenda?nueva=1" onClick={onClose} />
            <ActionRow icon={Send} tone="teal" title="Registrar avance a un cliente" hint={`Lo que le contamos al cliente (cada ${sla} h).`} onClick={() => setStep('avance')} />
            <ActionRow icon={Building2} tone="amber" title="Nuevo cliente" hint="Prospecto o cliente con su contacto." to="/clientes?nuevo=1" onClick={onClose} />
            {canInvest && <ActionRow icon={HandCoins} tone="ink" title="Registrar aporte" hint="Plata que un socio puso en una inversión." to="/inversiones" onClick={onClose} />}
          </ul>
        </>
      ) : (
        <>
          <SheetHeader title="¿De qué proyecto?" hint="Primero van los que tienen el avance vencido." onClose={onClose} onBack={() => setStep('menu')} />
          <ClientProjectPicker onPicked={onClose} />
        </>
      )}
    </Sheet>
  );
}
