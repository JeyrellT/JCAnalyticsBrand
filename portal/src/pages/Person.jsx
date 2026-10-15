// Ficha de una persona: contacto, carga de trabajo, servicios, proyectos, tareas, citas y actividad reciente.
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle, Pencil, FolderKanban, ListChecks, CalendarClock, History, Layers, Crown } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageLoader, EmptyState, Badge, Avatar, SectionHead, RowArrow, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge } from '../components/common.jsx';
import { LoadBadge, RoleBadge, PersonCounts } from '../components/people.jsx';
import { ServiceChip } from '../components/services.jsx';
import { PROJECT_ROLES, PROJECT_STATUS, PROJECT_KINDS, TASK_PRIORITY, APPOINTMENT_KINDS } from '../../shared/catalog.js';
import { dueLabel, formatDateTime, timeAgo, whatsappLink, todayKey } from '../lib/format.js';

/** Sección en tarjeta con encabezado de mosaico, contador y acción opcional. */
function Section({ id, title, icon, tone = 'blue', count, hint, link, children }) {
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby={id}>
      <SectionHead flush id={id} icon={icon} tone={tone} title={title} hint={hint}
        action={<>{count != null && count > 0 && <Badge tone="slate">{count}</Badge>}{link}</>} />
      {children}
    </section>
  );
}

const Empty = (props) => <div className="p-4 sm:p-5"><EmptyState {...props} /></div>;

/** Dato de contacto: ícono, valor seleccionable y acción a la derecha. */
function ContactPill({ icon: Icon, label, children, action }) {
  return (
    <div className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" /><span className="sr-only">{label}:</span>
      <span className="min-w-0 flex-1 select-all break-all">{children}</span>
      {action}
    </div>
  );
}

