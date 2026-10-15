// Piezas del centro de automatizaciones: íconos y grupos, interruptor accesible,
// tarjetas de automatización y de tarea recurrente, historial "Lo que hizo el portal"
// y la tarjeta resumen para el inicio. Todo color pasa por tokens (claro y oscuro).
import { useId, useMemo, useState } from 'react';
import {
  Sunrise, AlarmClock, PhoneCall, Timer, CalendarCheck, Wallet, LifeBuoy, Repeat, Banknote, Bot,
  Clock3, Play, Loader2, Save, Radar, UsersRound, Smartphone, History, ArrowRight, Pencil, Trash2,
  FolderKanban, BellRing, ChevronDown, CalendarClock, Sparkles,
} from 'lucide-react';
import { Link } from '../lib/router.jsx';
import { useResource } from '../lib/session.jsx';
import { Badge, Avatar, EmptyState, IconTile, SectionHead, cx } from './ui.jsx';
import { StatusBadge } from './common.jsx';
import { TASK_PRIORITY } from '../../shared/catalog.js';
import { dayKey, todayKey, addDays, formatDate, timeAgo } from '../lib/format.js';

// ── Catálogo visual ───────────────────────────────────────────────────────
export const AUTOMATION_ICONS = {
  resumen_diario: Sunrise,
  recordatorio_citas: AlarmClock,
  cita_sin_confirmar: PhoneCall,
  avance_72h: Timer,
  tareas_vencen: CalendarCheck,
  dinero_pendiente: Wallet,
  fin_soporte: LifeBuoy,
  tareas_recurrentes: Repeat,
  tipo_cambio: Banknote,
};

