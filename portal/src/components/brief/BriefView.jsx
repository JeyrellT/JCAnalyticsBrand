// ============================================================================
//  components/brief/BriefView.jsx
//  Brief en solo lectura (enviado, congelado o una versión anterior), por
//  secciones de BRIEF_SECTIONS y con briefFieldText para los valores.
// ============================================================================
import { useId } from 'react';
import { Check, Minus, ExternalLink, Lock } from 'lucide-react';
import { BRIEF_SECTIONS, briefFieldText } from '../../../shared/brief.js';
import { Badge, cx } from '../ui.jsx';
import { boolText, formatDateLong, splitLabel } from './brief-ui.js';

const empty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const host = (url) => {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; }
};

/** Valor de un campo para la vista. */
export function BriefValue({ field: f, value }) {
  if (f.type === 'bool') {
    const [on, off] = boolText(f.key);
    return value
      ? <span className="inline-flex items-center gap-1.5 font-medium text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-soft text-teal-ink"><Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /></span>{on}</span>
      : <span className="inline-flex items-center gap-1.5 text-muted"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-3"><Minus className="h-3.5 w-3.5" aria-hidden="true" /></span>{off}</span>;
  }
  if (empty(value)) return <span className="text-muted-2">Sin completar</span>;
  switch (f.type) {
    case 'multi':
      return <span className="flex flex-wrap gap-1.5">{value.map((k) => <Badge key={k} tone="blue">{f.options[k] ?? k}</Badge>)}</span>;
    case 'select': {
      const o = f.options[value];
      return (
        <span>
          <span className="font-medium text-ink">{briefFieldText(f, value)}</span>
          {typeof o === 'object' && o?.hint && <span className="block text-xs text-muted">{o.hint}</span>}
        </span>
      );
    }
    case 'links':
      return (
        <ol className="space-y-1.5">
          {value.map((l, i) => (
            <li key={`${l.url}-${i}`} className="flex min-w-0 items-center gap-2">
              <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-3 text-[11px] font-bold text-muted">{i + 1}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="link inline-flex min-w-0 items-center gap-1" title={l.url}>
                <span className="truncate">{l.label}</span>
                <span className="truncate font-normal text-muted">· {host(l.url)}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      );
    case 'url':
      return <a href={value} target="_blank" rel="noopener noreferrer" className="link inline-flex max-w-full items-center gap-1 break-all" title={value}>{host(value)}<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a>;
    case 'date':
      return <span className="font-medium text-ink">{formatDateLong(value)}</span>;
    case 'email':
      return <span className="select-all break-all font-medium text-ink">{value}</span>;
    case 'textarea':
      return <span className="block whitespace-pre-line break-words text-ink-2">{value}</span>;
    default:
      return <span className="break-words font-medium text-ink">{briefFieldText(f, value)}</span>;
  }
}

/**
 * @param {object} p
 * @param {object} p.data             datos del brief (normalizados por el servidor)
 * @param {string} [p.title]          si viene, se muestra como primera fila (útil en versiones)
 * @param {boolean} [p.compact]       una sola tarjeta con separadores (modales); si no, una tarjeta por sección
 * @param {boolean} [p.locked]        muestra el candado de "contenido congelado" en cada sección
 */
export function BriefView({ data, title, compact = false, locked = false, className }) {
  const uid = useId();
  const d = data ?? {};
  const sections = BRIEF_SECTIONS.map((s, index) => ({ ...s, index, fields: s.fields.filter((f) => !f.when || f.when(d)) }));
  const rows = (s) => (
    <dl className="divide-y divide-line">
      {s.index === 0 && title != null && (
        <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted sm:pt-0.5">Nombre del requerimiento</dt>
          <dd className="min-w-0 text-sm font-semibold text-ink">{title}</dd>
        </div>
      )}
      {s.fields.map((f) => {
        const [label, detail] = f.type === 'bool' && !f.required ? splitLabel(f.label) : [f.label, null];
        return (
          <div key={f.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted sm:pt-0.5">
              {f.required && f.type === 'bool' ? 'Confirmación' : label}
              {detail && <span className="mt-0.5 block font-normal normal-case tracking-normal text-muted-2">{detail}</span>}
            </dt>
            <dd className="min-w-0 text-sm">
              <BriefValue field={f} value={d[f.key]} />
              {f.required && f.type === 'bool' && <span className="mt-1 block text-xs leading-relaxed text-muted">{f.label}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (compact) {
    return (
      <div className={cx('space-y-5', className)}>
        {sections.map((s) => (
          <section key={s.key} aria-labelledby={`${uid}-${s.key}`}>
            <h3 id={`${uid}-${s.key}`} className="flex items-center gap-2 border-b border-line pb-2 font-display text-[15px] font-bold">
              <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-xs text-muted">{s.index + 1}</span>{s.title}
            </h3>
            {rows(s)}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className={cx('space-y-5 xl:space-y-6', className)}>
      {sections.map((s) => (
        <section key={s.key} className="card animate-rise overflow-hidden" aria-labelledby={`${uid}-${s.key}`}>
          <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-muted" aria-hidden="true">{s.index + 1}</span>
            <div className="min-w-0 flex-1">
              <h2 id={`${uid}-${s.key}`} className="section-title leading-tight">{s.title}</h2>
              <p className="mt-0.5 truncate text-xs text-muted">{s.hint}</p>
            </div>
            {locked && <Lock className="h-4 w-4 shrink-0 text-muted-2" aria-label="Contenido congelado" />}
          </header>
          <div className="px-4 sm:px-5">{rows(s)}</div>
        </section>
      ))}
    </div>
  );
}
