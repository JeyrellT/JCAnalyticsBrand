// Portal de clientes visto desde el equipo (v5): etapas del proyecto, entregables
// para aprobación y briefs. Lo usan la ficha del proyecto y la ficha del cliente.
// Todo lo que se marca aquí lo ve el cliente en su portal (nunca tareas ni montos).
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Milestone, Plus, Pencil, Check, Play, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, Eye, EyeOff, PackageCheck, Upload, History, ExternalLink,
  Trash2, ClipboardList, CheckCircle2, MessageSquareWarning, Hourglass, Send, FilePlus2, FolderKanban, Info,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useResource } from '../lib/session.jsx';
import { Badge, Modal, Field, Select, ProgressBar, IconTile, SectionHead, RowArrow, EmptyState, Spinner, useAction, useConfirm, cx } from './ui.jsx';
import { StatusBadge } from './common.jsx';
import { Switch } from './automations.jsx';
import { MILESTONE_STATUS, DELIVERABLE_STATUS, DELIVERABLE_EVENT_KINDS } from '../../shared/client-portal.js';
import { BRIEF_STATUS, BRIEF_EDITABLE_STATUSES } from '../../shared/brief.js';
import { formatDate, formatDateTime, dayKey, dueLabel, timeAgo } from '../lib/format.js';