export const AUTOMATION_GROUPS = [
  { key: 'dia', label: 'Tu día', tone: 'blue', aliases: ['dia', 'tu_dia', 'mi_dia', 'hoy', 'personal'] },
  { key: 'clientes', label: 'Clientes y plazos', tone: 'teal', aliases: ['clientes', 'clientes_y_plazos', 'clientes_plazos', 'plazos', 'proyectos'] },
  { key: 'dinero', label: 'Dinero de socios', tone: 'amber', aliases: ['dinero', 'dinero_de_socios', 'socios', 'finanzas', 'plata'] },
  { key: 'operacion', label: 'Operación', tone: 'violet', aliases: ['operacion', 'operaciones', 'ops', 'equipo'] },
];
// Grupo de cada automatización conocida. La API trae `category`, pero es la categoría de aviso
// (resumen, agenda, tareas…), así que solo se usa para automatizaciones nuevas que no estén acá.
const KEY_GROUP = {
  resumen_diario: 'dia', recordatorio_citas: 'dia', tareas_vencen: 'dia',
  cita_sin_confirmar: 'clientes', avance_72h: 'clientes', fin_soporte: 'clientes',
  dinero_pendiente: 'dinero',
  tareas_recurrentes: 'operacion', tipo_cambio: 'operacion',
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export function groupOf(a) {
  if (KEY_GROUP[a.key]) return KEY_GROUP[a.key];
  const c = norm(a.category);
  return AUTOMATION_GROUPS.find((g) => g.key === c || g.aliases.includes(c) || norm(g.label) === c)?.key ?? 'operacion';
}
const GROUP_TONE = Object.fromEntries(AUTOMATION_GROUPS.map((g) => [g.key, g.tone]));
export const toneOf = (a) => GROUP_TONE[groupOf(a)] ?? 'slate';

// ── Utilidades de texto ───────────────────────────────────────────────────
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** "06:00" → "6:00 a.m." */
export function formatClock(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return hhmm ?? '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]}\u00a0${h < 12 ? 'a.m.' : 'p.m.'}`;
}

export const WEEKDAYS = [
  { value: 1, short: 'L', long: 'lunes' },
  { value: 2, short: 'M', long: 'martes' },
  { value: 3, short: 'K', long: 'miércoles' },
  { value: 4, short: 'J', long: 'jueves' },
  { value: 5, short: 'V', long: 'viernes' },
  { value: 6, short: 'S', long: 'sábado' },
  { value: 7, short: 'D', long: 'domingo' },
];

/** La configuración puede llegar como objeto o, por las dudas, como texto JSON. */
export function readConfig(config) {
  if (config && typeof config === 'object') return config;
  try { return JSON.parse(config || '{}') ?? {}; } catch { return {}; }
}

/**
 * "Probar ahora" deja además una línea resumen ("Ejecución manual: …") que repite los avisos
 * ya contados en sus líneas de detalle: se muestra en el historial, pero no se suma dos veces.
 */
const MANUAL_RE = /^ejecuci[oó]n manual:\s*/i;
export const isManualRun = (e) => MANUAL_RE.test(e?.summary ?? '');

/** Las entradas de la bitácora de hoy, cuántos avisos sumaron y de cuántas automatizaciones. */
export function todayActivity(log = []) {
  const today = todayKey();
  const entries = log.filter((e) => e.created_at && dayKey(e.created_at) === today);
  const real = entries.filter((e) => !isManualRun(e));
  return {
    entries,
    real,
    recipients: real.reduce((n, e) => n + (Number(e.recipients) || 0), 0),
    sources: new Set(real.map((e) => e.automation_key)).size,
  };
}

const looksLikeError = (text) => /^(error|fall[óo]|no se pudo|sin conexi[óo]n|respuesta .* no reconocida|valor fuera de rango)/i.test(String(text ?? '').trim());

// ── Interruptor accesible (role="switch") con área táctil de 44 px ────────
export function Switch({ checked, onChange, label, disabled = false, id }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="tap -my-2 -mr-2 inline-flex shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-60">
      <span className={cx('relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200', checked ? 'bg-teal-ink' : 'bg-line-strong')}>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

/** Píldora de estado de solo lectura (para quien no es admin). */
export function StatePill({ on, onLabel = 'Activa', offLabel = 'Pausada' }) {
  return <Badge tone={on ? 'teal' : 'slate'} dot>{on ? onLabel : offLabel}</Badge>;
}

/** Píldora "en vivo" del encabezado: punto turquesa que late mientras haya algo en marcha. */
export function LivePill({ active, total }) {
  const on = active > 0;
  return (
    <span className="inline-flex min-h-10 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink shadow-card">
      <span className={cx('inline-flex h-2.5 w-2.5 shrink-0 rounded-full', on ? 'pulse-dot bg-teal' : 'bg-slate')} aria-hidden="true" />
      {on ? (active === total ? 'En marcha · revisa cada minuto' : `En marcha · ${active} de ${total}`) : 'Todo en pausa'}
    </span>
  );
}

// ── "Cómo funciona": tres pasos unidos por una línea punteada ─────────────
const STEPS = [
  { icon: Radar, title: 'Detecta', hint: 'Revisa plazos, citas y plata cada minuto.' },
  { icon: UsersRound, title: 'Decide a quién', hint: 'Responsable, participantes o socios.' },
  { icon: Smartphone, title: 'Avisa por el celular y el buzón', hint: 'Respeta tu horario tranquilo.' },
];

export function HowItWorks() {
  return (
    <section className="card flex flex-col p-4 sm:p-5" aria-labelledby="como-funciona">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="como-funciona" className="eyebrow">Cómo funciona</h2>
        <Link to="/notificaciones" className="link -my-2 inline-flex min-h-11 items-center gap-1 text-xs">
          <BellRing className="h-3.5 w-3.5" aria-hidden="true" />Qué me llega
        </Link>
      </div>
      <ol className="relative my-auto grid grid-cols-3 gap-2">
        {/* Línea punteada que une los pasos (detrás de los círculos). */}
        <span className="absolute left-[16.6%] right-[16.6%] top-5 border-t-2 border-dashed border-line-strong" aria-hidden="true" />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex flex-col items-center text-center">
            <span className="icon-tile tile-brand rounded-full shadow-card ring-4 ring-surface">
              <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="mt-2.5 text-[12px] font-bold leading-tight sm:text-sm">
              <span className="sr-only">Paso {i + 1}: </span>{s.title}
            </span>
            <span className="mt-1 hidden text-xs leading-snug text-muted sm:block">{s.hint}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Tarjeta de automatización ─────────────────────────────────────────────
function ConfigEditor({ automation, onSave }) {
  const schema = useMemo(() => automation.config_schema ?? [], [automation.config_schema]);
  const config = readConfig(automation.config);
  const baseId = useId();
  const [draft, setDraft] = useState(() => Object.fromEntries(schema.map((f) => [f.key, config[f.key] == null ? '' : String(config[f.key])])));
  const [busy, setBusy] = useState(false);
  if (!schema.length) return null;

  const errors = Object.fromEntries(schema.map((f) => {
    const v = draft[f.key];
    if (f.type === 'time') return [f.key, /^\d{2}:\d{2}$/.test(v) ? null : 'Hora no válida'];
    const n = Number(v);
    if (v === '' || !Number.isInteger(n)) return [f.key, 'Número entero'];
    if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) return [f.key, `Entre ${f.min} y ${f.max}`];
    return [f.key, null];
  }));
  const dirty = schema.some((f) => draft[f.key] !== (config[f.key] == null ? '' : String(config[f.key])));
  const valid = Object.values(errors).every((e) => !e);

  async function save(e) {
    e.preventDefault();
    if (!dirty || !valid) return;
    setBusy(true);
    const next = { ...config, ...Object.fromEntries(schema.map((f) => [f.key, f.type === 'number' ? Number(draft[f.key]) : draft[f.key]])) };
    await onSave(next);
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="card-sunken flex flex-wrap items-end gap-2 p-2.5">
      {schema.map((f) => {
        const id = `${baseId}-${f.key}`;
        const err = draft[f.key] !== '' && errors[f.key];
        return (
          <div key={f.key} className="min-w-0 flex-1 basis-32">
            <label htmlFor={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              {f.label}{f.type === 'number' && f.min != null && <span className="font-normal normal-case tracking-normal"> · {f.min} a {f.max}</span>}
            </label>
            <input id={id} className={cx('input min-h-11 tabular', f.type === 'time' ? 'w-[8.5rem]' : 'w-24', err && 'border-coral')}
              type={f.type === 'time' ? 'time' : 'number'} inputMode={f.type === 'number' ? 'numeric' : undefined}
              min={f.min ?? undefined} max={f.max ?? undefined} step={f.type === 'number' ? 1 : undefined}
              value={draft[f.key]} aria-invalid={err ? true : undefined} aria-describedby={err ? `${baseId}-error` : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
          </div>
        );
      })}
      <button type="submit" className={cx('btn min-h-11', dirty && valid ? 'btn-dark' : 'btn-outline')} disabled={!dirty || !valid || busy}
        aria-label={`Guardar ajustes de ${automation.name}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar
      </button>
      {!valid && schema.some((f) => draft[f.key] !== '' && errors[f.key]) && (
        <p id={`${baseId}-error`} className="w-full text-xs font-semibold text-coral-ink">
          {schema.filter((f) => draft[f.key] !== '' && errors[f.key]).map((f) => `${f.label}: ${errors[f.key].toLowerCase()}`).join(' · ')}
        </p>
      )}
    </form>
  );
}

/**
 * Una automatización. Admin: interruptor, "Probar ahora" y ajustes en línea.
 * El resto ve el estado como una píldora de solo lectura.
 */
export function AutomationCard({ automation: a, isAdmin, pending, running, onToggle, onRun, onSaveConfig, extra }) {
  const Icon = AUTOMATION_ICONS[a.key] ?? Bot;
  const enabled = !!a.enabled;
  const tone = enabled ? toneOf(a) : 'slate';
  const runs = Number(a.runs) || 0;
  return (
    <article className={cx('@container card flex h-full flex-col gap-3 p-4 sm:p-5', !enabled && 'border-dashed')} aria-labelledby={`auto-${a.key}`}>
      <div className="flex items-start gap-3">
        <IconTile icon={Icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <h3 id={`auto-${a.key}`} className={cx('font-display text-base font-bold leading-snug', enabled ? 'text-ink' : 'text-muted')}>{a.name}</h3>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
            <CalendarClock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{a.schedule}</span>
          </p>
        </div>
        {isAdmin
          ? <Switch checked={enabled} label={a.name} disabled={pending} onChange={(v) => onToggle(a, v)} />
          : <StatePill on={enabled} />}
      </div>

      <p className="text-sm leading-relaxed text-ink-2">{a.description}</p>
      {isAdmin && !enabled && <p className="text-xs font-medium text-muted">Pausada: no avisa a nadie hasta que la actives (y para probarla, activala primero).</p>}
      {enabled && a.next_run_hint && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-brand-ink">
          <Clock3 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0"><span className="font-medium text-muted">Próxima corrida · </span>{a.next_run_hint}</span>
        </p>
      )}
      {extra}

      {isAdmin && <ConfigEditor key={JSON.stringify(readConfig(a.config))} automation={a} onSave={(config) => onSaveConfig(a, config)} />}

      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3 @[20rem]:flex-row @[20rem]:items-end @[20rem]:justify-between @[20rem]:gap-3">
        <div className="min-w-0 flex-1 text-xs text-muted">
          {a.last_run_at ? (
            <>
              <p><span className="font-semibold text-ink-2">Última vez {timeAgo(a.last_run_at)}</span> · {runs === 1 ? '1 vez' : `${runs} veces`} en total</p>
              {a.last_result && <p className={cx('mt-0.5 line-clamp-2 break-words', looksLikeError(a.last_result) ? 'font-medium text-coral-ink' : 'text-muted')}>{a.last_result}</p>}
            </>
          ) : <p>Todavía no corrió.</p>}
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-outline min-h-11 shrink-0" onClick={() => onRun(a)} disabled={running || !enabled} aria-label={`Probar ahora: ${a.name}`}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running ? 'Probando…' : 'Probar ahora'}
          </button>
        )}
      </div>
    </article>
  );
}

// ── Historial "Lo que hizo el portal" ─────────────────────────────────────
function dayLabel(key) {
  const today = todayKey();
  if (key === today) return `Hoy · ${formatDate(key)}`;
  if (key === addDays(today, -1)) return `Ayer · ${formatDate(key)}`;
  return formatDate(key);
}

const TIMELINE_STEP = 12;

export function Timeline({ log = [], automations = [] }) {
  const [limit, setLimit] = useState(TIMELINE_STEP);
  const byKey = useMemo(() => new Map(automations.map((a) => [a.key, a])), [automations]);
  const sorted = useMemo(() => [...log].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)) || (y.id ?? 0) - (x.id ?? 0)), [log]);
  const shown = sorted.slice(0, limit);
  const days = [];
  for (const e of shown) {
    const key = dayKey(e.created_at);
    if (days.at(-1)?.key !== key) days.push({ key, items: [] });
    days.at(-1).items.push(e);
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="historial-title">
      <SectionHead flush id="historial-title" icon={History} tone="teal" title="Lo que hizo el portal" hint="Cada aviso que mandó solo." />
      <div className="p-4 sm:p-5">
        {sorted.length === 0 ? (
          <EmptyState icon={Bot} tone="teal" title="Sin movimiento todavía">
            Todavía no corrió ninguna automatización. La primera es el resumen de mañana a las 7:30.
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {days.map((d) => (
              <div key={d.key}>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{dayLabel(d.key)}</h3>
                <ol>
                  {d.items.map((e, i) => {
                    const auto = byKey.get(e.automation_key);
                    const Icon = AUTOMATION_ICONS[e.automation_key] ?? Bot;
                    const n = Number(e.recipients) || 0;
                    const last = i === d.items.length - 1;
                    const manual = isManualRun(e);
                    return (
                      <li key={e.id ?? `${e.automation_key}-${e.created_at}`} className={cx('relative flex gap-3', !last && 'pb-4')}>
                        {!last && <span className="absolute bottom-0 left-4 top-9 w-px bg-line" aria-hidden="true" />}
                        <IconTile icon={Icon} tone={auto ? toneOf(auto) : 'slate'} size="sm" className="relative" />
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="break-words text-sm leading-snug text-ink">
                            {manual && <Badge tone="ink" className="mr-1.5 align-[1px]">Prueba</Badge>}
                            {manual ? e.summary.replace(MANUAL_RE, '') : e.summary}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {auto?.name ?? e.automation_name ?? e.automation_key}
                            {' · '}{n ? plural(n, 'aviso', 'avisos') : 'sin avisos'}
                            {' · '}<time dateTime={e.created_at}>{timeAgo(e.created_at)}</time>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            {sorted.length > limit && (
              <button type="button" className="btn btn-ghost min-h-11 w-full" onClick={() => setLimit((l) => l + TIMELINE_STEP * 2)}>
                <ChevronDown className="h-4 w-4" />Ver más ({sorted.length - limit})
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Tarea recurrente ──────────────────────────────────────────────────────
export function RecurringCard({ rule: r, canEdit, color, pending, onToggle, onEdit, onDelete }) {
  const active = !!r.active;
  return (
    <article className={cx('card flex h-full flex-col gap-3 p-4 sm:p-5', !active && 'border-dashed')} aria-labelledby={`rec-${r.id}`}>
      <div className="flex items-start gap-3">
        <IconTile icon={Repeat} tone={active ? 'violet' : 'slate'} />
        <div className="min-w-0 flex-1">
          <h3 id={`rec-${r.id}`} className={cx('break-words font-display text-base font-bold leading-snug', active ? 'text-ink' : 'text-muted')}>{r.title}</h3>
          <p className="mt-0.5 text-xs text-muted">{r.summary}</p>
        </div>
        {canEdit
          ? <Switch checked={active} label={`Activa: ${r.title}`} disabled={pending} onChange={(v) => onToggle(r, v)} />
          : <StatePill on={active} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {r.assignee_name
          ? <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink"><Avatar name={r.assignee_name} color={color} size={24} /><span className="truncate">{r.assignee_name.split(' ')[0]}</span></span>
          : <span className="text-xs text-muted">Sin responsable</span>}
        {r.project_name && <Badge tone="slate" className="max-w-full"><FolderKanban className="h-3 w-3 shrink-0" /><span className="truncate">{r.project_name}</span></Badge>}
        <StatusBadge map={TASK_PRIORITY} value={r.priority} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
        <p className="min-w-0 text-xs text-muted">{r.last_created_on ? `Última creada: ${formatDate(r.last_created_on)}` : 'Todavía no se creó ninguna.'}</p>
        {canEdit && (
          <div className="-mr-2 -my-1 flex shrink-0 items-center">
            <button type="button" className="tap flex items-center justify-center rounded-xl text-muted transition hover:bg-surface-3 hover:text-ink" onClick={() => onEdit(r)} aria-label={`Editar ${r.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" className="tap flex items-center justify-center rounded-xl text-muted transition hover:bg-coral-soft hover:text-coral-ink" onClick={() => onDelete(r)} aria-label={`Eliminar ${r.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Tarjeta para el inicio: "Lo que hizo el portal hoy" ───────────────────
export function PortalTodayCard({ className }) {
  const { data } = useResource('/api/automations');
  if (!data) return null;
  const { real: entries, recipients, sources } = todayActivity(data.log ?? []);
  const byKey = new Map((data.automations ?? []).map((a) => [a.key, a]));
  return (
    <section className={cx('card animate-rise overflow-hidden', className)} aria-labelledby="portal-hoy">
      <SectionHead flush id="portal-hoy" icon={Bot} tone="teal" title="Lo que hizo el portal hoy"
        hint={entries.length ? `${plural(recipients, 'aviso', 'avisos')} de ${plural(sources, 'automatización', 'automatizaciones')}` : 'Vigila plazos, citas y plata por vos.'}
        action={<Link to="/automatizaciones" className="link tap -my-2 hidden items-center gap-1 text-sm sm:flex">Ver todo<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      {entries.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-teal-ink sm:px-5">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
          Hoy todavía no hizo falta avisar nada. El portal sigue vigilando.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {entries.slice(0, 3).map((e) => {
            const Icon = AUTOMATION_ICONS[e.automation_key] ?? Bot;
            const auto = byKey.get(e.automation_key);
            return (
              <li key={e.id ?? e.created_at} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <IconTile icon={Icon} tone={auto ? toneOf(auto) : 'slate'} size="sm" />
                <p className="min-w-0 flex-1 pt-1 text-sm leading-snug text-ink">
                  {e.summary}
                  <span className="mt-0.5 block text-xs text-muted">{auto?.name ?? e.automation_name ?? e.automation_key} · {timeAgo(e.created_at)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/automatizaciones" className="tap flex items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 px-4 py-3 text-sm font-semibold text-brand-ink sm:hidden">Ver todo<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </section>
  );
}
