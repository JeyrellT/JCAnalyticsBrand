// Ficha del cliente: contacto, quién lleva la relación, proyectos, portal del cliente (v5), citas e historial de avances.
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Pencil, Plus, MessageCircle, Mail, Phone, User, Building2, CalendarPlus, CalendarDays, FolderKanban, ChevronDown, StickyNote, History, UserRound, Globe,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageLoader, EmptyState, Avatar, AvatarStack, Badge, Select, ProgressBar, SectionHead, RowArrow, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge } from '../components/common.jsx';
import { ClientForm, ClientStatusBadge, clientWhatsapp } from '../components/clients.jsx';
import { ClientPortalSection } from '../components/portal-admin.jsx';
import { ProjectForm, projectMembers } from './Projects.jsx';
import { CLIENT_STATUS, PROJECT_STATUS, SERVICES, UPDATE_CHANNELS, APPOINTMENT_KINDS, APPOINTMENT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatDateTime, timeAgo } from '../lib/format.js';

const CLOSED = ['entregado', 'cerrado'];
const statusOptions = Object.entries(CLIENT_STATUS).map(([value, v]) => ({ value, label: v.label }));

/** Celda del resumen de la cabecera: etiqueta, número grande y una pista. */
function Summary({ label, value, hint }) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="num mt-0.5 truncate text-lg font-bold sm:text-xl">{value}</p>
      {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ProjectRow({ p }) {
  const members = projectMembers(p);
  return (
    <li>
      <Link to={`/proyectos/${p.id}`} className="group row flex-col items-stretch gap-2.5 px-4 py-3.5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-snug group-hover:text-brand-ink">{p.name}</span>
            {p.service && <span className="block truncate text-xs text-muted">{SERVICES[p.service]}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <StatusBadge map={PROJECT_STATUS} value={p.status} />
            <RowArrow className="hidden sm:block" />
          </span>
        </div>
        {(p.sla_state || p.archived) && (
          <div className="flex flex-wrap gap-1.5">
            <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
            {p.archived && <Badge tone="ink">Archivado</Badge>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <ProgressBar value={p.progress ?? 0} tone={p.progress >= 1 ? 'teal' : 'brand'} label={`Avance de ${p.name}`} />
          <span className="num shrink-0 text-xs font-semibold text-muted">{Math.round((p.progress ?? 0) * 100)} %</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {members.length ? <AvatarStack people={members} size={22} max={4} /> : <span className="text-xs text-muted">Sin equipo</span>}
          {p.value_amount ? <span className="num text-sm font-semibold">{formatMoney(p.value_amount, p.currency)}</span> : null}
        </div>
      </Link>
    </li>
  );
}

function AppointmentRow({ a, past }) {
  const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
  return (
    <li>
      <Link to={`/agenda?cita=${a.id}`} className={cx('group row min-h-14 px-4 py-2.5 sm:px-5', (past || a.status === 'cancelada') && 'opacity-70')}>
        <span className={cx('h-9 w-1 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm font-semibold', a.status === 'cancelada' && 'line-through')}>{a.title}</span>
          <span className="block truncate text-xs text-muted first-letter:uppercase">{formatDateTime(a.starts_at)} · {APPOINTMENT_KINDS[a.kind]?.label}</span>
        </span>
        {a.attendees?.length ? <span className="hidden sm:block"><AvatarStack people={a.attendees} size={22} max={2} /></span> : null}
        <StatusBadge map={APPOINTMENT_STATUS} value={a.status} dot={false} />
        <RowArrow className="hidden sm:block" />
      </Link>
    </li>
  );
}

/** Fila del bloque de contacto: ícono, valor y una acción opcional a la derecha. */
function ContactRow({ icon: Icon, label, children, action }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2.5 sm:px-5">
      <dt className="shrink-0 text-muted-2"><Icon className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{label}</span></dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
      {action}
    </div>
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

  const back = <Link to="/clientes" className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Clientes</Link>;
  if (!data) return <>{back}<PageLoader error={error} onRetry={reload} /></>;
  const { client: c, projects = [], updates = [], portal } = data;
  const portalAccess = (portal?.accounts ?? []).filter((a) => a.active).length;
  const wa = clientWhatsapp(c, user.name);
  const tel = c.contact_phone ? `tel:${String(c.contact_phone).replace(/[^\d+]/g, '')}` : null;
  const openProjects = projects.filter((p) => !CLOSED.includes(p.status) && !p.archived);
  const otherProjects = projects.filter((p) => CLOSED.includes(p.status) || p.archived);
  const projectName = (id) => projects.find((p) => p.id === id)?.name;
  const activeCount = c.projects_active ?? openProjects.length;
  const ago = c.last_contact_at ? timeAgo(c.last_contact_at) : '';
  const lastContact = !ago ? { value: '—', hint: 'Sin registrar' } : ago.startsWith('hace ') ? { value: ago.slice(5), hint: 'atrás' } : { value: ago, hint: null };
  const initial = (c.name ?? '').trim().charAt(0).toUpperCase();

  const setStatus = async (status) => {
    if (status === c.status) return;
    if (await run(() => api(`/api/clients/${c.id}`, { method: 'PATCH', body: { status } }), { success: `Cliente marcado como ${CLIENT_STATUS[status].label.toLowerCase()}` })) reload();
  };

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        {back}
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="icon-tile tile-amber h-14 w-14 rounded-2xl font-display text-2xl font-bold shadow-card sm:h-16 sm:w-16 sm:text-[28px]" aria-hidden="true">
              {initial || <Building2 className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="eyebrow">{c.sector || 'Cliente'}</p>
              <h1 className="mt-0.5 break-words font-display text-[26px] font-bold leading-tight sm:text-[32px]">{c.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ClientStatusBadge status={c.status} />
                {portalAccess > 0 && <Badge tone="teal"><Globe className="h-3 w-3" aria-hidden="true" />Portal activo</Badge>}
                {c.contact_name && <span className="text-sm text-muted">· {c.contact_name}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0 lg:justify-end">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-teal"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {tel && <a href={tel} className="btn btn-outline"><Phone className="h-4 w-4" />Llamar</a>}
            <Select className="sm:w-auto" aria-label="Cambiar estado del cliente" options={statusOptions} value={c.status} onChange={setStatus} disabled={busy} />
            <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</button>
          </div>
        </div>
        <dl className="card mt-5 grid grid-cols-3 divide-x divide-line overflow-hidden lg:max-w-xl">
          <Summary label="Proyectos" value={activeCount} hint={`activos de ${c.projects_total ?? projects.length}`} />
          <Summary label="Valor" value={c.value_crc ? formatMoney(c.value_crc, 'CRC', { compact: true }) : '—'} hint="en curso" />
          <Summary label="Contacto" value={lastContact.value} hint={lastContact.hint} />
        </dl>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* En móvil, el contacto va primero: es lo que más se busca. */}
        <aside className="space-y-6 xl:order-2">
          <section className="card animate-rise overflow-hidden" aria-labelledby="contact-title">
            <SectionHead flush id="contact-title" icon={UserRound} tone="amber" title="Contacto" hint={c.contact_name ? 'Con quién hablamos' : 'Todavía sin persona de contacto'} />
            <dl className="divide-y divide-line">
              <ContactRow icon={User} label="Persona de contacto">
                {c.contact_name ? <span className="font-semibold">{c.contact_name}</span> : <span className="text-muted">Sin persona de contacto</span>}
              </ContactRow>
              <ContactRow icon={Phone} label="Teléfono" action={tel && <a href={tel} className="btn btn-ghost btn-sm shrink-0 text-brand-ink">Llamar</a>}>
                {c.contact_phone ? <span className="num select-all">{c.contact_phone}</span> : <span className="text-muted">Sin teléfono</span>}
              </ContactRow>
              <ContactRow icon={Mail} label="Correo" action={c.contact_email && <a href={`mailto:${c.contact_email}`} className="btn btn-ghost btn-sm shrink-0 text-brand-ink">Escribir</a>}>
                {c.contact_email ? <span className="block select-all break-all">{c.contact_email}</span> : <span className="text-muted">Sin correo</span>}
              </ContactRow>
              <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                <dt className="text-sm text-muted">Lleva la relación</dt>
                <dd className="min-w-0">
                  {c.owner_id ? (
                    <Link to={`/equipo/${c.owner_id}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold hover:text-brand-ink">
                      <Avatar name={c.owner_name} color={c.owner_color} size={26} /><span className="truncate">{c.owner_name}</span>
                    </Link>
                  ) : <button type="button" className="link text-sm" onClick={() => setEditing(true)}>Asignar</button>}
                </dd>
              </div>
            </dl>
            {wa ? (
              <div className="border-t border-line p-3 sm:p-4">
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-teal w-full"><MessageCircle className="h-4 w-4" />Escribir por WhatsApp</a>
              </div>
            ) : (
              <div className="border-t border-line p-3 sm:p-4">
                <button type="button" className="btn btn-outline w-full" onClick={() => setEditing(true)}><Phone className="h-4 w-4" />Agregar WhatsApp</button>
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="notes-title">
            <SectionHead flush id="notes-title" icon={StickyNote} tone="slate" title="Notas"
              action={<button type="button" className="btn btn-ghost btn-sm -my-1" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Editar</button>} />
            <div className="p-4 sm:p-5">
              {c.notes ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{c.notes}</p> : (
                <p className="flex items-start gap-2 text-sm text-muted"><StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />Anotá cómo nos conoció, qué le importa y cuándo conviene llamarle.</p>
              )}
            </div>
          </section>
        </aside>

        <div className="space-y-6 xl:order-1">
          <section className="card animate-rise overflow-hidden" aria-labelledby="projects-title">
            <SectionHead flush id="projects-title" icon={FolderKanban} tone="blue" title="Proyectos"
              hint={projects.length ? `${openProjects.length} ${openProjects.length === 1 ? 'abierto' : 'abiertos'} de ${projects.length}` : 'Nada en curso todavía'}
              action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setNewProject(true)}><Plus className="h-3.5 w-3.5" />Nuevo proyecto</button>} />
            {projects.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState icon={FolderKanban} title="Sin proyectos todavía" action={<button type="button" className="btn btn-primary" onClick={() => setNewProject(true)}><Plus className="h-4 w-4" />Crear el primero</button>}>
                  Creá un proyecto para seguir tareas, avances cada 72 h y el equipo que lo trabaja.
                </EmptyState>
              </div>
            ) : (
              <>
                {openProjects.length > 0 ? <ul className="divide-y divide-line">{openProjects.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
                  : <p className="px-4 py-4 text-sm text-muted sm:px-5">No hay proyectos abiertos con este cliente.</p>}
                {otherProjects.length > 0 && (
                  <>
                    <p className="border-y border-line bg-surface-2/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5">Entregados, cerrados o archivados · {otherProjects.length}</p>
                    <ul className="divide-y divide-line">{otherProjects.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
                  </>
                )}
              </>
            )}
          </section>

          {portal && <ClientPortalSection client={c} portal={portal} projects={projects} onReload={reload} />}

          <section className="card animate-rise overflow-hidden" aria-labelledby="appts-title">
            <SectionHead flush id="appts-title" icon={CalendarDays} tone="violet" title="Citas"
              hint={upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'próxima' : 'próximas'}` : 'Sin citas próximas'}
              action={<Link to={`/agenda?nueva=1&cliente=${c.id}`} className="btn btn-outline btn-sm"><CalendarPlus className="h-3.5 w-3.5" />Agendar cita</Link>} />
            {upcoming.length === 0 ? (
              <p className="flex items-start gap-2 px-4 py-4 text-sm text-muted sm:px-5"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />No hay citas próximas. Agendá un seguimiento para no perder el hilo.</p>
            ) : <ul className="divide-y divide-line">{upcoming.map((a) => <AppointmentRow key={a.id} a={a} />)}</ul>}
            {past.length > 0 && (
              <div className="border-t border-line">
                <button type="button" className="tap flex w-full items-center justify-between bg-surface-2/60 px-4 text-sm font-semibold text-muted transition hover:text-ink sm:px-5" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast}>
                  Citas anteriores · {past.length}
                  <ChevronDown className={cx('h-4 w-4 transition', showPast && 'rotate-180')} />
                </button>
                {showPast && <ul className="divide-y divide-line border-t border-line">{past.map((a) => <AppointmentRow key={a.id} a={a} past />)}</ul>}
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="updates-title">
            <SectionHead flush id="updates-title" icon={History} tone="teal" title="Historial de avances" hint={updates.length ? `${updates.length} ${updates.length === 1 ? 'avance registrado' : 'avances registrados'}` : 'Lo que le fuimos contando'} />
            <div className="p-4 sm:p-5">
              {updates.length === 0 ? <p className="text-sm text-muted">Los avances que se registren en sus proyectos aparecerán aquí.</p> : (
                <ol className="space-y-5 border-l-2 border-line pl-5">
                  {updates.map((u) => {
                    const pName = u.project_name ?? projectName(u.project_id);
                    return (
                      <li key={u.id} className="relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-teal" aria-hidden="true" />
                        <p className="text-xs text-muted">
                          <span className="font-semibold text-ink">{u.user_name}</span> · {UPDATE_CHANNELS[u.channel] ?? u.channel} · <span className="first-letter:uppercase">{formatDateTime(u.created_at)}</span>
                        </p>
                        {pName && <Link to={`/proyectos/${u.project_id}`} className="link text-xs">{pName}</Link>}
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{u.note}</p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
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