/** Enlace http(s) válido (el servidor vuelve a validar; aquí solo se avisa antes de enviar). */
export const isWebLink = (value) => {
  try {
    const u = new URL(String(value ?? '').trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
};
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** Botón chico en escritorio y de 44 px en el celular. */
const SMALL_BTN = 'btn btn-sm max-sm:min-h-11';

/** Error de un campo devuelto por el servidor → { campo: mensaje }. */
const fieldError = (setErrors) => (err, msg) => { if (err?.data?.field) setErrors({ [err.data.field]: msg }); };

/**
 * Los modales de estas tarjetas se montan en <body>: las tarjetas entran con
 * `animate-rise`, cuya transformación encerraría al fondo `fixed` dentro de la tarjeta.
 */
export const Layer = ({ children }) => createPortal(children, document.body);

/** Aviso dentro de una tarjeta (pista, advertencia). */
export function Callout({ tone = 'blue', icon: Icon = Info, children, className }) {
  const tones = { blue: 'bg-brand-soft text-brand-ink', teal: 'bg-teal-soft text-teal-ink', amber: 'bg-amber-soft text-amber-ink', red: 'bg-coral-soft text-coral-ink', slate: 'bg-surface-2 text-muted' };
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm', tones[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Por qué el cliente todavía no ve el proyecto en su portal (null = lo ve).
 * 'prospecto': pipeline interno · 'interno': no es un proyecto de cliente · 'sin_acceso': nadie del cliente entra.
 */
export function portalHiddenReason(project, clientPortal) {
  if (clientPortal) return null;
  if (project.kind !== 'cliente') return 'interno';
  if (project.status === 'prospecto') return 'prospecto';
  return 'sin_acceso';
}

/** Texto corto de por qué el cliente no lo ve, con el enlace para darle acceso cuando aplica. */
function HiddenReason({ reason, clientId, what = 'esto' }) {
  if (reason === 'prospecto') return <>Es un prospecto: el cliente verá {what} cuando el proyecto pase a «En curso».</>;
  if (reason === 'interno') return <>No es un proyecto de cliente: {what} no aparece en ningún portal.</>;
  return <>El cliente todavía no ve {what}: <Link to={`/clientes/${clientId}?portal=accesos`} className="font-semibold underline">dale acceso al portal</Link>.</>;
}

// ── Etapas ──────────────────────────────────────────────────────────────────
const NEXT_STATUS = { pendiente: 'en_curso', en_curso: 'completado', completado: 'pendiente' };
const STATUS_ACTION = {
  pendiente: { label: 'Iniciar', icon: Play, className: 'btn-outline' },
  en_curso: { label: 'Completar', icon: Check, className: 'btn-teal' },
  completado: { label: 'Reabrir', icon: RotateCcw, className: 'btn-ghost text-muted' },
};
const milestoneStatusOptions = Object.entries(MILESTONE_STATUS).map(([value, v]) => ({ value, label: v.label }));

/** Nodo del paso: completado (relleno), en curso (anillo de marca que late) o pendiente (número). */
function StepNode({ status, index }) {
  if (status === 'completado') {
    return (
      <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent-teal) text-(--accent-teal-fg) shadow-card" aria-hidden="true">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'en_curso') {
    return (
      <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft ring-2 ring-brand" aria-hidden="true">
        <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-brand" />
      </span>
    );
  }
  return (
    <span className="num relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted ring-1 ring-line-strong" aria-hidden="true">
      {index}
    </span>
  );
}

function MilestoneForm({ projectId, milestone, nextPosition, onClose, onSaved, onDelete }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    title: milestone?.title ?? '', due_date: milestone?.due_date ?? '', description: milestone?.description ?? '', status: milestone?.status ?? 'pendiente',
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const title = form.title.trim();

  async function save(e) {
    e.preventDefault();
    if (title.length < 2) { setErrors({ title: 'Escribí el nombre de la etapa (mínimo 2 letras).' }); return; }
    const body = { title, due_date: form.due_date || null, description: clean(form.description), status: form.status };
    if (!milestone) body.position = nextPosition;
    const res = await run(
      () => api(milestone ? `/api/milestones/${milestone.id}` : `/api/projects/${projectId}/milestones`, { method: milestone ? 'PATCH' : 'POST', body }),
      { success: milestone ? 'Etapa actualizada' : 'Etapa agregada', onError: fieldError(setErrors) },
    );
    if (res?.milestones) { onSaved(res.milestones); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={milestone ? 'Editar etapa' : 'Nueva etapa'}
      footer={<>
        {milestone && <button type="button" className="btn btn-ghost mr-auto text-coral-ink" onClick={() => onDelete(milestone)} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar</button>}
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="milestone-form" className="btn btn-primary" disabled={busy || title.length < 2}>{busy ? 'Guardando…' : milestone ? 'Guardar' : 'Agregar etapa'}</button>
      </>}>
      <form id="milestone-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre de la etapa" className="sm:col-span-2" error={errors.title}>
          {(id) => <input id={id} className="input" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Diseño y aprobación" maxLength={120} autoComplete="off" required />}
        </Field>
        <Field label="Fecha estimada" hint="Opcional. El cliente la ve como referencia." error={errors.due_date}>
          {(id) => <input id={id} type="date" className="input" value={form.due_date ?? ''} onChange={(e) => set('due_date')(e.target.value)} />}
        </Field>
        <Field label="Estado" error={errors.status}>
          {(id) => <Select id={id} options={milestoneStatusOptions} value={form.status} onChange={set('status')} />}
        </Field>
        <Field label="Descripción" className="sm:col-span-2" hint="Qué incluye, en palabras del cliente. Sin datos internos." error={errors.description}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={1000} value={form.description ?? ''} onChange={(e) => set('description')(e.target.value)} placeholder="Ej.: Validamos menú, fotos y precios antes de construir." />}
        </Field>
      </form>
    </Modal>
  );
}

/**
 * Etapas del proyecto como línea vertical. El cliente las ve en su portal como el
 * avance de su servicio. onChange(milestones) recibe la lista que devuelve el servidor.
 */
export function MilestonesCard({ project, milestones, clientPortal, clientId, onChange }) {
  const hidden = portalHiddenReason(project, clientPortal);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === 'completado').length;
  const nextPosition = milestones.reduce((max, m) => Math.max(max, Number(m.position) || 0), 0) + 1;

  const refetch = () => api(`/api/projects/${project.id}/milestones`).then((r) => onChange(r.milestones), () => {});

  async function advance(m) {
    const to = NEXT_STATUS[m.status];
    const success = to === 'completado' ? (clientPortal ? 'Etapa completada: el cliente recibe un aviso' : 'Etapa completada') : to === 'en_curso' ? 'Etapa en curso' : 'Etapa reabierta';
    const res = await run(() => api(`/api/milestones/${m.id}`, { method: 'PATCH', body: { status: to } }), { success });
    if (res?.milestones) onChange(res.milestones);
  }

  /** Sube o baja una etapa: renumera las posiciones que cambian (normalmente dos). */
  async function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= total) return;
    const order = [...milestones];
    [order[index], order[target]] = [order[target], order[index]];
    const res = await run(async () => {
      let last = null;
      for (const [i, m] of order.entries()) {
        if (Number(m.position) !== i + 1) last = await api(`/api/milestones/${m.id}`, { method: 'PATCH', body: { position: i + 1 } });
      }
      return last ?? { milestones: order };
    }, { onError: refetch });
    if (res?.milestones) onChange(res.milestones);
  }

  async function remove(m) {
    if (!(await confirm({ title: 'Eliminar etapa', message: `"${m.title}" deja de verse en el proyecto${clientPortal ? ' y en el portal del cliente' : ''}.`, confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    const res = await run(() => api(`/api/milestones/${m.id}`, { method: 'DELETE' }), { success: 'Etapa eliminada' });
    if (res?.milestones) { onChange(res.milestones); setEditing(null); }
  }

  const hint = total ? `${done} de ${plural(total, 'etapa', 'etapas')}${done === total ? ' · todo completo' : ''}` : 'El camino del proyecto, en pasos que el cliente entiende';

  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="milestones-title">
      <SectionHead flush id="milestones-title" icon={Milestone} tone="teal" title="Etapas" hint={hint}
        action={<>
          {total > 1 && (
            <button type="button" className={cx(SMALL_BTN, ordering ? 'btn-dark' : 'btn-ghost')} aria-pressed={ordering} onClick={() => setOrdering((v) => !v)}>
              <ArrowUpDown className="h-3.5 w-3.5" /><span className="max-sm:sr-only">{ordering ? 'Listo' : 'Ordenar'}</span>
            </button>
          )}
          <button type="button" className={cx(SMALL_BTN, 'btn-outline')} onClick={() => setEditing('new')}><Plus className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Agregar etapa</span></button>
        </>} />

      {total > 0 && (
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
          <ProgressBar value={done / total} tone={done === total ? 'teal' : 'brand'} label="Etapas completadas" />
          <span className="num shrink-0 text-sm font-bold text-ink">{done}/{total}</span>
        </div>
      )}

      {clientId && (
        <div className="px-4 pt-3 sm:px-5">
          {clientPortal ? (
            <p className="flex items-center gap-2 text-xs font-medium text-teal-ink"><Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />El cliente ve estas etapas en su portal.</p>
          ) : (
            <p className="flex items-start gap-2 text-xs text-muted">
              <EyeOff className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span><HiddenReason reason={hidden} clientId={clientId} what="estas etapas" /></span>
            </p>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={Milestone} tone="teal" title="Sin etapas todavía" action={<button type="button" className="btn btn-outline" onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Agregar la primera</button>}>
            Dividí el proyecto en 3 a 6 etapas (alcance, diseño, desarrollo, entrega…). Al completarlas, el cliente ve el avance sin preguntar.
          </EmptyState>
        </div>
      ) : (
        <ol className="px-4 py-4 sm:px-5" aria-label="Etapas del proyecto">
          {milestones.map((m, i) => {
            const last = i === total - 1;
            const due = m.status !== 'completado' ? dueLabel(m.due_date) : null;
            const action = STATUS_ACTION[m.status];
            return (
              <li key={m.id} className={cx('relative flex gap-3', !last && 'pb-5')}>
                {!last && <span className={cx('absolute bottom-0 left-[15px] top-9 w-0.5 rounded-full', m.status === 'completado' ? 'bg-teal' : 'bg-line')} aria-hidden="true" />}
                <StepNode status={m.status} index={i + 1} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cx('break-words text-sm font-semibold leading-snug', m.status === 'completado' ? 'text-ink-2' : 'text-ink')}>{m.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="sr-only">Estado:</span>
                        <StatusBadge map={MILESTONE_STATUS} value={m.status} dot={false} />
                        {m.status === 'completado' && m.completed_at && <span>Completada el {formatDate(dayKey(m.completed_at))}</span>}
                        {due && <Badge tone={due.tone}>{due.tone === 'slate' ? `Para el ${due.text}` : due.text}</Badge>}
                      </p>
                    </div>
                    {ordering ? (
                      <div className="flex shrink-0 gap-1">
                        <button type="button" className="btn btn-ghost btn-icon tap" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Subir "${m.title}"`}><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" className="btn btn-ghost btn-icon tap" onClick={() => move(i, 1)} disabled={busy || last} aria-label={`Bajar "${m.title}"`}><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" className={cx(SMALL_BTN, action.className)} onClick={() => advance(m)} disabled={busy} aria-label={`${action.label}: ${m.title}`}>
                          <action.icon className="h-3.5 w-3.5" /><span className="max-sm:sr-only">{action.label}</span>
                        </button>
                        <button type="button" className="btn btn-ghost btn-icon tap text-muted hover:text-ink" onClick={() => setEditing(m)} aria-label={`Editar "${m.title}"`} title="Editar"><Pencil className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                  {m.description && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted">{m.description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {editing && (
        <Layer>
          <MilestoneForm projectId={project.id} milestone={editing === 'new' ? null : editing} nextPosition={nextPosition}
            onClose={() => setEditing(null)} onSaved={onChange} onDelete={remove} />
        </Layer>
      )}
    </section>
  );
}

// ── Entregables ─────────────────────────────────────────────────────────────
/** Lo que decidió el cliente (o que se espera su revisión). */
function DecisionNote({ d }) {
  if (d.status === 'aprobado' || d.status === 'cambios') {
    const ok = d.status === 'aprobado';
    const Icon = ok ? CheckCircle2 : MessageSquareWarning;
    return (
      <div className={cx('mt-2 rounded-xl px-3 py-2', ok ? 'bg-teal-soft text-teal-ink' : 'bg-coral-soft text-coral-ink')}>
        <p className="flex items-start gap-1.5 text-xs font-semibold">
          <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ok ? 'Aprobado por' : 'Cambios pedidos por'} {d.decided_by_name ?? 'el cliente'}{d.decided_at ? ` · ${timeAgo(d.decided_at)}` : ''}</span>
        </p>
        {d.decision_note && <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-ink-2">«{d.decision_note}»</p>}
      </div>
    );
  }
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
      <Hourglass className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Compartido{d.shared_by_name ? ` por ${d.shared_by_name}` : ''} {timeAgo(d.shared_at)} · esperando al cliente</span>
    </p>
  );
}

/** Fila de un entregable: título, estado, versión, brief y decisión. children = acciones. */
export function DeliverableItem({ d, showProject = false, children }) {
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <IconTile icon={PackageCheck} tone={DELIVERABLE_STATUS[d.status]?.tone ?? 'slate'} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-words text-sm font-semibold leading-snug text-ink">{d.title}</p>
            <span className="num shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold leading-none text-ink-2" title={`Versión ${d.version}`}>v{d.version}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge map={DELIVERABLE_STATUS} value={d.status} />
            {d.brief_code && <Badge tone="violet"><ClipboardList className="h-3 w-3" aria-hidden="true" />{d.brief_code}</Badge>}
            {showProject && d.project_name && <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted"><FolderKanban className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{d.project_name}</span></span>}
          </div>
          {d.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{d.description}</p>}
          <DecisionNote d={d} />
          {children && <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>}
        </div>
      </div>
    </li>
  );
}

const EVENT_ICON = { compartido: Send, nueva_version: Upload, aprobado: CheckCircle2, cambios: MessageSquareWarning };
const EVENT_TONE = { compartido: 'blue', nueva_version: 'violet', aprobado: 'teal', cambios: 'red' };

/** Historial de un entregable: quién compartió cada versión y qué decidió el cliente. */
export function DeliverableHistory({ deliverable, onClose }) {
  const { data, error, reload } = useResource(`/api/deliverables/${deliverable.id}`);
  const events = [...(data?.events ?? [])].reverse();
  return (
    <Modal open onClose={onClose} title="Historial del entregable" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <p className="text-sm font-semibold text-ink">{deliverable.title}</p>
      <p className="text-xs text-muted">Versión actual {deliverable.version} · {DELIVERABLE_STATUS[deliverable.status]?.label}</p>
      {!data ? (
        error ? (
          <div className="mt-4"><Callout tone="red">No se pudo cargar el historial. <button type="button" className="font-semibold underline" onClick={reload}>Reintentar</button></Callout></div>
        ) : <div className="flex justify-center py-8"><Spinner /></div>
      ) : events.length === 0 ? <p className="mt-4 text-sm text-muted">Sin movimientos todavía.</p> : (
        <ol className="mt-4 space-y-4 border-l-2 border-line pl-5" aria-label="Movimientos">
          {events.map((e) => {
            const Icon = EVENT_ICON[e.kind] ?? Send;
            return (
              <li key={e.id} className="relative">
                <span className={cx('absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-surface', `tile-${EVENT_TONE[e.kind] ?? 'slate'}`)} aria-hidden="true">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-ink">{DELIVERABLE_EVENT_KINDS[e.kind] ?? e.kind}</span>
                  <Badge>v{e.version}</Badge>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {e.actor_name ?? (e.actor_type === 'cliente' ? 'Cliente' : 'Equipo')} · {e.actor_type === 'cliente' ? 'cliente' : 'equipo'} · <span className="first-letter:uppercase">{formatDateTime(e.created_at)}</span>
                </p>
                {e.note && <p className="mt-1.5 whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">{e.note}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}

/** Compartir un entregable nuevo con el cliente (versión 1). */
function ShareDeliverable({ projectId, clientId, clientName, clientPortal, hidden, projectBriefs, onClose, onSaved }) {
  const [run, busy] = useAction();
  const all = useResource(`/api/briefs?client_id=${clientId}`);
  const [form, setForm] = useState({ title: '', description: '', url: '', brief_id: '', note: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const title = form.title.trim();
  const link = form.url.trim();
  const linkBad = link && !isWebLink(link);

  // Briefs del cliente (los de este proyecto primero); los cancelados no se ofrecen.
  const briefs = (all.data?.briefs ?? projectBriefs).filter((b) => b.status !== 'cancelado');
  const ordered = [...briefs.filter((b) => b.project_id === projectId), ...briefs.filter((b) => b.project_id !== projectId)];
  const briefOptions = ordered.map((b) => ({ value: String(b.id), label: `${b.code} · ${b.title}${b.project_id === projectId ? '' : ' (otro proyecto)'}` }));

  async function save(e) {
    e.preventDefault();
    if (title.length < 2) { setErrors({ title: 'Escribí qué estás compartiendo (mínimo 2 letras).' }); return; }
    if (linkBad) { setErrors({ url: 'Pegá un enlace completo que empiece con https://' }); return; }
    const body = {
      client_id: clientId, project_id: projectId, brief_id: form.brief_id ? Number(form.brief_id) : null,
      title, description: clean(form.description), url: link || null, note: clean(form.note),
    };
    const res = await run(() => api('/api/deliverables', { method: 'POST', body }), {
      success: clientPortal ? 'Entregable compartido: el cliente recibe un aviso' : 'Entregable compartido', onError: fieldError(setErrors),
    });
    if (res?.deliverable) { onSaved(res.deliverable); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title="Compartir entregable"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="deliverable-form" className="btn btn-primary" disabled={busy || title.length < 2}><Send className="h-4 w-4" />{busy ? 'Compartiendo…' : 'Compartir'}</button>
      </>}>
      <form id="deliverable-form" onSubmit={save} className="space-y-4" noValidate>
        {clientPortal ? (
          <Callout tone="blue" icon={Eye}>{clientName || 'El cliente'} lo ve en su portal y lo aprueba o pide cambios. Cada versión queda registrada.</Callout>
        ) : (
          <Callout tone="amber" icon={EyeOff}><HiddenReason reason={hidden} clientId={clientId} what="el entregable" /></Callout>
        )}
        <Field label="Qué compartís" error={errors.title}>
          {(id) => <input id={id} className="input" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Prototipo del carrito" maxLength={120} autoComplete="off" required />}
        </Field>
        <Field label="Enlace" hint="Drive, Figma, sitio de pruebas… El cliente lo abre desde su portal." error={errors.url ?? (linkBad ? 'Pegá un enlace completo que empiece con https://' : null)}>
          {(id) => <input id={id} type="url" inputMode="url" className="input" value={form.url} onChange={(e) => set('url')(e.target.value)} placeholder="https://" autoComplete="off" />}
        </Field>
        <Field label="Descripción" hint="Qué incluye y qué debe revisar." error={errors.description}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={2000} value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="Ej.: Flujo completo: menú → carrito → confirmación por WhatsApp." />}
        </Field>
        <Field label="Brief relacionado" hint={briefOptions.length ? 'Opcional. Liga el entregable con la solicitud que lo originó.' : 'Este cliente no tiene briefs abiertos.'} error={errors.brief_id}>
          {(id) => <Select id={id} options={briefOptions} value={form.brief_id} onChange={set('brief_id')} placeholder="Sin brief" disabled={!briefOptions.length} />}
        </Field>
        <Field label="Nota para el cliente" hint="Opcional. Aparece en el historial del entregable." error={errors.note}>
          {(id) => <textarea id={id} className="input" rows={2} maxLength={1000} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="Ej.: Revisalo desde el celular, es como lo verán tus clientes." />}
        </Field>
      </form>
    </Modal>
  );
}

/** Subir una versión nueva: vuelve a "Por revisar" y el cliente decide otra vez. */
function NewVersion({ deliverable: d, clientPortal, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [link, setLink] = useState(d.url ?? '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const trimmed = link.trim();
  const linkBad = trimmed && !isWebLink(trimmed);
  const next = d.version + 1;

  async function save(e) {
    e.preventDefault();
    if (linkBad) { setErrors({ url: 'Pegá un enlace completo que empiece con https://' }); return; }
    const res = await run(() => api(`/api/deliverables/${d.id}`, { method: 'PATCH', body: { url: trimmed || null, note: clean(note), new_version: true } }), {
      success: clientPortal ? `Versión ${next} compartida: el cliente recibe un aviso` : `Versión ${next} compartida`, onError: fieldError(setErrors),
    });
    if (res?.deliverable) { onSaved(res.deliverable); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={`Subir versión ${next}`}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="version-form" className="btn btn-primary" disabled={busy || linkBad}><Upload className="h-4 w-4" />{busy ? 'Subiendo…' : `Compartir versión ${next}`}</button>
      </>}>
      <form id="version-form" onSubmit={save} className="space-y-4" noValidate>
        <div>
          <p className="text-sm font-semibold text-ink">{d.title}</p>
          <p className="text-xs text-muted">La versión {d.version} queda en el historial. La nueva vuelve a «Por revisar» y el cliente decide otra vez.</p>
        </div>
        {d.status === 'cambios' && d.decision_note && (
          <Callout tone="red" icon={MessageSquareWarning}>
            <span className="font-semibold">Lo que pidió {d.decided_by_name ?? 'el cliente'}:</span> «{d.decision_note}»
          </Callout>
        )}
        <Field label="Enlace de la versión nueva" hint="Si el archivo se actualizó en el mismo enlace, dejalo igual." error={errors.url ?? (linkBad ? 'Pegá un enlace completo que empiece con https://' : null)}>
          {(id) => <input id={id} type="url" inputMode="url" className="input" value={link} onChange={(e) => { setLink(e.target.value); setErrors({}); }} placeholder="https://" autoComplete="off" />}
        </Field>
        <Field label="Qué cambió" hint="El cliente lo lee antes de revisar." error={errors.note}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Ajustamos colores del botón y agregamos la foto del combo." />}
        </Field>
      </form>
    </Modal>
  );
}

/**
 * Entregables del proyecto para aprobación del cliente. onChanged() recarga la ficha.
 */
export function DeliverablesCard({ project, clientId, clientName, deliverables, briefs, clientPortal, onChanged }) {
  const hidden = portalHiddenReason(project, clientPortal);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [sharing, setSharing] = useState(false);
  const [versioning, setVersioning] = useState(null);
  const [history, setHistory] = useState(null);
  const pending = deliverables.filter((d) => d.status === 'en_revision').length;
  const changes = deliverables.filter((d) => d.status === 'cambios').length;
  const approved = deliverables.filter((d) => d.status === 'aprobado').length;
  const hint = deliverables.length
    ? [changes && `${changes} con cambios pedidos`, pending && `${pending} por revisar`, approved && plural(approved, 'aprobado', 'aprobados')].filter(Boolean).join(' · ')
    : 'Lo que el cliente revisa y aprueba';

  async function remove(d) {
    if (!(await confirm({ title: 'Retirar entregable', message: `"${d.title}" deja de verse en el portal del cliente. Solo se puede mientras el cliente no haya decidido sobre él.`, confirmLabel: 'Retirar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/deliverables/${d.id}`, { method: 'DELETE' }), { success: 'Entregable retirado' })) onChanged();
  }

  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="deliverables-title">
      <SectionHead flush id="deliverables-title" icon={PackageCheck} tone={changes ? 'red' : 'violet'} title="Entregables" hint={hint}
        action={<button type="button" className={cx(SMALL_BTN, 'btn-outline')} onClick={() => setSharing(true)}><Plus className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Compartir entregable</span></button>} />
      {!clientPortal && deliverables.length > 0 && (
        <p className="flex items-start gap-2 border-b border-line bg-amber-soft px-4 py-2.5 text-xs text-amber-ink sm:px-5">
          <EyeOff className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span><HiddenReason reason={hidden} clientId={clientId} what="estos entregables" /></span>
        </p>
      )}
      {deliverables.length === 0 ? (
        <p className="flex items-start gap-2 px-4 py-4 text-sm text-muted sm:px-5">
          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" />
          Nada compartido todavía. Compartí prototipos, diseños o piezas con su enlace: el cliente los aprueba o pide cambios desde su portal y cada versión queda registrada.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {deliverables.map((d) => (
            <DeliverableItem key={d.id} d={d}>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer" className={cx(SMALL_BTN, 'btn-ghost')}><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
              <button type="button" className={cx(SMALL_BTN, d.status === 'cambios' ? 'btn-soft' : 'btn-outline')} onClick={() => setVersioning(d)}><Upload className="h-3.5 w-3.5" />Subir versión nueva</button>
              <button type="button" className={cx(SMALL_BTN, 'btn-ghost')} onClick={() => setHistory(d)}><History className="h-3.5 w-3.5" />Historial</button>
              {d.status === 'en_revision' && (
                <button type="button" className={cx(SMALL_BTN, 'btn-ghost text-coral-ink')} onClick={() => remove(d)} disabled={busy}><Trash2 className="h-3.5 w-3.5" />Retirar</button>
              )}
            </DeliverableItem>
          ))}
        </ul>
      )}
      {sharing && (
        <Layer>
          <ShareDeliverable projectId={project.id} clientId={clientId} clientName={clientName} clientPortal={clientPortal} hidden={hidden} projectBriefs={briefs}
            onClose={() => setSharing(false)} onSaved={onChanged} />
        </Layer>
      )}
      {versioning && <Layer><NewVersion deliverable={versioning} clientPortal={clientPortal} onClose={() => setVersioning(null)} onSaved={onChanged} /></Layer>}
      {history && <Layer><DeliverableHistory deliverable={history} onClose={() => setHistory(null)} /></Layer>}
    </section>
  );
}

// ── Briefs ──────────────────────────────────────────────────────────────────
/** Fila de un brief (enlace a /briefs/:id): código, estado, fechas de envío y completitud. */
export function BriefRow({ brief: b, showProject = false }) {
  const editable = BRIEF_EDITABLE_STATUSES.includes(b.status);
  const pct = b.completeness?.pct ?? 0;
  const range = b.send_start
    ? `Envío ${formatDate(b.send_start)}${b.send_end && b.send_end !== b.send_start ? ` → ${formatDate(b.send_end)}` : ''}`
    : 'Sin fecha de envío';
  const sent = b.submitted_at ? `Enviado ${timeAgo(b.submitted_at)}` : `Actualizado ${timeAgo(b.updated_at)}`;
  return (
    <li>
      <Link to={`/briefs/${b.id}`} className="group row items-start px-4 py-3 sm:px-5">
        <IconTile icon={ClipboardList} tone={BRIEF_STATUS[b.status]?.tone ?? 'slate'} size="sm" className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="num text-[11px] font-bold tracking-wide text-muted">{b.code}</span>
            <StatusBadge map={BRIEF_STATUS} value={b.status} />
            {b.urgent && <Badge tone="red">Urgente</Badge>}
            {b.created_by?.type === 'cliente' && <Badge tone="amber">Del cliente</Badge>}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-ink group-hover:text-brand-ink">{b.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{range}{showProject && b.project_name ? ` · ${b.project_name}` : ''}</span>
          {editable ? (
            <span className="mt-2 flex items-center gap-2">
              <ProgressBar value={pct / 100} tone={pct >= 100 ? 'teal' : 'brand'} className="max-w-40" label={`Completitud de ${b.code}`} />
              <span className="num text-xs font-semibold text-muted">{pct} %</span>
            </span>
          ) : (
            <span className="mt-0.5 block truncate text-xs text-muted">{sent} · versión {b.approved_version ?? b.version}</span>
          )}
        </span>
        <RowArrow className="mt-2" />
      </Link>
    </li>
  );
}

/** Briefs ligados al proyecto, con acceso directo a uno nuevo para su cliente. */
export function ProjectBriefsCard({ projectId, clientId, briefs }) {
  const newLink = `/briefs/nuevo?cliente=${clientId}&proyecto=${projectId}`;
  const open = briefs.filter((b) => !['cerrado', 'cancelado'].includes(b.status)).length;
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="briefs-title">
      <SectionHead flush id="briefs-title" icon={ClipboardList} tone="blue" title="Briefs"
        hint={briefs.length ? `${open} ${open === 1 ? 'abierto' : 'abiertos'} de ${briefs.length}` : 'Solicitudes creativas de este proyecto'}
        action={<Link to={newLink} className={cx(SMALL_BTN, 'btn-outline')}><FilePlus2 className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Nuevo brief</span></Link>} />
      {briefs.length === 0 ? (
        <p className="flex items-start gap-2 px-4 py-4 text-sm text-muted sm:px-5"><ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" />Sin briefs ligados. Usá «Nuevo brief» para levantar un requerimiento creativo con el formato de JC.</p>
      ) : <ul className="divide-y divide-line">{briefs.map((b) => <BriefRow key={b.id} brief={b} />)}</ul>}
    </section>
  );
}

/** Interruptor con texto visible (reutiliza el Switch accesible de 44 px). */
export function SwitchRow({ id, checked, onChange, label, hint, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <span className="pt-1"><Switch id={id} checked={checked} onChange={onChange} label={label} disabled={disabled} /></span>
    </div>
  );
}
