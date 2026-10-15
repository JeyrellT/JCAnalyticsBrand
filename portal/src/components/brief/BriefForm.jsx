// ============================================================================
//  components/brief/BriefForm.jsx
//  Formulario del brief creativo dibujado a partir de BRIEF_SECTIONS (sin
//  listas de campos propias): tarjetas por sección numeradas, errores en
//  línea, avance hacia el envío, lista de lo que falta y aviso de plazo.
//  Controlado: value (datos) + onChange(datos, campo) y title + onTitleChange.
//  Lo usan el equipo (/briefs/:id) y el cliente (/cliente/solicitudes/:id).
// ============================================================================
import { useId, useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, Clock3, Plus, X, ListChecks, ChevronDown, CalendarCheck2, AlertTriangle } from 'lucide-react';
import {
  BRIEF_SECTIONS, BRIEF_FIELDS, BRIEF_TITLE_MAX, MAX_LINKS, LINK_LABEL_MAX,
  normalizeBriefData, briefChecklist, briefCompleteness, leadTimeProblem, earliestSendDate,
} from '../../../shared/brief.js';
import { Field, ProgressBar, cx } from '../ui.jsx';
import { formatDate } from '../../lib/format.js';
import { boolText, checkLabel, humanDates, splitLabel } from './brief-ui.js';

const LINK_PLACEHOLDERS = ['WhatsApp', 'Facebook', 'Sitio web'];
const NO_DATA = {};

