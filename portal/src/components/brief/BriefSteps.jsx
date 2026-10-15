// ============================================================================
//  components/brief/BriefSteps.jsx
//  Insignia de estado y línea de etapas del brief sobre BRIEF_FLOW, con los
//  desvíos "con observaciones" (vuelve al cliente) y "cancelado".
// ============================================================================
import { Check, AlertTriangle, Ban } from 'lucide-react';
import { BRIEF_FLOW } from '../../../shared/brief.js';
import { Badge, cx } from '../ui.jsx';
import { briefStatusMeta } from './brief-ui.js';

/** Insignia del estado con el lenguaje de cada lado (brief / solicitud). */
export function BriefStatusBadge({ status, audience = 'team', className }) {
  const meta = briefStatusMeta(status, audience);
  return <Badge tone={meta.tone} dot className={className}>{meta.label}</Badge>;
}

/**
 * Línea de etapas: borrador → enviado → aprobado → en producción → entregado → cerrado.
 * "Con observaciones" se dibuja sobre la etapa "enviado" (en ámbar) y "cancelado"
 * corta la línea donde se canceló (cancelledFrom, si se conoce).
 */
export function BriefSteps({ status, audience = 'team', cancelledFrom, className, showHint = true }) {
  const cancelled = status === 'cancelado';
  const observed = status === 'observado';
  const anchor = cancelled ? cancelledFrom : observed ? 'enviado' : status;
  const current = Math.max(BRIEF_FLOW.indexOf(anchor), cancelled ? -1 : 0);
  const finished = status === 'cerrado';
  const meta = briefStatusMeta(status, audience);
  const stepLabel = (s) => (s === 'enviado' && observed ? briefStatusMeta('observado', audience).label : briefStatusMeta(s, audience).label);

  return (
    <div className={className}>
      <ol className="grid grid-cols-6" aria-label="Etapas">
        {BRIEF_FLOW.map((s, i) => {
          const done = finished ? true : i < current;
          const here = !finished && i === current;
          const tone = here ? (cancelled ? 'red' : observed ? 'amber' : 'brand') : done ? 'teal' : 'none';
          return (
            <li key={s} className="relative flex flex-col items-center text-center" aria-current={here ? 'step' : undefined}>
              {i < BRIEF_FLOW.length - 1 && (
                <span className={cx('absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2', i < current || finished ? 'bg-teal' : 'bg-line')} aria-hidden="true" />
              )}
              <span className={cx('relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition',
                tone === 'teal' && 'border-teal bg-teal text-surface',
                tone === 'brand' && 'border-brand bg-surface text-brand-ink shadow-[0_0_0_4px_var(--ring)]',
                tone === 'amber' && 'border-amber bg-amber-soft text-amber-ink shadow-[0_0_0_4px_color-mix(in_oklab,var(--amber)_22%,transparent)]',
                tone === 'red' && 'border-coral bg-coral-soft text-coral-ink',
                tone === 'none' && 'border-line-strong bg-surface text-muted-2')}>
                {tone === 'teal' ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  : tone === 'amber' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    : tone === 'red' ? <Ban className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx('mt-1.5 hidden px-0.5 text-[11.5px] font-semibold leading-tight sm:block',
                here ? (observed ? 'text-amber-ink' : cancelled ? 'text-coral-ink' : 'text-ink') : done ? 'text-ink-2' : 'text-muted-2')}>
                {stepLabel(s)}
              </span>
              <span className="sr-only">{`${stepLabel(s)}${done ? ' (completada)' : here ? ' (actual)' : ''}`}</span>
            </li>
          );
        })}
      </ol>
      {showHint && (
        <p className={cx('mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm', cancelled ? 'text-coral-ink' : 'text-ink-2')}>
          <span className="font-semibold sm:hidden">{meta.label}{!cancelled && !finished && current >= 0 && <span className="font-normal text-muted"> · etapa {current + 1} de {BRIEF_FLOW.length}</span>}</span>
          <span className="text-muted">{meta.hint}</span>
        </p>
      )}
    </div>
  );
}
