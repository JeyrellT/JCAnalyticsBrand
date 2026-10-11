// Ficha del cliente: contacto, quién lleva la relación, proyectos, citas e historial de avances.
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Pencil, Plus, MessageCircle, Mail, Phone, User, CalendarPlus, CalendarDays, FolderKanban, ChevronRight, StickyNote,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageLoader, EmptyState, Avatar, AvatarStack, Badge, Select, ProgressBar, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge } from '../components/common.jsx';
import { ClientForm, ClientStatusBadge, clientWhatsapp } from '../components/clients.jsx';
import { ProjectForm, projectMembers } from './Projects.jsx';
import { CLIENT_STATUS, PROJECT_STATUS, SERVICES, UPDATE_CHANNELS, APPOINTMENT_KINDS, APPOINTMENT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatDateTime, timeAgo } from '../lib/format.js';

const CLOSED = ['entregado', 'cerrado'];
const statusOptions = Object.entries(CLIENT_STATUS).map(([value, v]) => ({ value, label: v.label }));

function Summary({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white px-3 py-2.5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-bold tabular">{value}</p>
      {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ProjectRow({ p }) {
  const members = projectMembers(p);
  return (
    <li>
      <Link to={`/proyectos/${p.id}`} className="block space-y-2 rounded-xl border border-line p-3 transition hover:border-slate-300 hover:bg-slate-50">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">{p.name}</span>
            {p.service && <span className="block truncate text-xs text-muted">{SERVICES[p.service]}</span>}
          </span>
          <StatusBadge map={PROJECT_STATUS} value={p.status} />
        </div>
        {(p.sla_state || p.archived) && (
          <div className="flex flex-wrap gap-1.5">
            <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
            {p.archived && <Badge tone="ink">Archivado</Badge>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <ProgressBar value={p.progress ?? 0} label={`Avance de ${p.name}`} />
          <span className="shrink-0 text-xs tabular text-muted">{Math.round((p.progress ?? 0) * 100)} %</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {members.length ? <AvatarStack people={members} size={22} max={4} /> : <span className="text-xs text-muted">Sin equipo</span>}
          {p.value_amount ? <span className="text-xs font-semibold tabular">{formatMoney(p.value_amount, p.currency)}</span> : null}
        </div>
      </Link>
    </li>
  );
}

function AppointmentRow({ a, past }) {
  const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
  return (
    <li>
      <Link to={`/agenda?cita=${a.id}`} className={cx('flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50', (past || a.status === 'cancelada') && 'opacity-70')}>
        <span className={cx('h-9 w-1 shrink-0 rounded-full', `dot-${tone}`)} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm font-semibold', a.status === 'cancelada' && 'line-through')}>{a.title}</span>
          <span className="block truncate text-xs text-muted first-letter:uppercase">{formatDateTime(a.starts_at)} · {APPOINTMENT_KINDS[a.kind]?.label}</span>
        </span>
        {a.attendees?.length ? <AvatarStack people={a.attendees} size={22} max={2} /> : null}
        <StatusBadge map={APPOINTMENT_STATUS} value={a.status} dot={false} />
      </Link>
    </li>
  );
}

export default function ClientDetail({ params }) {
  const { user } = useSession();
  const { data, error, reload } = useResource(`/api/clients/${params.id}`);
  const [editing, setEditing] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [run, busy] = useAction();

  const { upcoming, past } = useMemo(() => {
    const list = data?.appointments ?? [];
    const now = new Date().toISOString();
    return {
      upcoming: list.filter((a) => a.ends_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      past: list.filter((a) => a.ends_at < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    };
  }, [data]);

  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { client: c, projects = [], updates = [] } = data;
  const wa = clientWhatsapp(c, user.name);
  const openProjects = projects.filter((p) => !CLOSED.includes(p.status) && !p.archived);
  const otherProjects = projects.filter((p) => CLOSED.includes(p.status) || p.archived);
  const projectName = (id) => projects.find((p) => p.id === id)?.name;
  const activeCount = c.projects_active ?? openProjects.length;
  const ago = c.last_contact_at ? timeAgo(c.last_contact_at) : '';
  const lastContact = !ago ? { value: '—', hint: 'Sin registrar' } : ago.startsWith('hace ') ? { value: ago.slice(5), hint: 'atrás' } : { value: ago, hint: null };

  const setStatus = async (status) => {
    if (status === c.status) return;
    if (await run(() => api(`/api/clients/${c.id}`, { method: 'PATCH', body: { status } }), { success: `Cliente marcado como ${CLIENT_STATUS[status].label.toLowerCase()}` })) reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Clientes</Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{c.sector || 'Cliente'}</p>
            <h1 className="break-words font-display text-2xl font-bold sm:text-3xl">{c.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5"><ClientStatusBadge status={c.status} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select className="sm:w-auto" aria-label="Cambiar estado del cliente" options={statusOptions} value={c.status} onChange={setStatus} disabled={busy} />
            <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
          <Summary label="Proyectos" value={activeCount} hint={`activos de ${c.projects_total ?? projects.length}`} />
          <Summary label="Valor" value={c.value_crc ? formatMoney(c.value_crc, 'CRC', { compact: true }) : '—'} hint="en curso" />
          <Summary label="Contacto" value={lastContact.value} hint={lastContact.hint} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* En móvil, el contacto va primero: es lo que más se busca. */}
        <aside className="space-y-6 xl:order-2">
          <section className="card card-pad" aria-labelledby="contact-title">
            <h2 id="contact-title" className="section-title">Contacto</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <dt className="shrink-0 text-muted"><User className="h-4 w-4" aria-hidden /><span className="sr-only">Persona de contacto</span></dt>
                <dd className="min-w-0 font-semibold">{c.contact_name || <span className="font-normal text-muted">Sin persona de contacto</span>}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="shrink-0 text-muted"><Phone className="h-4 w-4" aria-hidden /><span className="sr-only">Teléfono</span></dt>
                <dd className="min-w-0 flex-1">{c.contact_phone ? <span className="select-all tabular">{c.contact_phone}</span> : <span className="text-muted">Sin teléfono</span>}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="shrink-0 text-muted"><Mail className="h-4 w-4" aria-hidden /><span className="sr-only">Correo</span></dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  {c.contact_email ? <span className="min-w-0 flex-1 select-all break-all">{c.contact_email}</span> : <span className="text-muted">Sin correo</span>}
                  {c.contact_email && <a href={`mailto:${c.contact_email}`} className="btn btn-ghost btn-sm shrink-0 text-brand">Escribir</a>}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-muted">Lleva la relación</dt>
                <dd className="min-w-0">
                  {c.owner_id ? (
                    <Link to={`/equipo/${c.owner_id}`} className="flex min-w-0 items-center gap-2 font-semibold hover:text-brand">
                      <Avatar name={c.owner_name} color={c.owner_color} size={26} /><span className="truncate">{c.owner_name}</span>
                    </Link>
                  ) : <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setEditing(true)}>Asignar</button>}
                </dd>
              </div>
            </dl>
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="btn btn-teal mt-4 w-full"><MessageCircle className="h-4 w-4" />Escribir por WhatsApp</a>
            ) : (
              <button type="button" className="btn btn-outline mt-4 w-full" onClick={() => setEditing(true)}><Phone className="h-4 w-4" />Agregar WhatsApp</button>
            )}
          </section>

          <section className="card card-pad" aria-labelledby="notes-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="notes-title" className="section-title">Notas</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Editar</button>
            </div>
            {c.notes ? <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{c.notes}</p> : (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />Anotá cómo nos conoció, qué le importa y cuándo conviene llamarle.</p>
            )}
          </section>
        </aside>

        <div className="space-y-6 xl:order-1">
          <section className="card card-pad" aria-labelledby="projects-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="projects-title" className="section-title">Proyectos</h2>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setNewProject(true)}><Plus className="h-3.5 w-3.5" />Nuevo proyecto</button>
            </div>
            {projects.length === 0 ? (
              <div className="mt-3">
                <EmptyState icon={FolderKanban} title="Sin proyectos todavía" action={<button type="button" className="btn btn-primary" onClick={() => setNewProject(true)}><Plus className="h-4 w-4" />Crear el primero</button>}>
                  Creá un proyecto para seguir tareas, avances cada 72 h y el equipo que lo trabaja.
                </EmptyState>
              </div>
            ) : (
              <>
                {openProjects.length > 0 ? <ul className="mt-3 space-y-2">{openProjects.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
                  : <p className="mt-2 text-sm text-muted">No hay proyectos abiertos con este cliente.</p>}
                {otherProjects.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Entregados, cerrados o archivados · {otherProjects.length}</p>
                    <ul className="space-y-2">{otherProjects.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
                  </>
                )}
              </>
            )}
          </section>

          <section className="card card-pad" aria-labelledby="appts-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="appts-title" className="section-title">Citas</h2>
              <Link to={`/agenda?nueva=1&cliente=${c.id}`} className="btn btn-outline btn-sm"><CalendarPlus className="h-3.5 w-3.5" />Agendar cita</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />No hay citas próximas. Agendá un seguimiento para no perder el hilo.</p>
            ) : <ul className="mt-3 space-y-1">{upcoming.map((a) => <AppointmentRow key={a.id} a={a} />)}</ul>}
            {past.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <button type="button" className="flex min-h-10 w-full items-center justify-between text-sm font-semibold text-muted hover:text-ink" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast}>
                  Citas anteriores · {past.length}
                  <ChevronRight className={cx('h-4 w-4 transition', showPast && 'rotate-90')} />
                </button>
                {showPast && <ul className="mt-1 space-y-1">{past.map((a) => <AppointmentRow key={a.id} a={a} past />)}</ul>}
              </div>
            )}
          </section>

          <section className="card card-pad" aria-labelledby="updates-title">
            <h2 id="updates-title" className="section-title">Historial de avances</h2>
            {updates.length === 0 ? <p className="mt-2 text-sm text-muted">Los avances que se registren en sus proyectos aparecerán aquí.</p> : (
              <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
                {updates.map((u) => {
                  const pName = u.project_name ?? projectName(u.project_id);
                  return (
                    <li key={u.id} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal" />
                      <p className="text-xs text-muted">
                        <span className="font-semibold text-ink">{u.user_name}</span> · {UPDATE_CHANNELS[u.channel] ?? u.channel} · {formatDateTime(u.created_at)}
                      </p>
                      {pName && <Link to={`/proyectos/${u.project_id}`} className="text-xs font-semibold text-brand hover:underline">{pName}</Link>}
                      <p className="mt-1 whitespace-pre-line text-sm">{u.note}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      {editing && <ClientForm client={c} onClose={() => setEditing(false)} onSaved={reload} />}
      {newProject && (
        <ProjectForm open defaults={{ kind: 'cliente', client_id: c.id, client: c.name, contact_name: c.contact_name ?? '', contact_phone: c.contact_phone ?? '' }}
          onClose={() => setNewProject(false)} onSaved={(p) => { reload(); navigate(`/proyectos/${p.id}`); }} />
      )}
    </div>
  );
}