export default function Person({ params }) {
  const { user, isAdmin } = useSession();
  const { data, error, reload } = useResource(`/api/people/${encodeURIComponent(params.id)}`);
  const [allActivity, setAllActivity] = useState(false);

  const back = <Link to="/equipo" className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Equipo</Link>;
  if (!data) return <>{back}<PageLoader error={error} onRetry={reload} /></>;

  const { person: p, services = [], projects = [], tasks = [], appointments = [], activity = [] } = data;
  const isMe = p.id === user.id;
  const first = p.name.split(' ')[0];
  const wa = whatsappLink(p.phone, `Hola ${first}`);
  const tel = p.phone ? `tel:${String(p.phone).replace(/[^\d+]/g, '')}` : null;
  const lead = services.filter((s) => s.role === 'lider');
  const member = services.filter((s) => s.role !== 'lider');
  const shownActivity = allActivity ? activity : activity.slice(0, 8);
  const today = todayKey();
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today).length;

  return (
    <div className="space-y-6">
      <div className="animate-rise">
        {back}
        <section className="card mt-2 overflow-hidden" aria-label="Datos de la persona">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar name={p.name} color={p.color} size={64} className="shadow-raised" />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{isMe ? 'Tu ficha' : 'Ficha del equipo'}</p>
                  <h1 className="mt-0.5 break-words font-display text-[26px] font-bold leading-tight sm:text-[32px]">
                    {p.name}{isMe && <span className="ml-2 align-middle font-sans text-sm font-normal text-muted">(vos)</span>}
                  </h1>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <RoleBadge role={p.role} />
                    <LoadBadge load={p.load} />
                    {p.active === false && <Badge tone="slate">Sin acceso</Badge>}
                    {lead.length > 0 && <Badge tone="violet"><Crown className="h-3 w-3" aria-hidden="true" />Lidera {lead.length} {lead.length === 1 ? 'servicio' : 'servicios'}</Badge>}
                  </div>
                </div>
              </div>
              {(wa || isMe) && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap">
                  {wa && !isMe && <a className="btn btn-teal" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
                  {tel && !isMe && <a className="btn btn-outline" href={tel}><Phone className="h-4 w-4" />Llamar</a>}
                  {isMe && <Link to="/equipo?tab=perfil" className="btn btn-outline col-span-2 sm:col-span-1"><Pencil className="h-4 w-4" />Editar mi perfil</Link>}
                </div>
              )}
            </div>

            {(p.email || p.phone) && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {p.email && (
                  <ContactPill icon={Mail} label="Correo" action={<a href={`mailto:${p.email}`} className="btn btn-ghost btn-sm shrink-0 text-brand-ink">Escribir</a>}>{p.email}</ContactPill>
                )}
                {p.phone && (
                  <ContactPill icon={Phone} label="Teléfono"><span className="num">{p.phone}</span></ContactPill>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4"><PersonCounts person={p} size="lg" /></div>
        </section>
      </div>

      <Section id="servicios-title" title="Servicios" icon={Layers} tone="violet" count={services.length}
        hint={services.length ? `${lead.length ? `Lidera ${lead.length}` : 'Sin liderazgos'} · en el equipo de ${member.length}` : 'Todavía sin servicios'}>
        {services.length === 0 ? (
          <Empty icon={Layers} tone="violet" title="Todavía no está en ningún servicio"
            action={<Link to="/servicios" className="btn btn-outline">Ver servicios</Link>}>
            {isAdmin ? `Asigná a ${first} como líder o parte del equipo desde cada servicio.` : 'El administrador asigna líderes y equipos desde Servicios.'}
          </Empty>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {lead.length > 0 && (
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Lidera</p>
                <div className="flex flex-wrap gap-1.5">{lead.map((s) => <ServiceChip key={s.key} serviceKey={s.key} name={s.name} lead />)}</div>
              </div>
            )}
            {member.length > 0 && (
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Es parte del equipo</p>
                <div className="flex flex-wrap gap-1.5">{member.map((s) => <ServiceChip key={s.key} serviceKey={s.key} name={s.name} />)}</div>
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section id="proyectos-title" title="Proyectos" icon={FolderKanban} tone="blue" count={projects.length} hint={projects.length ? 'En los que participa' : 'Sin proyectos activos'}>
            {projects.length === 0 ? (
              <Empty icon={FolderKanban} title="No está en proyectos" action={<Link to="/proyectos" className="btn btn-outline">Ir a proyectos</Link>}>
                Las personas se suman al equipo desde la ficha de cada proyecto.
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {projects.map((pr) => (
                  <li key={pr.id}>
                    <Link to={`/proyectos/${pr.id}`} className="group row min-h-14 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold group-hover:text-brand-ink">{pr.name}</p>
                        <p className="truncate text-xs text-muted">
                          {pr.client || PROJECT_KINDS[pr.kind]?.label || 'Sin cliente'}
                          {pr.role && <> · <span className="font-semibold text-ink-2">{PROJECT_ROLES[pr.role] ?? pr.role}</span></>}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <StatusBadge map={PROJECT_STATUS} value={pr.status} />
                          <SlaBadge state={pr.sla_state} hours={pr.hours_since_update} />
                        </div>
                      </div>
                      <RowArrow />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="tareas-title" title="Tareas abiertas" icon={ListChecks} tone={overdue ? 'red' : 'teal'} count={tasks.length}
            hint={overdue ? `${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}` : tasks.length ? 'Todo al día' : 'Nada pendiente'}
            link={tasks.length > 0 && <Link to="/tablero" className="link tap -my-2 flex items-center text-sm">Tablero</Link>}>
            {tasks.length === 0 ? (
              <Empty icon={ListChecks} tone="teal" title="Sin tareas abiertas" action={<Link to="/tablero" className="btn btn-outline">Ir al tablero</Link>}>
                {isMe ? 'No tenés nada pendiente.' : `${first} no tiene tareas pendientes.`}
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((t) => {
                  const due = dueLabel(t.due_date);
                  const prio = TASK_PRIORITY[t.priority];
                  return (
                    <li key={t.id}>
                      <Link to={`/tablero?tarea=${t.id}`} className="group row min-h-14 px-4 py-3 sm:px-5">
                        <span className={cx('h-8 w-1 shrink-0 rounded-full', `dot-${prio?.tone ?? 'slate'}`)} title={prio ? `Prioridad ${prio.label}` : undefined} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold group-hover:text-brand-ink">{t.title}</p>
                          <p className="truncate text-xs text-muted">{t.project_name ?? 'Sin proyecto'}</p>
                        </div>
                        {due && <Badge tone={due.tone}>{due.text}</Badge>}
                        <RowArrow className="hidden sm:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section id="citas-title" title="Próximas citas" icon={CalendarClock} tone="violet" count={appointments.length} hint="Los próximos 14 días"
            link={appointments.length > 0 && <Link to="/agenda" className="link tap -my-2 flex items-center text-sm">Agenda</Link>}>
            {appointments.length === 0 ? (
              <Empty icon={CalendarClock} tone="violet" title="Sin citas en los próximos 14 días" action={<Link to="/agenda?nueva=1" className="btn btn-outline">Agendar cita</Link>} />
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => {
                  const kind = APPOINTMENT_KINDS[a.kind];
                  return (
                    <li key={a.id}>
                      <Link to={`/agenda?cita=${a.id}`} className={cx('group row min-h-14 px-4 py-3 sm:px-5', a.status === 'cancelada' && 'opacity-60')}>
                        <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${kind?.tone ?? 'slate'}`)} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={cx('truncate text-sm font-semibold group-hover:text-brand-ink', a.status === 'cancelada' && 'line-through')}>{a.title}</p>
                          <p className="truncate text-xs text-muted first-letter:uppercase">
                            {formatDateTime(a.starts_at)}
                            {kind && ` · ${kind.label}`}{(a.client_name || a.project_name) && ` · ${a.client_name || a.project_name}`}
                          </p>
                        </div>
                        {a.status === 'cancelada' && <Badge tone="red">Cancelada</Badge>}
                        <RowArrow className="hidden sm:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="actividad-title" title="Actividad reciente" icon={History} tone="slate" hint={activity.length ? 'Sus últimas acciones en el portal' : undefined}>
            {activity.length === 0 ? (
              <Empty icon={History} tone="slate" title="Sin actividad reciente">Acá aparecen sus últimas acciones en el portal.</Empty>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {shownActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
                      <p className="min-w-0 flex-1 text-sm leading-snug">{a.summary}</p>
                      <time className="shrink-0 text-xs text-muted" dateTime={a.created_at}>{timeAgo(a.created_at)}</time>
                    </li>
                  ))}
                </ul>
                {activity.length > shownActivity.length && (
                  <button type="button" className="tap flex w-full items-center justify-center border-t border-line bg-surface-2/60 text-sm font-semibold text-brand-ink" onClick={() => setAllActivity(true)}>
                    Ver {activity.length - shownActivity.length} más
                  </button>
                )}
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
