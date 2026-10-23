// Detalle del proyecto: avance al cliente (72 h), etapas y entregables del portal del cliente (v5), cliente, briefs,
// cobros (únicos o recurrentes), equipo, tareas, citas, historial e inversiones vinculadas.
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, Send, MessageCircle, Plus, ExternalLink, Archive, ArchiveRestore, CalendarPlus, Phone, User, CalendarDays, TrendingUp, Building2, Users,
  FolderKanban, ListChecks, History, FileText, CircleAlert, Clock3, CheckCircle2, Mail, Info, Eye,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageLoader, Badge, Avatar, AvatarStack, Modal, Field, Select, ProgressBar, IconTile, SectionHead, RowArrow, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonChip } from '../components/common.jsx';
import { ClientStatusBadge, MembersEditor, clientWhatsapp, membersToForm, normalizeMembers } from '../components/clients.jsx';
import { ProjectForm, projectClientName, projectMembers } from './Projects.jsx';
import { MilestonesCard, DeliverablesCard, ProjectBriefsCard } from '../components/portal-project.jsx';
import { ChargesCard } from '../components/charges.jsx';
import { PROJECT_KINDS, PROJECT_STATUS, PROJECT_ROLES, SERVICES, UPDATE_CHANNELS, TASK_STATUS, TASK_STATUS_ORDER, TASK_PRIORITY, APPOINTMENT_KINDS, INVESTMENT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatDate, formatDateTime, timeAgo, whatsappLink, dueLabel } from '../lib/format.js';

// El bloque "Avance al cliente" cambia de tono con el semáforo: vencido coral, pronto ámbar, al día turquesa.
const SLA_HERO = {
  late: { card: 'border-coral/40 bg-coral-soft', tile: 'red', icon: CircleAlert, bar: 'red', lead: 'El cliente lleva más de lo acordado sin noticias.' },
  warn: { card: 'border-amber/30 bg-amber-soft', tile: 'amber', icon: Clock3, bar: 'amber', lead: 'Se acerca el límite del compromiso.' },
  ok: { card: 'border-teal/30 bg-teal-soft', tile: 'teal', icon: CheckCircle2, bar: 'teal', lead: 'Compromiso cumplido por ahora.' },
};
const SLA_NONE = { card: '', tile: 'slate', icon: Send, bar: 'brand', lead: 'El semáforo corre solo en proyectos en curso o en revisión.' };

const CHANNEL_ICON = { whatsapp: MessageCircle, correo: Mail, reunion: Users, llamada: Phone, otro: Send };

function UpdateModal({ project, clientPortal, onClose, onSaved }) {
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
        {wa && channel === 'whatsapp' && <a className="btn btn-outline" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-teal-ink" />Abrir WhatsApp</a>}
        <button type="submit" form="update-form" className="btn btn-primary" disabled={busy || note.trim().length < 3}><Send className="h-4 w-4" />{busy ? 'Guardando…' : 'Registrar avance'}</button>
      </>}>
      <form id="update-form" onSubmit={save} className="space-y-4">
        <p className="flex gap-2.5 rounded-xl bg-brand-soft px-3 py-2.5 text-sm text-brand-ink"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Compromiso JC Analytics: el cliente recibe un avance cada 72 h. Registrarlo deja constancia y reinicia el semáforo.</p>
        {clientPortal && (
          <p className="flex gap-2.5 rounded-xl bg-teal-soft px-3 py-2.5 text-sm text-teal-ink">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><span className="font-semibold">Visible para el cliente en su portal.</span> Escribilo como se lo dirías a él: sin datos internos ni montos.</span>
          </p>
        )}
        <Field label="Canal">{(id) => <Select id={id} options={Object.entries(UPDATE_CHANNELS).map(([value, label]) => ({ value, label }))} value={channel} onChange={setChannel} />}</Field>
        <Field label="¿Qué avanzamos?" hint={channel === 'whatsapp' && !project.contact_phone ? 'Agregá el WhatsApp del cliente en el proyecto para enviarlo con un toque.' : 'Este texto también se usa en el mensaje de WhatsApp.'}>
          {(id) => <textarea id={id} className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Quedó listo el carrito; mañana probamos pagos con SINPE." />}
        </Field>
      </form>
    </Modal>
  );
}

