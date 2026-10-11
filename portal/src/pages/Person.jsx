// Ficha de una persona: contacto, carga de trabajo, servicios, proyectos, tareas, citas y actividad reciente.
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle, Pencil, FolderKanban, ListChecks, CalendarClock, History, Layers, ChevronRight } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageLoader, EmptyState, Badge, Avatar, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge } from '../components/common.jsx';
import { LoadBadge, RoleBadge, PersonCounts } from '../components/people.jsx';
import { ServiceChip } from '../components/services.jsx';
import { PROJECT_ROLES, PROJECT_STATUS, PROJECT_KINDS, TASK_PRIORITY, APPOINTMENT_KINDS } from '../../shared/catalog.js';
import { dueLabel, formatDateTime, timeAgo, whatsappLink } from '../lib/format.js';

function Section({ id, title, icon: Icon, count, link, children }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
        <h2 id={id} className="section-title flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-teal-dark" /><span className="truncate">{title}</span>
          {count != null && <span className="text-sm font-normal text-muted">{count}</span>}
        </h2>
        {link}
      </div>
      {children}
    </section>
  );
}

const Empty = (props) => <div className="p-4 sm:p-5"><EmptyState {...props} /></div>;

export default function Person({ params }) {
  const { user, isAdmin } = useSession();
  const { data, error, reload } = useResource(`/api/people/${encodeURIComponent(params.id)}`);
  const [allActivity, setAllActivity] = useState(false);

  if (!data) {
    return (
      <>
        <Link to="/equipo" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Equipo</Link>
        <PageLoader error={error} onRetry={reload} />
      </>
    );
  }

  const { person: p, services = [], projects = [], tasks = [], appointments = [], activity = [] } = data;
  const isMe = p.id === user.id;
  const first = p.name.split(' ')[0];
  const wa = whatsappLink(p.phone, `Hola ${first}`);
  const lead = services.filter((s) => s.role === 'lider');
  const member = services.filter((s) => s.role !== 'lider');
  const shownActivity = allActivity ? activity : activity.slice(0, 8);

  return (
    <div className="space-y-6">
      <Link to="/equipo" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Equipo</Link>

      <section className="card card-pad" aria-label="Datos de la persona">
        <div className="flex items-start gap-4">
          <Avatar name={p.name} color={p.color} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              {p.name}{isMe && <span className="ml-2 align-middle text-sm font-normal text-muted">(vos)</span>}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <RoleBadge role={p.role} />
              <LoadBadge load={p.load} />
              {p.active === false && <Badge tone="slate">Sin acceso</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {p.email && (
            <p className="flex min-w-0 items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted" /><span className="sr-only">Correo:</span>
              <span className="min-w-0 select-all break-all">{p.email}</span>
            </p>
          )}
          {p.phone && (
            <p className="flex min-w-0 items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted" /><span className="sr-only">Teléfono:</span>
              <span className="min-w-0 select-all tabular">{p.phone}</span>
            </p>
          )}
        </div>

        {(wa || isMe) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {wa && !isMe && <a className="btn btn-teal flex-1 sm:flex-none" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Escribir por WhatsApp</a>}
            {isMe && <Link to="/equipo?tab=perfil" className="btn btn-outline flex-1 sm:flex-none"><Pencil className="h-4 w-4" />Editar mi perfil</Link>}
          </div>
        )}

        <div className="mt-4"><PersonCounts person={p} size="lg" /></div>
      </section>

      <Section id="servicios-title" title="Servicios" icon={Layers} count={services.length}>
        {services.length === 0 ? (
          <Empty icon={Layers} title="Todavía no está en ningún servicio"
            action={<Link to="/servicios" className="btn btn-outline">Ver servicios</Link>}>
            {isAdmin ? `Asigná a ${first} como líder o parte del equipo desde cada servicio.` : 'El administrador asigna líderes y equipos desde Servicios.'}
          </Empty>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            {lead.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Lidera</p>
                <div className="flex flex-wrap gap-1.5">{lead.map((s) => <ServiceChip key={s.key} serviceKey={s.key} name={s.name} lead />)}</div>
              </div>
            )}
            {member.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Es parte del equipo</p>
                <div className="flex flex-wrap gap-1.5">{member.map((s) => <ServiceChip key={s.key} serviceKey={s.key} name={s.name} />)}</div>
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section id="proyectos-title" title="Proyectos" icon={FolderKanban} count={projects.length}>
            {projects.length === 0 ? (
              <Empty icon={FolderKanban} title="No está en proyectos" action={<Link to="/proyectos" className="btn btn-outline">Ir a proyectos</Link>}>
                Las personas se suman al equipo desde la ficha de cada proyecto.
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {projects.map((pr) => (
                  <li key={pr.id}>
                    <Link to={`/proyectos/${pr.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{pr.name}</p>
                        <p className="truncate text-xs text-muted">
                          {pr.client || PROJECT_KINDS[pr.kind]?.label || 'Sin cliente'}
                          {pr.role && <> · <span className="font-semibold text-ink/80">{PROJECT_ROLES[pr.role] ?? pr.role}</span></>}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <StatusBadge map={PROJECT_STATUS} value={pr.status} />
                          <SlaBadge state={pr.sla_state} hours={pr.hours_since_update} />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="tareas-title" title="Tareas abiertas" icon={ListChecks} count={tasks.length}
            link={tasks.length > 0 && <Link to="/tablero" className="text-sm font-semibold text-brand hover:underline">Tablero</Link>}>
            {tasks.length === 0 ? (
              <Empty icon={ListChecks} title="Sin tareas abiertas" action={<Link to="/tablero" className="btn btn-outline">Ir al tablero</Link>}>
                {isMe ? 'No tenés nada pendiente.' : `${first} no tiene tareas pendientes.`}
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((t) => {
                  const due = dueLabel(t.due_date);
                  const prio = TASK_PRIORITY[t.priority];
                  return (
                    <li key={t.id}>
                      <Link to={`/tablero?tarea=${t.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                        {prio && <span className={cx('h-2 w-2 shrink-0 rounded-full', `dot-${prio.tone}`)} title={`Prioridad ${prio.label}`} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{t.title}</p>
                          <p className="truncate text-xs text-muted">{t.project_name ?? 'Sin proyecto'}</p>
                        </div>
                        {due && <Badge tone={due.tone}>{due.text}</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section id="citas-title" title="Próximas citas" icon={CalendarClock} count={appointments.length}
            link={appointments.length > 0 && <Link to="/agenda" className="text-sm font-semibold text-brand hover:underline">Agenda</Link>}>
            {appointments.length === 0 ? (
              <Empty icon={CalendarClock} title="Sin citas en los próximos 14 días" action={<Link to="/agenda?nueva=1" className="btn btn-outline">Agendar cita</Link>} />
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => {
                  const kind = APPOINTMENT_KINDS[a.kind];
                  return (
                    <li key={a.id}>
                      <Link to={`/agenda?cita=${a.id}`} className={cx('flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5', a.status === 'cancelada' && 'opacity-50')}>
                        <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${kind?.tone ?? 'slate'}`)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{a.title}</p>
                          <p className="truncate text-xs text-muted">
                            {formatDateTime(a.starts_at)}
                            {kind && ` · ${kind.label}`}{(a.client_name || a.project_name) && ` · ${a.client_name || a.project_name}`}
                          </p>
                        </div>
                        {a.status === 'cancelada' && <Badge tone="red">Cancelada</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="actividad-title" title="Actividad reciente" icon={History}>
            {activity.length === 0 ? (
              <Empty icon={History} title="Sin actividad reciente">Acá aparecen sus últimas acciones en el portal.</Empty>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {shownActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <p className="min-w-0 flex-1 text-sm">{a.summary}</p>
                      <time className="shrink-0 text-xs text-muted" dateTime={a.created_at}>{timeAgo(a.created_at)}</time>
                    </li>
                  ))}
                </ul>
                {activity.length > shownActivity.length && (
                  <div className="border-t border-line p-2">
                    <button type="button" className="btn btn-ghost w-full" onClick={() => setAllActivity(true)}>Ver {activity.length - shownActivity.length} más</button>
                  </div>
                )}
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
