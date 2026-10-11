// Inicio. En el celular es "Mi día": un resumen de hoy en tres toques, lo que requiere acción, la agenda y mis tareas.
// En escritorio suma los indicadores del equipo, el pulso de inversiones y la actividad completa.
import { useState } from 'react';
import {
  FolderKanban, AlarmClock, CalendarClock, ListChecks, TrendingUp, ArrowRight, BellRing, CircleAlert, Wallet,
  Video, MapPin, Activity as ActivityIcon, Sparkles, ChevronDown,
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

// Alertas visibles en el celular antes de "Ver todas".
const MOBILE_ALERTS = 3;

const TILE_TONE = {
  blue: 'text-brand',
  violet: 'text-violet-700',
  red: 'text-coral',
  teal: 'text-teal-dark',
};

/** Mosaico grande y tocable del resumen "Hoy". */
function TodayTile({ to, icon: Icon, label, value, hint, tone = 'blue', alert = false }) {
  return (
    <Link to={to} className={cx('card flex min-h-[112px] flex-col justify-between gap-2 p-3 transition active:scale-[0.98] sm:p-4',
      alert && 'border-coral/40 bg-coral-soft/50')}>
      <span className="flex items-center justify-between gap-1">
        <span className="text-[12px] font-semibold leading-tight text-muted">{label}</span>
        <Icon className={cx('h-4 w-4 shrink-0', TILE_TONE[tone])} />
      </span>
      <span className={cx('font-display text-[28px] font-bold leading-none tabular', TILE_TONE[tone])}>{value}</span>
      <span className={cx('truncate text-[11px] font-medium leading-tight', alert ? 'text-coral' : 'text-muted')}>{hint}</span>
    </Link>
  );
}

export default function Dashboard() {
  const { user, canInvest } = useSession();
  const { data, error, reload } = useResource('/api/dashboard');
  const [allAlerts, setAllAlerts] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { kpis, alerts, agenda, my_tasks: myTasks, investments, activity } = data;
  const today = todayKey();
  const firstName = user.name.split(' ')[0];

  // "Hoy" en tres números: mis citas de hoy, mis tareas (y cuántas vencidas) y lo que espera mi confirmación.
  const myToday = agenda.filter((a) => dayKey(a.starts_at) === today && a.attendees?.some((p) => p.id === user.id));
  const myOverdue = myTasks.filter((t) => t.due_date && t.due_date < today).length;
  const overdueText = myOverdue >= myTasks.length && kpis.my_open_tasks > myTasks.length ? `${myOverdue}+` : String(myOverdue);
  const toConfirm = investments?.my_pending_count ?? 0;
  const showConfirm = canInvest && investments;
  const hiddenAlerts = Math.max(0, alerts.length - MOBILE_ALERTS);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{formatDayLong(today)}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{greeting()}, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="lg:hidden">{alerts.length ? `Tenés ${alerts.length} ${alerts.length === 1 ? 'pendiente que atender' : 'pendientes que atender'}. Empecemos por ahí.` : 'Todo en orden. Este es tu día.'}</span>
            <span className="hidden lg:inline">Centro de operaciones del equipo JC Analytics.</span>
          </p>
        </div>
        <div className="mt-3 hidden gap-2 sm:mt-0 lg:flex">
          <Link to="/tablero?nueva=1" className="btn btn-outline"><ListChecks className="h-4 w-4" />Tarea</Link>
          <Link to="/agenda?nueva=1" className="btn btn-primary"><CalendarClock className="h-4 w-4" />Agendar cita</Link>
        </div>
      </header>

      {/* Celular y tableta: "Hoy" en mosaicos grandes. */}
      <section aria-labelledby="today-title" className="lg:hidden">
        <h2 id="today-title" className="sr-only">Hoy</h2>
        <div className={cx('grid gap-2.5', showConfirm ? 'grid-cols-3' : 'grid-cols-2')}>
          <TodayTile to="/agenda" icon={CalendarClock} tone="violet" label="Mis citas hoy" value={myToday.length}
            hint={myToday.length ? `Próxima ${formatTime(myToday[0].starts_at)}` : 'Nada más hoy'} />
          <TodayTile to="/tablero?mias=1" icon={ListChecks} tone={myOverdue ? 'red' : 'blue'} label="Mis tareas" value={kpis.my_open_tasks}
            hint={myOverdue ? `${overdueText} ${myOverdue === 1 ? 'vencida' : 'vencidas'}` : 'Al día'} alert={myOverdue > 0} />
          {showConfirm && (
            <TodayTile to="/buzon" icon={Wallet} tone={toConfirm ? 'violet' : 'teal'} label="Por confirmar" value={toConfirm}
              hint={toConfirm ? 'En tu buzón' : 'Nada pendiente'} />
          )}
        </div>
      </section>

      {/* Escritorio: indicadores del equipo. */}
      <section className="hidden grid-cols-4 gap-3 lg:grid" aria-label="Indicadores">
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
          <div className="card card-pad flex items-center gap-3 text-sm text-teal-dark"><Sparkles className="h-5 w-5 shrink-0" /> Todo en orden: sin avances vencidos, tareas atrasadas ni movimientos por confirmar.</div>
        ) : (
          <>
            <div id="alert-list" className="grid gap-2.5 md:grid-cols-2">
              {alerts.map((a, i) => (
                <Link key={`${a.kind}-${i}`} to={a.link}
                  className={cx('group min-h-14 items-start gap-3 rounded-2xl border p-3.5 transition hover:shadow-sm', ALERT_STYLE[a.tone],
                    i >= MOBILE_ALERTS && !allAlerts ? 'hidden lg:flex' : 'flex')}>
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{a.title}</span>
                    <span className="block truncate text-xs text-ink/70">{a.detail}</span>
                  </span>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
            {hiddenAlerts > 0 && (
              <button type="button" className="btn btn-outline tap mt-2.5 w-full lg:hidden" aria-expanded={allAlerts} aria-controls="alert-list" onClick={() => setAllAlerts((v) => !v)}>
                {allAlerts ? 'Ver menos' : `Ver todas (${alerts.length})`}
                <ChevronDown className={cx('h-4 w-4 transition', allAlerts && 'rotate-180')} />
              </button>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="card" aria-labelledby="agenda-title">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
            <h2 id="agenda-title" className="section-title">Próximas citas</h2>
            <Link to="/agenda" className="tap -my-2 flex items-center text-sm font-semibold text-brand hover:underline">Ver agenda</Link>
          </div>
          {agenda.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState icon={CalendarClock} title="Sin citas en los próximos 7 días" action={<Link to="/agenda?nueva=1" className="btn btn-primary">Agendar</Link>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {agenda.map((a) => {
                const key = dayKey(a.starts_at);
                const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
                return (
                  <li key={a.id}>
                    <Link to={`/agenda?cita=${a.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:gap-4 sm:px-5">
                      <div className="w-[68px] shrink-0 text-center sm:w-[84px]">
                        <p className={cx('text-[11px] font-semibold uppercase', key === today ? 'text-coral' : 'text-muted')}>{key === today ? 'Hoy' : formatDayLong(key).split(',')[0]}</p>
                        <p className="font-display text-base font-bold tabular">{formatTime(a.starts_at)}</p>
                      </div>
                      <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${tone}`)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                          {a.meeting_url ? <Video className="h-3.5 w-3.5 shrink-0" /> : a.location ? <MapPin className="h-3.5 w-3.5 shrink-0" /> : null}
                          <span className="truncate">{APPOINTMENT_KINDS[a.kind]?.label}{a.client_name || a.project_name ? ` · ${a.client_name || a.project_name}` : ''}</span>
                        </p>
                        {a.status === 'programada' && a.kind !== 'interna' && <Badge tone="amber" className="mt-1 sm:hidden">Sin confirmar</Badge>}
                      </div>
                      <div className="hidden sm:block"><AvatarStack people={a.attendees} /></div>
                      {a.status === 'programada' && a.kind !== 'interna' && <Badge tone="amber" className="hidden sm:inline-flex">Sin confirmar</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="mytasks-title">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
            <h2 id="mytasks-title" className="section-title">Mis tareas</h2>
            <Link to="/tablero?mias=1" className="tap -my-2 flex items-center text-sm font-semibold text-brand hover:underline">Ir al tablero</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState icon={ListChecks} title="Nada pendiente a tu nombre" /></div>
          ) : (
            <ul className="divide-y divide-line">
              {myTasks.map((t) => {
                const due = dueLabel(t.due_date);
                return (
                  <li key={t.id}>
                    <Link to={`/tablero?tarea=${t.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
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
            <div className="flex items-center justify-between gap-3">
              <h2 id="inv-title" className="section-title">Pulso de inversiones</h2>
              <Link to="/inversiones" className="tap -my-2 flex items-center text-sm font-semibold text-brand hover:underline">Ver portafolio</Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-muted">Mi capital aportado</dt><dd className="font-display text-lg font-bold tabular sm:text-xl">{formatMoney(investments.my_contributed_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Me ha retornado</dt><dd className="font-display text-lg font-bold tabular text-teal-dark sm:text-xl">{formatMoney(investments.my_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Retornos este mes (equipo)</dt><dd className="font-display text-lg font-bold tabular sm:text-xl">{formatMoney(investments.month_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-muted">Inversiones activas</dt><dd className="font-display text-lg font-bold tabular sm:text-xl">{investments.active_count}</dd></div>
            </dl>
            {investments.my_pending_count > 0 ? (
              <Link to="/buzon" className="btn btn-primary tap mt-5 w-full"><TrendingUp className="h-4 w-4" />Confirmar {investments.my_pending_count} {investments.my_pending_count === 1 ? 'movimiento' : 'movimientos'}</Link>
            ) : (
              <p className="mt-5 rounded-xl bg-teal-soft px-3 py-2 text-sm text-teal-dark">No tenés movimientos por confirmar.</p>
            )}
          </section>
        )}

        <section className={cx('card', !investments && 'xl:col-span-2')} aria-labelledby="act-title">
          <div className={cx('flex items-center justify-between gap-3 border-line px-4 py-3.5 sm:px-5 sm:py-4', showActivity ? 'border-b' : 'lg:border-b')}>
            <h2 id="act-title" className="section-title">Actividad del equipo</h2>
            <Link to="/bitacora" className="tap -my-2 hidden items-center text-sm font-semibold text-brand hover:underline lg:flex">Bitácora</Link>
            <button type="button" className="btn btn-ghost tap -my-2 -mr-2 text-brand lg:hidden" aria-expanded={showActivity} aria-controls="activity-list" onClick={() => setShowActivity((v) => !v)}>
              {showActivity ? 'Ocultar' : 'Ver actividad'}
              <ChevronDown className={cx('h-4 w-4 transition', showActivity && 'rotate-180')} />
            </button>
          </div>
          <div id="activity-list" className={cx(!showActivity && 'hidden lg:block')}>
            {activity.length === 0 ? <div className="p-4 sm:p-5"><EmptyState icon={ActivityIcon} title="Todavía no hay actividad" /></div> : (
              <ul className="divide-y divide-line">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <Avatar name={a.user_name ?? 'Sistema'} color={a.user_color ?? '#5b6b82'} size={26} />
                    <p className="min-w-0 flex-1 text-sm leading-snug">{a.summary}<span className="mt-0.5 block text-xs text-muted">{timeAgo(a.created_at)}</span></p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/bitacora" className="tap flex items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-sm font-semibold text-brand lg:hidden">Ver bitácora completa<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
