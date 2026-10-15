// Formulario de tarea recurrente (crear o editar) con plantillas de un toque y
// una vista previa en lenguaje claro de lo que el portal va a hacer.
import { useId, useMemo, useState } from 'react';
import { Minus, Plus, Sparkles, Wand2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useResource, useSession } from '../lib/session.jsx';
import { Modal, Field, Select, useAction, cx } from './ui.jsx';
import { PersonSelect } from './common.jsx';
import { Switch, WEEKDAYS, formatClock } from './automations.jsx';
import { TASK_PRIORITY } from '../../shared/catalog.js';

const priorityOptions = Object.entries(TASK_PRIORITY).map(([value, v]) => ({ value, label: v.label }));
const monthdayOptions = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` }));
const FREQUENCIES = [
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];
const MAX_DUE = 60;

/** Ideas frecuentes del equipo: un toque y el formulario queda listo. */
export const RECURRING_TEMPLATES = [
  {
    key: 'tipo_cambio',
    label: 'Actualizar tipo de cambio (lunes)',
    values: { title: 'Actualizar tipo de cambio', description: 'Revisar el tipo de cambio de venta (Hacienda/BCCR) y confirmarlo en Equipo y ajustes.', frequency: 'semanal', weekday: 1, due_in_days: 0, priority: 'media' },
  },
  {
    key: 'redes',
    label: 'Reporte mensual de redes (día 1)',
    values: { title: 'Reporte mensual de redes', description: 'Alcance, interacciones y publicaciones del mes anterior para cada cliente de community manager.', frequency: 'mensual', monthday: 1, due_in_days: 3, priority: 'media' },
  },
  {
    key: 'socios',
    label: 'Revisión semanal de socios (viernes)',
    values: { title: 'Revisión semanal de socios', description: 'Movimientos pendientes, inversiones y caja de la semana.', frequency: 'semanal', weekday: 5, due_in_days: 0, priority: 'alta' },
  },
  {
    key: 'respaldo',
    label: 'Respaldo de la base (viernes)',
    values: { title: 'Respaldo de la base', description: 'Descargar el respaldo en Equipo y ajustes y guardarlo en la carpeta compartida.', frequency: 'semanal', weekday: 5, due_in_days: 0, priority: 'alta' },
  },
];

function dueText(n) {
  if (!n) return 'vence el mismo día';
  if (n === 1) return 'vence al día siguiente';
  return `vence ${n} días después`;
}

/** "Cada lunes a las 6:00 a.m. se crea «Reporte Meta Ads» para Hillary, vence el mismo día." */
export function recurringSentence(form, { time = '06:00', assigneeName, projectName } = {}) {
  let when;
  if (form.frequency === 'diaria') when = 'Todos los días';
  else if (form.frequency === 'mensual') when = form.monthday ? `El día ${form.monthday} de cada mes` : 'Cada mes';
  else when = form.weekday ? `Cada ${WEEKDAYS.find((d) => d.value === Number(form.weekday))?.long ?? 'semana'}` : 'Cada semana';
  const title = form.title?.trim() ? `«${form.title.trim()}»` : 'la tarea';
  const where = projectName ? ` en ${projectName}` : '';
  const who = assigneeName ? `para ${assigneeName.split(' ')[0]}` : 'sin responsable';
  return `${when} a las ${formatClock(time)} se crea ${title}${where} ${who}, ${dueText(Number(form.due_in_days) || 0)}.`;
}

function fromRule(rule, userId) {
  if (!rule) {
    return { title: '', description: '', assignee_id: userId ?? null, project_id: null, priority: 'media', frequency: 'semanal', weekday: 1, monthday: 1, due_in_days: 0, active: true };
  }
  return {
    title: rule.title ?? '',
    description: rule.description ?? '',
    assignee_id: rule.assignee_id ?? null,
    project_id: rule.project_id ?? null,
    priority: rule.priority ?? 'media',
    frequency: rule.frequency ?? 'semanal',
    weekday: rule.weekday ?? 1,
    monthday: rule.monthday ?? 1,
    due_in_days: Number(rule.due_in_days) || 0,
    active: rule.active == null ? true : !!rule.active,
  };
}

/** Cuerpo para la API: solo manda el día que corresponde a la frecuencia. */
export function recurringBody(form) {
  return {
    title: form.title.trim(),
    description: form.description?.trim() || null,
    project_id: form.project_id || null,
    assignee_id: form.assignee_id || null,
    priority: form.priority,
    frequency: form.frequency,
    weekday: form.frequency === 'semanal' ? Number(form.weekday) : null,
    monthday: form.frequency === 'mensual' ? Number(form.monthday) : null,
    due_in_days: Math.max(0, Math.min(MAX_DUE, Number(form.due_in_days) || 0)),
    active: !!form.active,
  };
}

/** Grupo de opciones con radios nativos (flechas del teclado incluidas) y aspecto de botones. */
function ChoiceGroup({ legend, name, options, value, onChange, columns, compact = false }) {
  return (
    <fieldset className="min-w-0">
      <legend className="label">{legend}</legend>
      <div className={cx('grid gap-1 rounded-xl border border-line bg-surface-2 p-1', columns)}>
        {options.map((o) => {
          const on = String(value) === String(o.value);
          return (
            <label key={o.value} title={o.title}
              className={cx('relative flex min-h-11 cursor-pointer select-none items-center justify-center rounded-lg text-sm font-semibold transition',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                on ? 'bg-contrast text-contrast-fg shadow-card' : 'text-muted hover:bg-surface hover:text-ink', compact && 'px-0')}>
              <input type="radio" className="sr-only" name={name} value={o.value} checked={on} aria-label={o.ariaLabel}
                onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Modal de tarea recurrente. rule: la regla a editar (o null para crear).
 * template: plantilla inicial opcional (de los chips de la página). runTime: hora a la que corre la automatización.
 */
export default function RecurringTaskForm({ rule, template, runTime = '06:00', onClose, onSaved }) {
  const { user, team } = useSession();
  const [run, busy] = useAction();
  const uid = useId();
  const [form, setForm] = useState(() => ({ ...fromRule(rule, user?.id), ...(template?.values ?? {}) }));
  const [picked, setPicked] = useState(template?.key ?? null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const { data: pdata } = useResource('/api/projects');

  const projectOptions = useMemo(() => {
    const list = (pdata?.projects ?? []).filter((p) => p.status !== 'cerrado' || p.id === form.project_id)
      .map((p) => ({ value: String(p.id), label: p.name }));
    if (form.project_id && !list.some((o) => o.value === String(form.project_id))) {
      list.unshift({ value: String(form.project_id), label: rule?.project_name ?? 'Proyecto actual' });
    }
    return list;
  }, [pdata, form.project_id, rule]);

  const assignee = team.find((u) => u.id === form.assignee_id);
  const projectName = projectOptions.find((o) => o.value === String(form.project_id))?.label;
  const due = Number(form.due_in_days) || 0;
  const missingDay = (form.frequency === 'semanal' && !form.weekday) || (form.frequency === 'mensual' && !form.monthday);
  const canSave = form.title.trim().length >= 2 && !missingDay && !busy;

  function applyTemplate(t) {
    setPicked(t.key);
    setForm((f) => ({ ...f, ...t.values }));
  }

  async function save(e) {
    e.preventDefault();
    if (!canSave) return;
    const res = await run(
      () => api(rule ? `/api/recurring-tasks/${rule.id}` : '/api/recurring-tasks', { method: rule ? 'PATCH' : 'POST', body: recurringBody(form) }),
      { success: rule ? 'Tarea recurrente actualizada' : 'Listo: el portal la va a crear sola' },
    );
    if (res) { onSaved?.(res); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={rule ? 'Editar tarea recurrente' : 'Nueva tarea recurrente'} size="lg"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form={`${uid}-form`} className="btn btn-primary" disabled={!canSave}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id={`${uid}-form`} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {!rule && (
          <div className="sm:col-span-2">
            <p className="label flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Ideas rápidas</p>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {RECURRING_TEMPLATES.map((t) => (
                <button key={t.key} type="button" aria-pressed={picked === t.key} onClick={() => applyTemplate(t)}
                  className={cx('min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                    picked === t.key ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Título" className="sm:col-span-2">
          {(id) => <input id={id} className="input" required maxLength={160} value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Reporte Meta Ads" />}
        </Field>

        <div className="sm:col-span-2">
          <ChoiceGroup legend="Frecuencia" name={`${uid}-freq`} options={FREQUENCIES} value={form.frequency} onChange={set('frequency')} columns="grid-cols-3" />
        </div>

        {form.frequency === 'semanal' && (
          <div className="sm:col-span-2">
            <ChoiceGroup legend="Día de la semana" name={`${uid}-weekday`} columns="grid-cols-7" compact
              options={WEEKDAYS.map((d) => ({ value: d.value, label: d.short, ariaLabel: d.long[0].toUpperCase() + d.long.slice(1), title: d.long }))}
              value={form.weekday} onChange={(v) => set('weekday')(Number(v))} />
          </div>
        )}
        {form.frequency === 'mensual' && (
          <Field label="Día del mes" hint="Hasta el 28, así existe en todos los meses.">
            {(id) => <Select id={id} options={monthdayOptions} value={String(form.monthday ?? '')} onChange={(v) => set('monthday')(v ? Number(v) : null)} />}
          </Field>
        )}

        <Field label="Vence en (días)" hint={due === 0 ? '0 = el mismo día que se crea.' : dueText(due).replace('vence', 'Vence') + '.'}>
          {(id) => (
            <div className="flex items-center gap-2">
              <button type="button" className="tap flex items-center justify-center rounded-xl border border-line bg-surface text-ink shadow-card transition hover:border-line-strong hover:bg-surface-2 disabled:opacity-40"
                onClick={() => set('due_in_days')(Math.max(0, due - 1))} disabled={due <= 0} aria-label="Un día menos"><Minus className="h-4 w-4" /></button>
              <input id={id} type="number" inputMode="numeric" min={0} max={MAX_DUE} step={1} className="input min-h-11 w-20 text-center tabular"
                value={form.due_in_days} onChange={(e) => set('due_in_days')(e.target.value === '' ? '' : Math.max(0, Math.min(MAX_DUE, Math.trunc(Number(e.target.value)) || 0)))} />
              <button type="button" className="tap flex items-center justify-center rounded-xl border border-line bg-surface text-ink shadow-card transition hover:border-line-strong hover:bg-surface-2 disabled:opacity-40"
                onClick={() => set('due_in_days')(Math.min(MAX_DUE, due + 1))} disabled={due >= MAX_DUE} aria-label="Un día más"><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </Field>

        <Field label="Responsable">{(id) => <PersonSelect id={id} className="min-h-11" value={form.assignee_id} onChange={set('assignee_id')} />}</Field>
        <Field label="Proyecto">
          {(id) => <Select id={id} className="min-h-11" options={projectOptions} value={form.project_id ? String(form.project_id) : ''} onChange={(v) => set('project_id')(v ? Number(v) : null)} placeholder="Sin proyecto" />}
        </Field>
        <Field label="Prioridad">{(id) => <Select id={id} className="min-h-11" options={priorityOptions} value={form.priority} onChange={set('priority')} />}</Field>

        <Field label="Detalle" className="sm:col-span-2">
          {(id) => <textarea id={id} className="input" rows={2} value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="Qué hay que hacer, enlaces, criterio de terminado…" />}
        </Field>

        <div className="card-sunken flex items-center justify-between gap-4 p-3 sm:col-span-2">
          <div className="min-w-0">
            <p id={`${uid}-active`} className="text-sm font-semibold">Activa</p>
            <p className="text-xs text-muted">{form.active ? 'El portal la crea sola cuando toca.' : 'Queda guardada, pero no crea tareas.'}</p>
          </div>
          <Switch checked={!!form.active} label="Activa" onChange={set('active')} />
        </div>

        <div className={cx('flex items-start gap-2.5 rounded-2xl p-3 text-sm leading-snug sm:col-span-2', form.active ? 'bg-teal-soft text-teal-ink' : 'bg-surface-3 text-muted')}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="sr-only">Vista previa: </span>
            {!form.active && <span className="font-semibold">En pausa. Cuando la actives: </span>}
            {recurringSentence(form, { time: runTime, assigneeName: assignee?.name, projectName })}
          </p>
        </div>
      </form>
    </Modal>
  );
}