const sectionOf = (field) => (field === 'title' ? BRIEF_SECTIONS[0].key : BRIEF_FIELDS[String(field).split('.')[0]]?.section);
const hasHints = (options) => Object.values(options ?? {}).some((o) => typeof o === 'object' && o?.hint);
const optionLabel = (o) => (typeof o === 'string' ? o : o.label);
/** Campos que ocupan todo el ancho de la tarjeta. */
const isWide = (f) => ['textarea', 'multi', 'links'].includes(f.type) || (f.type === 'text' && (f.max ?? 0) > 120) || (f.type === 'select' && hasHints(f.options)) || (f.type === 'bool' && f.required);
const dayDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Lleva a la persona al campo (desde la lista de verificación o tras un error). */
export function focusBriefField(field, idPrefix = 'brief') {
  if (!field || typeof document === 'undefined') return;
  const [key, row] = String(field).split('.');
  const el = document.getElementById(`${idPrefix}-f-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = row != null ? el.querySelector(`[data-row="${row}"] input[type=url]`) : null;
  (target ?? el.querySelector('input:not([type=hidden]), textarea, select, button'))?.focus({ preventScroll: true });
}

/** Etiqueta con la marca de obligatorio para enviar. */
function Req({ children, required }) {
  return <>{children}{required && <span className="ml-0.5 text-coral-ink" title="Obligatorio para enviar" aria-hidden="true">*</span>}</>;
}

function Counter({ value, max, min }) {
  const n = (value ?? '').length;
  if (!max) return null;
  const short = min && n > 0 && n < min;
  return <span className={cx('ml-auto shrink-0 tabular', short ? 'text-amber-ink' : n > max * 0.9 ? 'text-coral-ink' : 'text-muted-2')}>{short ? `${n}/${min} mín.` : `${n}/${max}`}</span>;
}

function hintWithCounter(hint, f, value) {
  const showCounter = (f.type === 'textarea' || (f.type === 'text' && f.max > 120)) && f.max;
  if (!showCounter) return hint;
  return <span className="flex gap-3"><span className="min-w-0">{hint}</span><Counter value={value} max={f.max} min={f.min} /></span>;
}

function MultiField({ f, value, onChange, error, disabled }) {
  const labelId = useId();
  const list = Array.isArray(value) ? value : [];
  const toggle = (k) => onChange(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  return (
    <fieldset aria-describedby={error ? `${labelId}-e` : undefined}>
      <legend id={labelId} className="label"><Req required={f.required}>{f.label}</Req></legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(f.options).map(([k, label]) => {
          const on = list.includes(k);
          return (
            <button key={k} type="button" aria-pressed={on} disabled={disabled} onClick={() => toggle(k)}
              className={cx('inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                on ? 'border-brand/60 bg-brand-soft font-semibold text-brand-ink shadow-card' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2')}>
              {on ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" /> : <Plus className="h-3.5 w-3.5 text-muted-2" aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>
      {error ? <p id={`${labelId}-e`} className="mt-1.5 text-xs font-medium text-coral-ink">{error}</p> : f.hint && <p className="mt-1.5 text-xs text-muted">{f.hint}</p>}
    </fieldset>
  );
}

function ChoiceCards({ f, value, onChange, error, disabled }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="label"><Req required={f.required}>{f.label}</Req></legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(f.options).map(([k, o]) => {
          const on = value === k;
          return (
            <label key={k} className={cx('relative flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition has-[:focus-visible]:shadow-[0_0_0_4px_var(--ring)]',
              on ? 'border-brand/60 bg-brand-soft shadow-card' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2', disabled && 'cursor-not-allowed opacity-60')}>
              <input type="radio" name={name} value={k} checked={on} disabled={disabled} onChange={() => onChange(k)} className="peer sr-only" />
              <span className={cx('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition', on ? 'border-brand bg-brand' : 'border-line-strong bg-surface')} aria-hidden="true">
                {on && <span className="h-1.5 w-1.5 rounded-full bg-surface" />}
              </span>
              <span className="min-w-0">
                <span className={cx('block text-sm font-semibold', on ? 'text-brand-ink' : 'text-ink')}>{optionLabel(o)}</span>
                {o.hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-coral-ink">{error}</p>}
    </fieldset>
  );
}

function BoolField({ f, value, onChange, error, disabled }) {
  const id = useId();
  const checked = value === true;
  if (f.required) {
    // Confirmación final: casilla grande con el texto completo.
    return (
      <div>
        <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition has-[:focus-visible]:shadow-[0_0_0_4px_var(--ring)]',
          checked ? 'border-teal/50 bg-teal-soft' : error ? 'border-coral/50 bg-coral-soft/50' : 'border-line bg-surface-2 hover:border-line-strong', disabled && 'cursor-not-allowed opacity-60')}>
          <input id={id} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} />
          <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition', checked ? 'border-teal bg-teal text-surface' : 'border-line-strong bg-surface')} aria-hidden="true">
            {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <span className="text-sm leading-relaxed text-ink">{f.label}<span className="ml-0.5 text-coral-ink" aria-hidden="true">*</span></span>
        </label>
        {error && <p className="mt-1.5 text-xs font-medium text-coral-ink">{error}</p>}
      </div>
    );
  }
  const [title, detail] = splitLabel(f.label);
  const [onText, offText] = boolText(f.key);
  return (
    <div className="h-full">
      <label htmlFor={id} className={cx('flex h-full min-h-[68px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition has-[:focus-visible]:shadow-[0_0_0_4px_var(--ring)]',
        checked ? 'border-brand/50 bg-brand-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2', disabled && 'cursor-not-allowed opacity-60')}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {detail && <span className="block text-xs text-muted">{detail}</span>}
          <span className={cx('mt-1 block text-xs font-semibold', checked ? 'text-brand-ink' : 'text-muted')}>{checked ? onText : offText}</span>
        </span>
        <input id={id} type="checkbox" role="switch" aria-checked={checked} className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-line-strong')} aria-hidden="true">
          <span className={cx('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform', checked && 'translate-x-5')} />
        </span>
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-coral-ink">{error}</p>}
    </div>
  );
}

function LinksField({ f, value, onChange, errors, disabled }) {
  const legendId = useId();
  const rows = Array.isArray(value) && value.length ? value : [{ label: '', url: '' }];
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i) => onChange(rows.length === 1 ? [{ label: '', url: '' }] : rows.filter((_, j) => j !== i));
  const general = errors[f.key];
  return (
    <fieldset aria-labelledby={legendId}>
      <legend id={legendId} className="label"><Req required={f.required}>{f.label}</Req></legend>
      <ol className="space-y-2.5">
        {rows.map((r, i) => {
          const err = errors[`${f.key}.${i}`];
          return (
            <li key={i} data-row={i} className={cx('rounded-xl border p-2.5 sm:p-2', err ? 'border-coral/50 bg-coral-soft/40' : 'border-line bg-surface-2/60')}>
              <div className="grid grid-cols-[28px_minmax(0,1fr)_40px] items-center gap-2 sm:grid-cols-[28px_minmax(0,11rem)_minmax(0,1fr)_40px]">
                <span className="num flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted shadow-card" aria-hidden="true">{i + 1}</span>
                <input className="input" aria-label={`Nombre del destino ${i + 1}`} placeholder={LINK_PLACEHOLDERS[i] ?? 'Destino'} maxLength={LINK_LABEL_MAX}
                  value={r.label ?? ''} disabled={disabled} onChange={(e) => set(i, { label: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-icon text-muted hover:text-coral-ink sm:order-last" onClick={() => remove(i)} disabled={disabled}
                  aria-label={`Quitar destino ${i + 1}`} title="Quitar"><X className="h-4 w-4" /></button>
                <input className="input col-span-3 sm:col-span-1" type="url" inputMode="url" autoComplete="url" aria-label={`Enlace del destino ${i + 1}`} placeholder="https://…" aria-invalid={!!err}
                  value={r.url ?? ''} disabled={disabled} onChange={(e) => set(i, { url: e.target.value })} />
              </div>
              {err && <p className="mt-1.5 pl-1 text-xs font-medium text-coral-ink sm:pl-9">{err}</p>}
            </li>
          );
        })}
      </ol>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        {rows.length < MAX_LINKS ? (
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange([...rows, { label: '', url: '' }])}>
            <Plus className="h-3.5 w-3.5" />Agregar destino
          </button>
        ) : <span className="text-xs text-muted">Máximo {MAX_LINKS} destinos.</span>}
        {general ? <p className="text-xs font-medium text-coral-ink">{general}</p> : f.hint && <p className="text-xs text-muted">{f.hint}</p>}
      </div>
    </fieldset>
  );
}

/** Un campo del brief según su tipo. */
function BriefField({ f, data, onField, onBlur, error, errors, disabled, today, leadDays, urgent }) {
  const value = data[f.key];
  const set = (v) => onField(f.key, v);
  const label = <Req required={f.required}>{f.label}</Req>;
  switch (f.type) {
    case 'multi': return <MultiField f={f} value={value} onChange={set} error={error} disabled={disabled} />;
    case 'links': return <LinksField f={f} value={value} onChange={set} errors={errors} disabled={disabled} />;
    case 'bool': return <BoolField f={f} value={value} onChange={set} error={error} disabled={disabled} />;
    case 'select':
      if (hasHints(f.options)) return <ChoiceCards f={f} value={value} onChange={set} error={error} disabled={disabled} />;
      return (
        <Field label={label} error={error} hint={f.hint}>
          {(id) => (
            <select id={id} className="input" value={value ?? ''} disabled={disabled} onChange={(e) => set(e.target.value || null)} onBlur={onBlur} aria-invalid={!!error}>
              <option value="">Elegí una opción</option>
              {Object.entries(f.options).map(([k, o]) => <option key={k} value={k}>{optionLabel(o)}</option>)}
            </select>
          )}
        </Field>
      );
    case 'textarea': {
      const rows = f.max >= 2500 ? 5 : f.max >= 1000 ? 4 : 3;
      return (
        <Field label={label} error={error} hint={hintWithCounter(f.hint, f, value)}>
          {(id) => <textarea id={id} className="input" rows={rows} maxLength={f.max} placeholder={f.placeholder} value={value ?? ''} disabled={disabled}
            onChange={(e) => set(e.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-required={f.required || undefined} />}
        </Field>
      );
    }
    case 'date': {
      // Pistas de calendario: la salida no puede ser antes del plazo mínimo; el final, no antes del inicio.
      const earliest = today ? (urgent ? today : earliestSendDate(today, leadDays)) : undefined;
      const min = f.key === 'send_start' ? earliest : f.key === 'send_end' ? data.send_start || earliest : undefined;
      const hint = f.key === 'send_start' && today
        ? (urgent ? 'Brief urgente: se acepta cualquier fecha desde hoy.' : `Mínimo ${leadDays} días de producción: desde el ${formatDate(earliest)}.`)
        : f.key === 'send_end' ? 'Opcional. Si la campaña dura varios días.' : f.hint;
      return (
        <Field label={label} error={error} hint={hint}>
          {(id) => <input id={id} type="date" className="input" value={value ?? ''} min={min} disabled={disabled}
            onChange={(e) => set(e.target.value || null)} onBlur={onBlur} aria-invalid={!!error} aria-required={f.required || undefined} />}
        </Field>
      );
    }
    default: {
      const type = f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text';
      return (
        <Field label={label} error={error} hint={hintWithCounter(f.hint, f, value)}>
          {(id) => <input id={id} type={type} className="input" maxLength={f.max} placeholder={f.placeholder} value={value ?? ''} disabled={disabled}
            inputMode={type === 'text' ? undefined : type} autoComplete={type === 'email' ? 'email' : 'off'}
            onChange={(e) => set(e.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-required={f.required || undefined} />}
        </Field>
      );
    }
  }
}

/** Un campo y, opcionalmente, algo justo después (el proyecto tras la marca). */
function FieldSlot({ children, after }) {
  return <>{children}{after}</>;
}

/** Mensaje del plazo adaptado a quien lo lee (el equipo puede marcar urgente; el cliente coordina). */
export function leadMessage(problem, audience) {
  if (!problem) return null;
  const text = humanDates(problem);
  if (audience === 'client') return text;
  return text.replace(/\s*Si es urgente.*$/, ' Si de verdad es urgente, marcá el brief como urgente con su motivo.');
}

/**
 * Panel de avance: porcentaje, lo que falta para enviar, aviso de plazo y las acciones.
 * Se usa en la columna lateral (escritorio) y al final del formulario (celular).
 */
export function BriefPanel({ checks, completeness, leadProblem, sendStart, today, leadDays, urgent, audience = 'team', actions, onPick, title = 'Para enviar' }) {
  const pending = checks.filter((c) => !c.ok);
  const done = checks.filter((c) => c.ok);
  const ready = pending.length === 0 && !leadProblem;
  const until = sendStart && today ? dayDiff(today, sendStart) : null;
  return (
    <section className="card overflow-hidden" aria-label="Avance del brief">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{title}</h2>
          <span className={cx('num text-2xl font-bold', ready ? 'text-teal-ink' : 'text-ink')}>{completeness.pct}<span className="text-base text-muted"> %</span></span>
        </div>
        <ProgressBar value={completeness.pct / 100} tone={ready ? 'teal' : completeness.pct >= 60 ? 'brand' : 'amber'} className="mt-2.5" label="Avance del brief" />
        <p className={cx('mt-2 flex items-center gap-1.5 text-sm font-semibold', ready ? 'text-teal-ink' : 'text-ink-2')}>
          {ready ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ListChecks className="h-4 w-4 text-muted" aria-hidden="true" />}
          {ready ? 'Listo para enviar' : pending.length ? `Faltan ${pending.length} ${pending.length === 1 ? 'punto' : 'puntos'} · ${completeness.done} de ${completeness.total} listos` : 'Revisá la fecha de envío'}
        </p>
      </div>

      {pending.length > 0 && (
        <ul className="divide-y divide-line" aria-label="Lo que falta para enviar">
          {pending.map((c) => (
            <li key={c.field}>
              <button type="button" onClick={() => onPick?.(c.field)} className="group flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-surface-2 sm:px-5">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-ink-2 group-hover:text-ink">{checkLabel(c)}</span>
                <span className="shrink-0 text-xs font-semibold text-brand-ink opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Ir</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 py-2 text-xs font-semibold text-muted transition hover:text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal" aria-hidden="true" />{done.length} {done.length === 1 ? 'punto listo' : 'puntos listos'}
            <ChevronDown className="ml-auto h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="space-y-1.5 px-4 pb-3 sm:px-5">
            {done.map((c) => (
              <li key={c.field} className="flex items-start gap-2 text-xs text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={2.6} aria-hidden="true" />{checkLabel(c)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="border-t border-line px-4 py-3.5 sm:px-5">
        {leadProblem ? (
          <p className="flex gap-2.5 rounded-xl bg-amber-soft px-3 py-2.5 text-sm text-amber-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{leadMessage(leadProblem, audience)}</span>
          </p>
        ) : sendStart ? (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <CalendarCheck2 className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
            <span>Sale el <span className="font-semibold">{formatDate(sendStart)}</span>{until != null && until >= 0 && <span className="text-muted"> · {until === 0 ? 'hoy' : until === 1 ? 'mañana' : `en ${until} días`}</span>}{urgent && <span className="font-semibold text-coral-ink"> · urgente</span>}</span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Pedimos al menos {leadDays} días de producción{today && <>: la fecha más próxima es el <span className="font-semibold text-ink-2">{formatDate(earliestSendDate(today, leadDays))}</span></>}.</span>
          </p>
        )}
      </div>

      {actions && <div className="flex flex-col gap-2 border-t border-line bg-surface-2/60 px-4 py-3.5 sm:px-5">{actions}</div>}
    </section>
  );
}

/** Barra compacta y fija del celular: avance + lo que falta, desplegable. */
function MobileProgress({ checks, completeness, leadProblem, onPick, quickActions, stickyTop, stickyTopLg }) {
  const [open, setOpen] = useState(false);
  const pending = checks.filter((c) => !c.ok);
  const ready = pending.length === 0 && !leadProblem;
  const count = pending.length + (leadProblem ? 1 : 0);
  return (
    <div className="sticky top-[var(--brief-sticky)] z-20 mb-5 lg:top-[var(--brief-sticky-lg)] xl:hidden" style={{ '--brief-sticky': stickyTop, '--brief-sticky-lg': stickyTopLg }}>
      <div className="glass flex items-center gap-3 rounded-2xl border border-line px-3 py-2 shadow-raised">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
          <span className={cx('num flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', ready ? 'bg-teal-soft text-teal-ink' : 'bg-brand-soft text-brand-ink')}>{completeness.pct}%</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{ready ? 'Listo para enviar' : `Falta${count === 1 ? '' : 'n'} ${count} para enviar`}</span>
            <ProgressBar value={completeness.pct / 100} tone={ready ? 'teal' : 'brand'} className="mt-1" label="Avance del brief" />
          </span>
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden="true" />
          <span className="sr-only">{open ? 'Ocultar lo que falta' : 'Ver lo que falta'}</span>
        </button>
        {quickActions}
      </div>
      {open && (
        <div className="animate-pop card mt-2 max-h-[55dvh] overflow-y-auto p-2 shadow-pop">
          {count === 0 ? <p className="flex items-center gap-2 px-2 py-2 text-sm text-teal-ink"><CheckCircle2 className="h-4 w-4" />Todo listo. Ya podés enviarlo.</p> : (
            <ul>
              {pending.map((c) => (
                <li key={c.field}>
                  <button type="button" className="flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink-2 hover:bg-surface-2" onClick={() => { setOpen(false); onPick(c.field); }}>
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />{checkLabel(c)}
                  </button>
                </li>
              ))}
              {leadProblem && (
                <li>
                  <button type="button" className="flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-amber-ink hover:bg-surface-2" onClick={() => { setOpen(false); onPick('send_start'); }}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Revisá la fecha de envío
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Formulario completo del brief.
 * @param {object} p
 * @param {object} p.value           datos del brief (forma de emptyBriefData)
 * @param {(data: object, field: string) => void} p.onChange
 * @param {string} p.title
 * @param {(title: string) => void} p.onTitleChange
 * @param {Record<string,string>} [p.errors]  errores a mostrar por campo (servidor / intento de envío); admite `links.0`
 * @param {boolean} [p.showErrors]   muestra también los errores de forma de campos no tocados
 * @param {'team'|'client'} [p.audience]
 * @param {string} p.today  AAAA-MM-DD   @param {number} p.leadDays   @param {boolean} [p.urgent]
 * @param {React.ReactNode} [p.meta]        contenido extra en la primera tarjeta (p. ej. proyecto)
 * @param {React.ReactNode} [p.actions]     botones del panel (guardar, enviar)
 * @param {React.ReactNode} [p.quickActions] botón compacto en la barra del celular
 * @param {React.ReactNode} [p.asideTop]    tarjetas sobre el panel (columna lateral en escritorio; antes del formulario en celular)
 * @param {string} [p.stickyTop]  distancia de la barra fija del celular al borde superior (alto de la barra del portal)
 * @param {string} [p.stickyTopLg]  lo mismo desde 1024 px (el equipo no tiene barra superior ahí; el portal de clientes sí)
 * @param {string} [p.asideStickyTop]  distancia de la columna fija de verificación (≥1280 px)
 */
export function BriefForm({
  value, onChange, title, onTitleChange, errors = {}, showErrors = false, audience = 'team', today, leadDays = 3, urgent = false,
  meta, actions, quickActions, asideTop, stickyTop = 'calc(max(0.625rem, env(safe-area-inset-top)) + 3.5rem)', stickyTopLg = '1rem', asideStickyTop = '1.5rem', disabled = false, idPrefix = 'brief',
}) {
  const [touched, setTouched] = useState({});
  const data = value ?? NO_DATA;
  const normalized = useMemo(() => normalizeBriefData(data), [data]);
  const shape = useMemo(() => {
    const out = {};
    for (const e of normalized.errors) if (!out[e.field]) out[e.field] = e.message;
    return out;
  }, [normalized]);
  const checks = useMemo(() => briefChecklist(normalized.data, { title }), [normalized, title]);
  const completeness = useMemo(() => briefCompleteness(normalized.data, { title }), [normalized, title]);
  const leadProblem = today ? leadTimeProblem(normalized.data, { today, leadDays, urgent }) : null;

  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  const onField = (key, v) => onChange({ ...data, [key]: v }, key);
  const errorOf = (key) => errors[key] ?? ((showErrors || touched[key]) ? shape[key] : null) ?? (key === 'send_start' ? leadMessage(leadProblem, audience) : null);
  // Los errores por fila de enlaces se muestran al salir del campo o tras un intento.
  const linkErrors = useMemo(() => {
    const out = {};
    for (const [k, msg] of Object.entries(shape)) if (k.startsWith('links') && (showErrors || touched.links)) out[k] = msg;
    for (const [k, msg] of Object.entries(errors)) if (k.startsWith('links')) out[k] = msg;
    return out;
  }, [shape, errors, showErrors, touched.links]);
  const pick = (field) => focusBriefField(field, idPrefix);
  const titleError = errors.title ?? (touched.title && (title ?? '').trim().length > 0 && (title ?? '').trim().length < 3 ? 'Mínimo 3 caracteres.' : null);

  const panel = (
    <BriefPanel checks={checks} completeness={completeness} leadProblem={leadProblem} sendStart={normalized.data.send_start} today={today} leadDays={leadDays}
      urgent={urgent} audience={audience} actions={actions} onPick={pick} />
  );

  return (
    <div className={cx('grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6', asideTop && 'xl:grid-rows-[auto_1fr]')}>
      {/* En el celular, lo lateral (ficha, contacto) va después del formulario. */}
      {asideTop && <div className="order-last space-y-5 xl:order-none xl:col-start-2 xl:row-start-1 xl:space-y-6">{asideTop}</div>}

      <div className={cx('min-w-0 xl:col-start-1 xl:row-start-1', asideTop && 'xl:row-span-2')}>
        <MobileProgress checks={checks} completeness={completeness} leadProblem={leadProblem} onPick={pick} quickActions={quickActions} stickyTop={stickyTop} stickyTopLg={stickyTopLg} />
        <div className="space-y-5 xl:space-y-6">
          {BRIEF_SECTIONS.map((s, index) => {
            const fields = s.fields.filter((f) => !f.when || f.when(data));
            const sectionChecks = checks.filter((c) => sectionOf(c.field) === s.key);
            const sectionDone = sectionChecks.length > 0 && sectionChecks.every((c) => c.ok);
            return (
              <section key={s.key} id={`${idPrefix}-s-${s.key}`} className="card animate-rise overflow-hidden" aria-labelledby={`${idPrefix}-s-${s.key}-t`}>
                <header className="flex items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
                  <span className={cx('num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition', sectionDone ? 'bg-teal text-surface' : 'bg-brand-soft text-brand-ink')} aria-hidden="true">
                    {sectionDone ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id={`${idPrefix}-s-${s.key}-t`} className="section-title leading-tight"><span className="sr-only">Paso {index + 1}: </span>{s.title}</h2>
                    <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
                  </div>
                  {sectionChecks.length > 0 && (
                    <span className={cx('chip shrink-0', sectionDone ? 'tone-teal' : 'tone-slate')} title="Puntos obligatorios listos en esta sección">
                      {sectionChecks.filter((c) => c.ok).length}/{sectionChecks.length}
                    </span>
                  )}
                </header>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-5 sm:p-5">
                  {index === 0 && (
                    <div id={`${idPrefix}-f-title`} className="scroll-mt-28 sm:col-span-2">
                      <Field label={<Req required>Nombre del requerimiento</Req>} error={titleError} hint="Cómo lo vamos a llamar en el portal.">
                        {(id) => <input id={id} className="input" value={title ?? ''} maxLength={BRIEF_TITLE_MAX} disabled={disabled} placeholder="Ej.: Giveaway Tacos · promoción de octubre"
                          onChange={(e) => onTitleChange(e.target.value)} onBlur={() => touch('title')} aria-invalid={!!titleError} aria-required="true" />}
                      </Field>
                    </div>
                  )}
                  {fields.map((f, i) => (
                    <FieldSlot key={f.key} after={index === 0 && i === 0 && meta ? <div className="min-w-0">{meta}</div> : null}>
                      <div id={`${idPrefix}-f-${f.key}`} className={cx('scroll-mt-28', isWide(f) && 'sm:col-span-2')} onBlur={f.type === 'links' ? () => touch('links') : undefined}>
                        <BriefField f={f} data={data} onField={onField} onBlur={() => touch(f.key)} error={errorOf(f.key)} errors={linkErrors}
                          disabled={disabled} today={today} leadDays={leadDays} urgent={urgent} />
                      </div>
                    </FieldSlot>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className={cx('min-w-0 xl:col-start-2', asideTop ? 'xl:row-start-2' : 'xl:row-start-1')}>
        <div className="xl:sticky xl:top-[var(--brief-aside-top)]" style={{ '--brief-aside-top': asideStickyTop }}>{panel}</div>
      </div>
    </div>
  );
}
