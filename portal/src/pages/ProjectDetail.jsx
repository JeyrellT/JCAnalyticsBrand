// Detalle del proyecto: avance al cliente (72 h), tareas, citas, historial e inversiones vinculadas.
import { useState } from 'react';
import {
  ArrowLeft, Pencil, Send, MessageCircle, Plus, ExternalLink, Archive, ArchiveRestore, CalendarPlus, Phone, User, CalendarDays, TrendingUp,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { PageLoader, Badge, Modal, Field, Select, ProgressBar, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonChip } from '../components/common.jsx';
import { ProjectForm } from './Projects.jsx';
import { PROJECT_KINDS, PROJECT_STATUS, SERVICES, UPDATE_CHANNELS, TASK_STATUS, TASK_STATUS_ORDER, APPOINTMENT_KINDS, INVESTMENT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatDate, formatDateTime, timeAgo, whatsappLink, dueLabel } from '../lib/format.js';

function UpdateModal({ project, onClose, onSaved }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const [channel, setChannel] = useState('whatsapp');
  const [note, setNote] = useState('');
  const greeting = project.contact_name ? `Hola ${project.contact_name.split(' ')[0]}` : 'Hola';
  const wa = whatsappLink(project.contact_phone, `${greeting}, te comparto el avance de ${project.name}:\n\n${note || '…'}\n\n${user.name.split(' ')[0]} · JC Analytics`);

  async function save(e) {
    e.preventDefault();
    const res = await run(() => api(`/api/projects/${project.id}/updates`, { method: 'POST', body: { channel, note } }), { success: 'Avance registrado: el reloj de 72 h vuelve a cero' });
    if (res) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title="Registrar avance al cliente"
      footer={<>
        {wa && channel === 'whatsapp' && <a className="btn btn-outline" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Abrir WhatsApp</a>}
        <button type="submit" form="update-form" className="btn btn-primary" disabled={busy || note.trim().length < 3}><Send className="h-4 w-4" />{busy ? 'Guardando…' : 'Registrar avance'}</button>
      </>}>
      <form id="update-form" onSubmit={save} className="space-y-4">
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">Compromiso JC Analytics: el cliente recibe un avance cada 72 h. Registrarlo deja constancia y reinicia el semáforo.</p>
        <Field label="Canal">{(id) => <Select id={id} options={Object.entries(UPDATE_CHANNELS).map(([value, label]) => ({ value, label }))} value={channel} onChange={setChannel} />}</Field>
        <Field label="¿Qué avanzamos?" hint={channel === 'whatsapp' && !project.contact_phone ? 'Agregá el WhatsApp del cliente en el proyecto para enviarlo con un toque.' : 'Este texto también se usa en el mensaje de WhatsApp.'}>
          {(id) => <textarea id={id} className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Quedó listo el carrito; mañana probamos pagos con SINPE." />}
        </Field>
      </form>
    </Modal>
  );
}

function QuickTask({ projectId, onCreated }) {
  const [title, setTitle] = useState('');
  const [run, busy] = useAction();
  async function add(e) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    const res = await run(() => api('/api/tasks', { method: 'POST', body: { title, project_id: projectId, status: 'por_hacer' } }));
    if (res) { setTitle(''); onCreated(); }
  }
  return (
    <form onSubmit={add} className="flex gap-2">
      <input className="input" placeholder="Nueva tarea para este proyecto" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Nueva tarea" />
      <button type="submit" className="btn btn-dark" disabled={busy || title.trim().length < 2}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Agregar</span></button>
    </form>
  );
}

export default function ProjectDetail({ params }) {
  const { canInvest } = useSession();
  const { data, error, reload } = useResource(`/api/projects/${params.id}`);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [run] = useAction();
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { project: p, tasks, updates, appointments, investments } = data;

  const patch = async (body, success) => { if (await run(() => api(`/api/projects/${p.id}`, { method: 'PATCH', body }), { success })) reload(); };
  const grouped = TASK_STATUS_ORDER.map((s) => [s, tasks.filter((t) => t.status === s)]).filter(([, list]) => list.length);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/proyectos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Proyectos</Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{p.client || PROJECT_KINDS[p.kind].label}</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge map={PROJECT_STATUS} value={p.status} />
              <Badge>{PROJECT_KINDS[p.kind].label}</Badge>
              {p.service && <Badge tone="blue">{SERVICES[p.service]}</Badge>}
              {p.archived && <Badge tone="ink">Archivado</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select className="w-auto" aria-label="Cambiar estado" options={Object.entries(PROJECT_STATUS).map(([value, v]) => ({ value, label: v.label }))} value={p.status} onChange={(v) => patch({ status: v }, 'Estado actualizado')} />
            <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</button>
            <button type="button" className="btn btn-ghost" onClick={() => patch({ archived: !p.archived }, p.archived ? 'Proyecto restaurado' : 'Proyecto archivado')}>
              {p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{p.archived ? 'Restaurar' : 'Archivar'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {p.kind === 'cliente' && (
            <section className={cx('card card-pad flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', p.sla_state === 'late' && 'border-coral/40 bg-coral-soft/40')}>
              <div>
                <h2 className="section-title">Avance al cliente</h2>
                <p className="mt-1 text-sm text-muted">
                  {p.last_update_at ? `Último avance ${timeAgo(p.last_update_at)}.` : 'Todavía no se registró ningún avance.'}
                  {p.sla_state ? '' : ' El semáforo corre solo en proyectos en curso o en revisión.'}
                </p>
                <div className="mt-2"><SlaBadge state={p.sla_state} hours={p.hours_since_update} /></div>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setUpdating(true)}><Send className="h-4 w-4" />Registrar avance</button>
            </section>
          )}

          <section className="card card-pad space-y-4" aria-labelledby="tasks-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="tasks-title" className="section-title">Tareas</h2>
              <Link to={`/tablero?proyecto=${p.id}`} className="text-sm font-semibold text-brand hover:underline">Ver en el tablero</Link>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar value={p.progress} label="Avance" />
              <span className="shrink-0 text-xs font-semibold tabular text-muted">{p.tasks_done}/{p.tasks_total}</span>
            </div>
            <QuickTask projectId={p.id} onCreated={reload} />
            {grouped.length === 0 ? <p className="text-sm text-muted">Sin tareas todavía.</p> : grouped.map(([status, list]) => (
              <div key={status}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{TASK_STATUS[status].label} · {list.length}</p>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {list.map((t) => {
                    const due = t.status !== 'hecho' ? dueLabel(t.due_date) : null;
                    return (
                      <li key={t.id}>
                        <Link to={`/tablero?tarea=${t.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                          <span className={cx('min-w-0 flex-1 truncate text-sm', t.status === 'hecho' && 'text-muted line-through')}>{t.title}</span>
                          {due && <Badge tone={due.tone}>{due.text}</Badge>}
                          <PersonChip name={t.assignee_name} color={t.assignee_color} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <section className="card card-pad" aria-labelledby="updates-title">
            <h2 id="updates-title" className="section-title">Historial de avances</h2>
            {updates.length === 0 ? <p className="mt-2 text-sm text-muted">Los avances enviados al cliente aparecerán aquí.</p> : (
              <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
                {updates.map((u) => (
                  <li key={u.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal" />
                    <p className="text-xs text-muted"><span className="font-semibold text-ink">{u.user_name}</span> · {UPDATE_CHANNELS[u.channel]} · {formatDateTime(u.created_at)}</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{u.note}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card card-pad">
            <h2 className="section-title">Ficha</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Responsable</dt><dd><PersonChip name={p.owner_name} color={p.owner_color} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Valor</dt><dd className="font-semibold tabular">{p.value_amount ? formatMoney(p.value_amount, p.currency) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Inicio</dt><dd>{formatDate(p.start_date)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Entrega comprometida</dt><dd>{formatDate(p.due_date)}</dd></div>
              {p.delivered_at && <div className="flex justify-between gap-3"><dt className="text-muted">Entregado</dt><dd>{formatDate(p.delivered_at)}</dd></div>}
              {p.support_ends && <div className="flex justify-between gap-3"><dt className="text-muted">Soporte 30 días hasta</dt><dd className="font-semibold">{formatDate(p.support_ends)}</dd></div>}
              {p.contact_name && <div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-muted"><User className="h-3.5 w-3.5" />Contacto</dt><dd>{p.contact_name}</dd></div>}
              {p.contact_phone && (
                <div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-muted"><Phone className="h-3.5 w-3.5" />WhatsApp</dt>
                  <dd><a className="font-semibold text-brand hover:underline" href={whatsappLink(p.contact_phone, `Hola${p.contact_name ? ` ${p.contact_name.split(' ')[0]}` : ''}, te escribe el equipo de JC Analytics.`)} target="_blank" rel="noreferrer">{p.contact_phone}</a></dd></div>
              )}
              {p.url && <div className="flex justify-between gap-3"><dt className="text-muted">Enlace</dt><dd className="min-w-0"><a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate font-semibold text-brand hover:underline">{new URL(p.url).hostname}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></dd></div>}
            </dl>
            {p.description && <p className="mt-4 whitespace-pre-line rounded-xl bg-paper p-3 text-sm text-ink/80">{p.description}</p>}
          </section>

          <section className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Citas</h2>
              <Link to={`/agenda?nueva=1&proyecto=${p.id}`} className="btn btn-outline btn-sm"><CalendarPlus className="h-3.5 w-3.5" />Agendar</Link>
            </div>
            {appointments.length === 0 ? <p className="mt-2 text-sm text-muted">Sin citas vinculadas.</p> : (
              <ul className="mt-3 space-y-2">
                {appointments.map((a) => (
                  <li key={a.id}><Link to={`/agenda?cita=${a.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block text-xs text-muted">{formatDateTime(a.starts_at)} · {APPOINTMENT_KINDS[a.kind]?.label}</span></span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>

          {canInvest && (
            <section className="card card-pad">
              <h2 className="section-title">Inversiones vinculadas</h2>
              {investments.length === 0 ? <p className="mt-2 text-sm text-muted">Ninguna inversión apunta a este proyecto.</p> : (
                <ul className="mt-3 space-y-2">
                  {investments.map((i) => (
                    <li key={i.id}><Link to={`/inversiones/${i.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                      <TrendingUp className="h-4 w-4 shrink-0 text-teal-dark" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</span><StatusBadge map={INVESTMENT_STATUS} value={i.status} />
                    </Link></li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>

      {editing && <ProjectForm open project={p} onClose={() => setEditing(false)} onSaved={reload} />}
      {updating && <UpdateModal project={p} onClose={() => setUpdating(false)} onSaved={reload} />}
    </div>
  );
}