function TeamModal({ project, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [members, setMembers] = useState(() => membersToForm(project.members));
  async function save(e) {
    e.preventDefault();
    const res = await run(() => api(`/api/projects/${project.id}`, { method: 'PATCH', body: { members: normalizeMembers(members, project.owner_id) } }), { success: 'Equipo actualizado' });
    if (res) { onSaved(); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title="Equipo del proyecto"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="team-form" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar equipo'}</button>
      </>}>
      <form id="team-form" onSubmit={save} className="space-y-3">
        <p className="text-sm text-muted">Sumá a quien trabaja en <span className="font-semibold text-ink">{project.name}</span> y elegí su rol. A quien agregués le llega un aviso.</p>
        <MembersEditor value={members} onChange={setMembers} ownerId={project.owner_id} />
        <p className="text-xs text-muted">Para cambiar el responsable usá «Editar» en el proyecto.</p>
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
      <button type="submit" className="btn btn-dark shrink-0" disabled={busy || title.trim().length < 2}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Agregar</span></button>
    </form>
  );
}

/** Fila de la ficha de datos: etiqueta a la izquierda, valor a la derecha. */
function Row({ label, icon: Icon, children, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 py-2.5 text-sm', className)}>
      <dt className="flex shrink-0 items-center gap-1.5 text-muted">{Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export default function ProjectDetail({ params }) {
  const { canInvest, user, settings } = useSession();
  const { query } = useLocation();
  const { data, error, reload, setData } = useResource(`/api/projects/${params.id}`);
  const [editing, setEditing] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [run] = useAction();

  // ?avance=1 (botón rápido del móvil) abre directo "Registrar avance", también si ya estábamos aquí.
  const avance = query.get('avance') === '1';
  const [updating, setUpdating] = useState(avance);
  const [seenAvance, setSeenAvance] = useState(avance);
  if (avance !== seenAvance) {
    setSeenAvance(avance);
    if (avance) setUpdating(true);
  }
  useEffect(() => { if (avance) navigate(`/proyectos/${params.id}`, { replace: true }); }, [avance, params.id]);

  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { project: p, tasks, updates, appointments, investments, milestones = [], deliverables = [], briefs = [], client_portal: clientPortal = false } = data;
  // El detalle trae el cliente como objeto (data.client); se toleran variantes del API.
  const client = data.client && typeof data.client === 'object' ? data.client : p.client && typeof p.client === 'object' ? p.client : null;
  const clientName = projectClientName(p) || client?.name || '';
  const clientId = p.client_id ?? client?.id ?? null;
  const members = projectMembers(p);
  const clientWa = clientWhatsapp(client, user.name);
  const editable = { ...p, client: clientName };
  // Para el WhatsApp del avance: si el proyecto no tiene contacto propio, se usa el del cliente.
  const updateTarget = { ...editable, contact_name: p.contact_name || client?.contact_name || null, contact_phone: p.contact_phone || client?.contact_phone || null };

  const patch = async (body, success) => { if (await run(() => api(`/api/projects/${p.id}`, { method: 'PATCH', body }), { success })) reload(); };
  const grouped = TASK_STATUS_ORDER.map((s) => [s, tasks.filter((t) => t.status === s)]).filter(([, list]) => list.length);
  const pct = Math.round((p.progress ?? 0) * 100);

  const hero = SLA_HERO[p.sla_state] ?? SLA_NONE;
  const slaHours = Number(settings.update_sla_hours) || 72;
  const elapsed = p.hours_since_update ?? 0;
  const headerTone = p.sla_state === 'late' ? 'red' : p.sla_state === 'warn' ? 'amber' : 'blue';
  // v5: las etapas se trabajan en proyectos de cliente (y se muestran si ya existen en otros);
  // entregables y briefs solo existen para proyectos con cliente.
  const showMilestones = !!clientId || milestones.length > 0;
  const setMilestones = (list) => setData((d) => (d ? { ...d, milestones: list } : d));
  const setProject = (project) => setData((d) => (d ? { ...d, project } : d));

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <Link to="/proyectos" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Proyectos</Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={FolderKanban} tone={headerTone} size="lg" className="mt-1 hidden sm:inline-flex" />
            <div className="min-w-0">
              {clientId ? (
                <Link to={`/clientes/${clientId}`} className="eyebrow inline-block max-w-full truncate hover:underline">{clientName || 'Ver cliente'}</Link>
              ) : <p className="eyebrow truncate">{clientName || PROJECT_KINDS[p.kind].label}</p>}
              <h1 className="mt-1 font-display text-[26px] font-bold leading-tight sm:text-[32px]">{p.name}</h1>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <StatusBadge map={PROJECT_STATUS} value={p.status} />
                <Badge>{PROJECT_KINDS[p.kind].label}</Badge>
                {p.service && <Badge tone="blue">{SERVICES[p.service]}</Badge>}
                {p.archived && <Badge tone="ink">Archivado</Badge>}
              </div>
              {members.length > 0 && (
                <a href="#equipo-proyecto" className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted transition hover:text-ink">
                  <AvatarStack people={members} size={26} max={5} />
                  <span className="truncate">{members.map((m) => m.name.split(' ')[0]).join(', ')}</span>
                </a>
              )}
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
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {p.kind === 'cliente' && (
            <section className={cx('card animate-rise relative overflow-hidden p-4 sm:p-5', hero.card)} aria-labelledby="sla-title">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <IconTile icon={hero.icon} tone={hero.tile} size="lg" className="h-14 w-14 shadow-card" iconClassName="h-7 w-7" />
                <div className="min-w-0 flex-1">
                  <h2 id="sla-title" className="section-title">Avance al cliente</h2>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {p.last_update_at ? `Último avance ${timeAgo(p.last_update_at)}.` : 'Todavía no se registró ningún avance.'} <span className="text-muted">{hero.lead}</span>
                  </p>
                  {p.sla_state && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
                      <span className="flex min-w-[140px] flex-1 items-center gap-2 sm:max-w-xs">
                        <ProgressBar value={elapsed / slaHours} tone={hero.bar} className="bg-surface/80" label={`Horas transcurridas del compromiso de ${slaHours} h`} />
                        <span className="num shrink-0 text-xs text-muted">{elapsed}/{slaHours} h</span>
                      </span>
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto sm:shrink-0" onClick={() => setUpdating(true)}><Send className="h-4 w-4" />Registrar avance</button>
              </div>
            </section>
          )}

          {showMilestones && <MilestonesCard project={p} milestones={milestones} clientPortal={clientPortal} clientId={clientId} onChange={setMilestones} />}

          {clientId && (
            <DeliverablesCard project={p} clientId={clientId} clientName={clientName} deliverables={deliverables} briefs={briefs} clientPortal={clientPortal} onChanged={reload} />
          )}

          <section className="card animate-rise overflow-hidden" aria-labelledby="tasks-title">
            <SectionHead flush id="tasks-title" icon={ListChecks} tone={p.tasks_overdue ? 'red' : 'blue'} title="Tareas"
              hint={p.tasks_total ? `${p.tasks_done} de ${p.tasks_total} hechas${p.tasks_overdue ? ` · ${p.tasks_overdue} vencidas` : ''}` : 'Todavía sin tareas'}
              action={<Link to={`/tablero?proyecto=${p.id}`} className="link tap -my-2 flex items-center text-sm">Ver en el tablero</Link>} />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <ProgressBar value={p.progress} tone={p.progress >= 1 ? 'teal' : 'brand'} label="Avance" />
                <span className="num shrink-0 text-sm font-bold text-ink">{pct} %</span>
              </div>
              <QuickTask projectId={p.id} onCreated={reload} />
            </div>
            {grouped.length === 0 ? <p className="border-t border-line px-4 py-4 text-sm text-muted sm:px-5">Sin tareas todavía. Agregá la primera arriba.</p> : grouped.map(([status, list]) => (
              <div key={status}>
                <p className="flex items-center gap-2 border-t border-line bg-surface-2/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5">
                  <span className={cx('h-1.5 w-1.5 rounded-full', `dot-${TASK_STATUS[status].tone}`)} aria-hidden="true" />
                  {TASK_STATUS[status].label} <span className="num font-semibold text-muted-2">{list.length}</span>
                </p>
                <ul className="divide-y divide-line border-t border-line">
                  {list.map((t) => {
                    const due = t.status !== 'hecho' ? dueLabel(t.due_date) : null;
                    const pr = TASK_PRIORITY[t.priority] ?? TASK_PRIORITY.media;
                    return (
                      <li key={t.id}>
                        <Link to={`/tablero?tarea=${t.id}`} className="group row min-h-12 px-4 py-2.5 sm:px-5">
                          <span className={cx('h-7 w-1 shrink-0 rounded-full', `dot-${pr.tone}`)} title={`Prioridad ${pr.label}`} aria-hidden="true" />
                          <span className={cx('min-w-0 flex-1 truncate text-sm font-medium', t.status === 'hecho' && 'text-muted line-through')}>{t.title}</span>
                          {due && <Badge tone={due.tone} className="hidden sm:inline-flex">{due.text}</Badge>}
                          <PersonChip name={t.assignee_name} color={t.assignee_color} />
                          <RowArrow />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="updates-title">
            <SectionHead flush id="updates-title" icon={History} tone="teal" title="Historial de avances" hint={updates.length ? `${updates.length} ${updates.length === 1 ? 'avance registrado' : 'avances registrados'}` : 'Lo que el cliente ha recibido'} />
            {updates.length === 0 ? <p className="px-4 py-4 text-sm text-muted sm:px-5">Los avances enviados al cliente aparecerán aquí.</p> : (
              <ol className="mx-4 my-4 space-y-5 border-l-2 border-line pl-5 sm:mx-5">
                {updates.map((u) => {
                  const Icon = CHANNEL_ICON[u.channel] ?? Send;
                  return (
                    <li key={u.id} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-teal" aria-hidden="true" />
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                        <span className="font-semibold text-ink">{u.user_name}</span>
                        <span aria-hidden="true">·</span>
                        <Badge><Icon className="h-3 w-3" />{UPDATE_CHANNELS[u.channel]}</Badge>
                        <span aria-hidden="true">·</span>
                        <span className="first-letter:uppercase">{formatDateTime(u.created_at)}</span>
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-ink-2">{u.note}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {clientId && (
            <section className="card animate-rise overflow-hidden" aria-labelledby="client-title">
              <SectionHead flush id="client-title" icon={Building2} tone="amber" title="Cliente" action={client?.status && <ClientStatusBadge status={client.status} />} />
              <Link to={`/clientes/${clientId}`} className="group row min-h-14 px-4 py-3 sm:px-5">
                <IconTile icon={Building2} tone="amber" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{clientName || 'Cliente'}</span>
                  <span className="block truncate text-xs text-muted">{client?.sector || 'Ver ficha del cliente'}</span>
                </span>
                <RowArrow />
              </Link>
              {(client?.contact_name || client?.contact_phone) && (
                <div className="flex items-center gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
                  <IconTile icon={User} tone="slate" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{client.contact_name || 'Contacto'}</span>
                    {client.contact_phone && <span className="block select-all text-xs tabular text-muted">{client.contact_phone}</span>}
                  </span>
                  {clientWa && <a href={clientWa} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm shrink-0"><MessageCircle className="h-3.5 w-3.5 text-teal-ink" />WhatsApp</a>}
                </div>
              )}
            </section>
          )}

          <ChargesCard project={p} onProject={setProject} />

          {clientId && <ProjectBriefsCard projectId={p.id} clientId={clientId} briefs={briefs} />}

          <section id="equipo-proyecto" className="card animate-rise scroll-mt-20 overflow-hidden" aria-labelledby="team-title">
            <SectionHead flush id="team-title" icon={Users} tone="teal" title="Equipo del proyecto" hint={members.length ? `${members.length} ${members.length === 1 ? 'persona' : 'personas'}` : undefined}
              action={<button type="button" className="btn btn-outline btn-sm max-sm:min-h-10 max-sm:min-w-10" onClick={() => setEditingTeam(true)} title="Editar equipo"><Pencil className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Editar equipo</span></button>} />
            {members.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted sm:px-5">Nadie asignado todavía. Elegí un responsable y sumá al equipo.</p>
            ) : (
              <ul className="divide-y divide-line">
                {members.map((m) => (
                  <li key={m.id}>
                    <Link to={`/equipo/${m.id}`} className="group row min-h-12 px-4 py-2 sm:px-5">
                      <Avatar name={m.name} color={m.color} size={30} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</span>
                      <Badge tone={m.role === 'responsable' ? 'blue' : 'slate'}>{PROJECT_ROLES[m.role] ?? m.role}</Badge>
                      <RowArrow />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {members.length === 1 && <p className="border-t border-line bg-surface-2/60 px-4 py-2.5 text-xs text-muted sm:px-5">¿Alguien más trabaja aquí? Sumalo con «Editar equipo».</p>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="sheet-title">
            <SectionHead flush id="sheet-title" icon={FileText} tone="slate" title="Ficha" />
            <dl className="divide-y divide-line px-4 sm:px-5">
              <Row label="Responsable"><PersonChip name={p.owner_name} color={p.owner_color} /></Row>
              <Row label="Valor"><span className="num text-[15px] font-bold">{p.value_amount ? formatMoney(p.value_amount, p.currency) : '—'}</span></Row>
              <Row label="Inicio">{formatDate(p.start_date)}</Row>
              <Row label="Entrega comprometida">{formatDate(p.due_date)}</Row>
              {p.delivered_at && <Row label="Entregado">{formatDate(p.delivered_at)}</Row>}
              {p.support_ends && <Row label="Soporte 30 días hasta"><span className="font-semibold text-amber-ink">{formatDate(p.support_ends)}</span></Row>}
              {p.contact_name && <Row label="Contacto" icon={User}><span className="block truncate">{p.contact_name}</span></Row>}
              {p.contact_phone && (
                <Row label="WhatsApp" icon={Phone}>
                  <a className="link tabular" href={whatsappLink(p.contact_phone, `Hola${p.contact_name ? ` ${p.contact_name.split(' ')[0]}` : ''}, te escribe el equipo de JC Analytics.`)} target="_blank" rel="noreferrer">{p.contact_phone}</a>
                </Row>
              )}
              {p.url && <Row label="Enlace"><a href={p.url} target="_blank" rel="noreferrer" className="link flex items-center justify-end gap-1 truncate">{new URL(p.url).hostname}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></Row>}
            </dl>
            {p.description && <p className="mx-4 mb-4 mt-1 whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm text-ink-2 sm:mx-5">{p.description}</p>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="appts-title">
            <SectionHead flush id="appts-title" icon={CalendarDays} tone="violet" title="Citas" hint={appointments.length ? `${appointments.length} ${appointments.length === 1 ? 'vinculada' : 'vinculadas'}` : undefined}
              action={<Link to={`/agenda?nueva=1&proyecto=${p.id}`} className="btn btn-outline btn-sm"><CalendarPlus className="h-3.5 w-3.5" />Agendar</Link>} />
            {appointments.length === 0 ? <p className="px-4 py-4 text-sm text-muted sm:px-5">Sin citas vinculadas.</p> : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => {
                  const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
                  return (
                    <li key={a.id}>
                      <Link to={`/agenda?cita=${a.id}`} className="group row min-h-12 px-4 py-2.5 sm:px-5">
                        <span className={cx('h-8 w-1 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className={cx('block truncate text-sm font-semibold', a.status === 'cancelada' && 'text-muted line-through')}>{a.title}</span>
                          <span className="block truncate text-xs text-muted first-letter:uppercase">{formatDateTime(a.starts_at)} · {APPOINTMENT_KINDS[a.kind]?.label}</span>
                        </span>
                        <RowArrow />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canInvest && (
            <section className="card animate-rise overflow-hidden" aria-labelledby="inv-title">
              <SectionHead flush id="inv-title" icon={TrendingUp} tone="teal" title="Inversiones vinculadas" />
              {investments.length === 0 ? <p className="px-4 py-4 text-sm text-muted sm:px-5">Ninguna inversión apunta a este proyecto.</p> : (
                <ul className="divide-y divide-line">
                  {investments.map((i) => (
                    <li key={i.id}>
                      <Link to={`/inversiones/${i.id}`} className="group row min-h-12 px-4 py-2.5 sm:px-5">
                        <IconTile icon={TrendingUp} tone="teal" size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</span>
                        <StatusBadge map={INVESTMENT_STATUS} value={i.status} />
                        <RowArrow />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>

      {editing && <ProjectForm open project={editable} onClose={() => setEditing(false)} onSaved={reload} />}
      {editingTeam && <TeamModal project={p} onClose={() => setEditingTeam(false)} onSaved={reload} />}
      {updating && <UpdateModal project={updateTarget} clientPortal={clientPortal} onClose={() => setUpdating(false)} onSaved={reload} />}
    </div>
  );
}
