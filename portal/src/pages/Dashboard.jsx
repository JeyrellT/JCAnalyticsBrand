// Centro de operaciones: lo que requiere acción hoy, la agenda, mis tareas y el pulso de las inversiones.
import {
  FolderKanban, AlarmClock, CalendarClock, ListChecks, TrendingUp, ArrowRight, BellRing, CircleAlert, Wallet,
  Video, MapPin, Activity as ActivityIcon, Sparkles,
} from 'lucide-react';
import { useSession, useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageLoader, Stat, Badge, AvatarStack, Avatar, EmptyState, cx } from '../components/ui.jsx';
import { formatMoney, formatTime, formatDayLong, dayKey, todayKey, dueLabel, timeAgo } from '../lib/format.js';
import { APPOINTMENT_KINDS, TASK_PRIORITY } from '../../shared/catalog.js';

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
};

const ALERT_STYLE = {
  red: 'border-coral/30 bg-coral-soft text-coral',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  blue: 'border-brand/20 bg-brand-soft text-brand',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export default function Dashboard() {
  const { user } = useSession();
  const { data, error, reload } = useResource('/api/dashboard');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { kpis, alerts, agenda, my_tasks: myTasks, investments, activity } = data;
  const today = todayKey();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{formatDayLong(today)}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{greeting()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted">Centro de operaciones del equipo JC Analytics.</p>
        </div>
        <div className="mt-3 flex gap-2 sm:mt-0">
          <Link to="/tablero?nueva=1" className="btn btn-outline"><ListChecks className="h-4 w-4" />Tarea</Link>
          <Link to="/agenda?nueva=1" className="btn btn-primary"><CalendarClock className="h-4 w-4" />Agendar cita</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
        <Stat label="Proyectos activos" value={kpis.active_projects} icon={FolderKanban} tone="blue" hint={kpis.sla_late ? `${kpis.sla_late} sin avance a tiempo` : 'Avances al día'} />
        <Stat label="Tareas vencidas" value={kpis.overdue_tasks} icon={AlarmClock} tone={kpis.overdue_tasks ? 'red' : 'teal'} hint={`${kpis.my_open_tasks} abiertas a tu nombre`} />
        <Stat label="Citas hoy" value={kpis.today_appointments} icon={CalendarClock} tone="violet" hint={`${kpis.week_appointments} en los próximos 7 días`} />
        {investments
          ? <Stat label="Neto socios" value={formatMoney(investments.net_crc, 'CRC', { compact: true })} icon={Wallet} tone={investments.net_crc >= 0 ? 'teal' : 'amber'} hint={`${formatMoney(investments.returned_crc, 'CRC', { compact: true })} retornado de ${formatMoney(investments.contributed_crc, 'CRC', { compact: true })}`} />
          : <Stat label="Mis tareas" value={kpis.my_open_tasks} icon={ListChecks} tone="blue" hint="Abiertas a tu nombre" />}
      </section>

      <section aria-labelledby="alerts-title">
        <div className="mb-3 flex items-center gap-2">
          <BellRing className="h-4 w-4 text-coral" />
          <h2 id="alerts-title" className="section-title">Requiere acción</h2>
          {alerts.length > 0 && <Badge tone="red">{alerts.length}</Badge>}
        </div>
        {alerts.length === 0 ? (
          <div className="card card-pad flex items-center gap-3 text-sm text-teal-dark"><Sparkles className="h-5 w-5" /> Todo en orden: sin avances vencidos, tareas atrasadas ni movimientos por confirmar.</div>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {alerts.map((a, i) => (
              <Link key={`${a.kind}-${i}`} to={a.link} className={cx('group flex items-start gap-3 rounded-2xl border p-3.5 transition hover:shadow-sm', ALERT_STYLE[a.tone])}>
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{a.title}</span>
                  <span className="block truncate text-xs text-ink/70">{a.detail}</span>
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="card" aria-labelledby="agenda-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="agenda-title" className="section-title">Próximas citas</h2>
            <Link to="/agenda" className="text-sm font-semibold text-brand hover:underline">Ver agenda</Link>
          </div>
          {agenda.length === 0 ? (
            <div className="p-5"><EmptyState icon={CalendarClock} title="Sin citas en los próximos 7 días" action={<Link to="/agenda?nueva=1" className="btn btn-primary">Agendar</Link>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {agenda.map((a) => {
                const key = dayKey(a.starts_at);
                const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
                return (
                  <li key={a.id}>
                    <Link to={`/agenda?cita=${a.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                      <div className="w-[84px] shrink-0 text-center">
                        <p className={cx('text-[11px] font-semibold uppercase', key === today ? 'text-coral' : 'text-muted')}>{key === today ? 'Hoy' : formatDayLong(key).split(',')[0]}</p>
                        <p className="font-display text-base font-bold tabular">{formatTime(a.starts_at)}</p>
                      </div>
                      <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${tone}`)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                          {a.meeting_url ? <Video className="h-3.5 w-3.5" /> : a.location ? <MapPin className="h-3.5 w-3.5" /> : null}
                          {APPOINTMENT_KINDS[a.kind]?.label}{a.project_name ? ` · ${a.project_name}` : ''}
                        </p>
                      </div>
                      <div className="hidden sm:block"><AvatarStack people={a.attendees} /></div>
                      {a.status === 'programada' && a.kind !== 'interna' && <Badge tone="amber">Sin confirmar</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="mytasks-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="mytasks-title" className="section-title">Mis tareas</h2>
            <Link to="/tablero?mias=1" className="text-sm font-semibold text-brand hover:underline">Ir al tablero</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="p-5"><EmptyState icon={ListChecks} title="Nada pendiente a tu nombre" /></div>
          ) : (
            <ul className="divide-y divide-line">
              {myTasks.map((t) => {
                const due = dueLabel(t.due_date);
                return (
                  <li key={t.id}>
                    <Link to={`/tablero?tarea=${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <span className={cx('h-2 w-2 shrink-0 rounded-full', `dot-${TASK_PRIORITY[t.priority].tone}`)} title={`Prioridad ${TASK_PRIORITY[t.priority].label}`} />
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
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        {investments && (
          <section className="card card-pad self-start" aria-labelledby="inv-title">
            <div className="flex items-center justify-between">
              <h2 id="inv-title" className="section-title">Pulso de inversiones</h2>
              <Link to="/inversiones" className="text-sm font-semibold text-brand hover:underline">Ver portafolio</Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-muted">Mi capital aportado</dt><dd className="font-display text-xl font-bold tabular">{formatMoney(investments.my_contributed_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Me ha retornado</dt><dd className="font-display text-xl font-bold tabular text-teal-dark">{formatMoney(investments.my_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Retornos este mes (equipo)</dt><dd className="font-display text-xl font-bold tabular">{formatMoney(investments.month_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Inversiones activas</dt><dd className="font-display text-xl font-bold tabular">{investments.active_count}</dd></div>
            </dl>
            {investments.my_pending_count > 0 ? (
              <Link to="/buzon" className="btn btn-primary mt-5 w-full"><TrendingUp className="h-4 w-4" />Confirmar {investments.my_pending_count} {investments.my_pending_count === 1 ? 'movimiento' : 'movimientos'}</Link>
            ) : (
              <p className="mt-5 rounded-xl bg-teal-soft px-3 py-2 text-sm text-teal-dark">No tenés movimientos por confirmar.</p>
            )}
          </section>
        )}

        <section className={cx('card', !investments && 'xl:col-span-2')} aria-labelledby="act-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="act-title" className="section-title">Actividad del equipo</h2>
            <Link to="/bitacora" className="text-sm font-semibold text-brand hover:underline">Bitácora</Link>
          </div>
          {activity.length === 0 ? <div className="p-5"><EmptyState icon={ActivityIcon} title="Todavía no hay actividad" /></div> : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={a.user_name ?? 'Sistema'} color={a.user_color ?? '#5b6b82'} size={26} />
                  <p className="min-w-0 flex-1 text-sm leading-snug">{a.summary}<span className="mt-0.5 block text-xs text-muted">{timeAgo(a.created_at)}</span></p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
