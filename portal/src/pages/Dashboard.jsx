// Inicio. En el celular es "Mi día": un resumen de hoy en tres toques, lo que requiere acción, la agenda y mis tareas.
// En escritorio suma los indicadores del equipo, el pulso de inversiones y la actividad reciente.
import { useState } from 'react';
import {
  FolderKanban, AlarmClock, CalendarClock, ListChecks, TrendingUp, ArrowRight, BellRing, Wallet,
  Video, MapPin, Activity as ActivityIcon, Sparkles, ChevronDown, CircleAlert, Clock3, Info, HandCoins, LifeBuoy, PhoneCall,
  ClipboardList, PackageCheck, MessageSquareWarning, Hourglass, Globe,
} from 'lucide-react';
import { useSession, useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageLoader, Stat, Badge, AvatarStack, Avatar, EmptyState, IconTile, SectionHead, RowArrow, cx } from '../components/ui.jsx';
import { formatMoney, formatTime, formatDayLong, dayKey, todayKey, dueLabel, timeAgo } from '../lib/format.js';
import { APPOINTMENT_KINDS, TASK_PRIORITY } from '../../shared/catalog.js';
import { InstallBanner } from '../components/InstallPrompt.jsx';
import { PortalTodayCard } from '../components/automations.jsx';

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
};

// Ícono por tipo de alerta; el tono lo decide el servidor (urgencia).
const ALERT_ICON = { sla: Clock3, tasks: AlarmClock, appointment: PhoneCall, support: LifeBuoy, movement: HandCoins, brief: ClipboardList, deliverable: PackageCheck };
const ALERT_STRIPE = { red: 'bg-coral', amber: 'bg-amber', blue: 'bg-brand', violet: 'bg-violet' };

// Alertas visibles en el celular antes de "Ver todas".
const MOBILE_ALERTS = 3;
// Actividad visible en escritorio antes de "Ver bitácora".
const DESKTOP_ACTIVITY = 8;

const TILE_TONE = {
  blue: 'text-brand-ink',
  violet: 'text-violet-ink',
  red: 'text-coral-ink',
  teal: 'text-teal-ink',
};

/** Fila del pulso del portal de clientes: ícono, qué es y el número a la derecha. */
function PortalRow({ to, icon, tone, label, hint, value }) {
  const on = value > 0;
  return (
    <li>
      <Link to={to} className="group row min-h-16 px-4 py-3 sm:px-5">
        <IconTile icon={icon} tone={on ? tone : 'slate'} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{label}</span>
          <span className="block truncate text-xs text-muted">{hint}</span>
        </span>
        <span className={cx('num shrink-0 text-2xl font-bold leading-none', on ? TILE_TONE[tone] ?? 'text-ink' : 'text-muted-2')}>{value}</span>
        <RowArrow />
      </Link>
    </li>
  );
}

/** v5: lo que mueven los clientes desde su portal (briefs y aprobaciones de entregables). */
function ClientPortalCard({ counts }) {
  const { briefs_to_review: toReview = 0, changes_requested: changes = 0, waiting_client: waiting = 0 } = counts ?? {};
  const pending = toReview + changes;
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="client-portal-title">
      <SectionHead flush id="client-portal-title" icon={Globe} tone="teal" title="Portal de clientes"
        hint={pending ? `${pending} ${pending === 1 ? 'pendiente del equipo' : 'pendientes del equipo'}` : 'Briefs y aprobaciones de entregables'}
        action={<Link to="/briefs" className="link tap -my-2 hidden items-center text-sm sm:flex">Ver briefs</Link>} />
      <ul className="divide-y divide-line">
        <PortalRow to="/briefs?estado=enviado" icon={ClipboardList} tone="blue" label="Briefs por revisar" value={toReview}
          hint={toReview ? 'Enviados por clientes: aprobalos o pedí ajustes' : 'Nada esperando revisión'} />
        <PortalRow to="/briefs?tab=entregables" icon={MessageSquareWarning} tone="red" label="Cambios pedidos" value={changes}
          hint={changes ? 'Subí una versión nueva del entregable' : 'Ningún entregable con ajustes'} />
        <PortalRow to="/briefs?tab=entregables" icon={Hourglass} tone="violet" label="Esperando al cliente" value={waiting}
          hint={waiting ? 'Entregables compartidos, sin decisión aún' : 'Nada pendiente de aprobación'} />
      </ul>
    </section>
  );
}

/** Mosaico grande y tocable del resumen "Hoy" (celular). */
function TodayTile({ to, icon: Icon, label, value, hint, tone = 'blue', alert = false }) {
  return (
    <Link to={to} className={cx('card relative flex min-h-[116px] flex-col justify-between gap-2 overflow-hidden p-3 transition active:scale-[0.98] sm:p-4',
      alert && 'border-coral/40')}>
      <span className="flex items-center justify-between gap-1">
        <span className="text-[12px] font-semibold leading-tight text-muted">{label}</span>
        <IconTile icon={Icon} tone={tone} size="sm" />
      </span>
      <span className={cx('font-display text-[30px] font-bold leading-none tabular', TILE_TONE[tone])}>{value}</span>
      <span className={cx('truncate text-[11px] font-medium leading-tight', alert ? 'text-coral-ink' : 'text-muted')}>{hint}</span>
      {alert && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-coral" aria-hidden="true" />}
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
  const urgent = alerts.filter((a) => a.tone === 'red').length;

  return (
    <div className="space-y-6">
      <header className="animate-rise flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{formatDayLong(today)}</p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight sm:text-[34px]">{greeting()}, {firstName}</h1>
          <p className="mt-1.5 text-sm text-muted">
            <span className="lg:hidden">{alerts.length ? `Tenés ${alerts.length} ${alerts.length === 1 ? 'pendiente que atender' : 'pendientes que atender'}. Empecemos por ahí.` : 'Todo en orden. Este es tu día.'}</span>
            <span className="hidden lg:inline">{alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'asunto requiere' : 'asuntos requieren'} tu atención${urgent ? `, ${urgent} ${urgent === 1 ? 'urgente' : 'urgentes'}` : ''}.` : 'Nada urgente por ahora.'} Centro de operaciones del equipo JC Analytics.</span>
          </p>
        </div>
        <div className="mt-3 hidden gap-2 sm:mt-0 lg:flex">
          <Link to="/tablero?nueva=1" className="btn btn-outline"><ListChecks className="h-4 w-4" />Tarea</Link>
          <Link to="/agenda?nueva=1" className="btn btn-primary"><CalendarClock className="h-4 w-4" />Agendar cita</Link>
        </div>
      </header>

      <InstallBanner />

      {/* Celular y tableta: "Hoy" en mosaicos grandes. */}
      <section aria-labelledby="today-title" className="lg:hidden">
        <h2 id="today-title" className="sr-only">Hoy</h2>
        <div className={cx('stagger grid gap-2.5', showConfirm ? 'grid-cols-3' : 'grid-cols-2')}>
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

      {/* Requiere acción: una sola tarjeta, filas ordenadas por urgencia (el servidor ya las ordena). */}
      <section aria-labelledby="alerts-title" className="card animate-rise overflow-hidden">
        <SectionHead flush id="alerts-title" icon={BellRing} tone={alerts.length ? 'red' : 'teal'} title="Requiere acción"
          hint={alerts.length ? 'Ordenado por urgencia. Tocá para resolver.' : 'Sin avances vencidos, tareas atrasadas ni movimientos por confirmar.'}
          action={alerts.length > 0 && <Badge tone={urgent ? 'red' : 'amber'}>{alerts.length}</Badge>} />
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 text-sm text-teal-ink sm:px-5"><Sparkles className="h-5 w-5 shrink-0" /> Todo en orden. Buen momento para adelantar algo del tablero.</div>
        ) : (
          <>
            <ul id="alert-list" className="divide-y divide-line">
              {alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.kind] ?? CircleAlert;
                return (
                  <li key={`${a.kind}-${i}`} className={cx(i >= MOBILE_ALERTS && !allAlerts && 'hidden lg:block')}>
                    <Link to={a.link} className="group row relative min-h-[60px] px-4 py-3 pl-5 sm:px-5 sm:pl-6">
                      <span className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full', ALERT_STRIPE[a.tone] ?? 'bg-slate')} aria-hidden="true" />
                      <IconTile icon={Icon} tone={a.tone === 'red' ? 'red' : a.tone === 'amber' ? 'amber' : a.tone === 'violet' ? 'violet' : 'blue'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                        <span className="block truncate text-xs text-muted">{a.detail}</span>
                      </span>
                      <RowArrow />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hiddenAlerts > 0 && (
              <button type="button" className="tap flex w-full items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 text-sm font-semibold text-brand-ink lg:hidden" aria-expanded={allAlerts} aria-controls="alert-list" onClick={() => setAllAlerts((v) => !v)}>
                {allAlerts ? 'Ver menos' : `Ver todas (${alerts.length})`}
                <ChevronDown className={cx('h-4 w-4 transition', allAlerts && 'rotate-180')} />
              </button>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="card animate-rise overflow-hidden" aria-labelledby="agenda-title">
          <SectionHead flush id="agenda-title" icon={CalendarClock} tone="violet" title="Próximas citas" hint="Los próximos 7 días"
            action={<Link to="/agenda" className="link tap -my-2 flex items-center text-sm">Ver agenda</Link>} />
          {agenda.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState icon={CalendarClock} tone="violet" title="Sin citas en los próximos 7 días" action={<Link to="/agenda?nueva=1" className="btn btn-primary">Agendar</Link>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {agenda.map((a) => {
                const key = dayKey(a.starts_at);
                const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
                const isToday = key === today;
                return (
                  <li key={a.id}>
                    <Link to={`/agenda?cita=${a.id}`} className="group row min-h-16 px-4 py-2.5 sm:gap-4 sm:px-5">
                      <span className={cx('flex h-12 w-[68px] shrink-0 flex-col items-center justify-center rounded-xl sm:w-[76px]', isToday ? 'bg-coral-soft text-coral-ink' : 'bg-surface-2 text-ink')}>
                        <span className={cx('text-[10px] font-bold uppercase tracking-wide', isToday ? 'text-coral-ink' : 'text-muted')}>{isToday ? 'Hoy' : formatDayLong(key).split(',')[0].slice(0, 3)}</span>
                        <span className="font-display text-[15px] font-bold leading-none tabular">{formatTime(a.starts_at)}</span>
                      </span>
                      <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
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
                      <RowArrow className="hidden sm:block" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="mytasks-title">
          <SectionHead flush id="mytasks-title" icon={ListChecks} tone={myOverdue ? 'red' : 'blue'} title="Mis tareas" hint={myOverdue ? `${myOverdue} ${myOverdue === 1 ? 'vencida' : 'vencidas'}` : 'Abiertas a tu nombre'}
            action={<Link to="/tablero?mias=1" className="link tap -my-2 flex items-center text-sm">Ir al tablero</Link>} />
          {myTasks.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState icon={ListChecks} title="Nada pendiente a tu nombre" /></div>
          ) : (
            <ul className="divide-y divide-line">
              {myTasks.map((t) => {
                const due = dueLabel(t.due_date);
                const pr = TASK_PRIORITY[t.priority];
                return (
                  <li key={t.id}>
                    <Link to={`/tablero?tarea=${t.id}`} className="group row min-h-14 px-4 py-3 sm:px-5">
                      <span className={cx('h-8 w-1 shrink-0 rounded-full', `dot-${pr.tone}`)} title={`Prioridad ${pr.label}`} />
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

      <div className="grid gap-6 xl:grid-cols-2">
        <ClientPortalCard counts={data.client_portal} />
        <PortalTodayCard />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        {investments && (
          <section className="card-panel animate-rise self-start p-5 sm:p-6" aria-labelledby="inv-title">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-teal"><TrendingUp className="h-[18px] w-[18px]" /></span>
                <h2 id="inv-title" className="font-display text-lg font-bold">Pulso de inversiones</h2>
              </div>
              <Link to="/inversiones" className="tap -my-2 flex items-center text-sm font-semibold text-teal hover:underline">Ver portafolio</Link>
            </div>
            <dl className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
              <div><dt className="text-xs text-panel-muted">Mi capital aportado</dt><dd className="num mt-1 text-[22px] font-bold sm:text-2xl">{formatMoney(investments.my_contributed_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-panel-muted">Me ha retornado</dt><dd className="num mt-1 text-[22px] font-bold text-teal sm:text-2xl">{formatMoney(investments.my_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-panel-muted">Retornos este mes (equipo)</dt><dd className="num mt-1 text-lg font-bold">{formatMoney(investments.month_returned_crc, 'CRC', { decimals: 0 })}</dd></div>
              <div><dt className="text-xs text-panel-muted">Inversiones activas</dt><dd className="num mt-1 text-lg font-bold">{investments.active_count}</dd></div>
            </dl>
            {investments.my_pending_count > 0 ? (
              <Link to="/buzon" className="btn btn-lg relative mt-6 w-full bg-white text-panel shadow-raised hover:bg-white/90"><HandCoins className="h-5 w-5 text-brand" />Confirmar {investments.my_pending_count} {investments.my_pending_count === 1 ? 'movimiento' : 'movimientos'}</Link>
            ) : (
              <p className="relative mt-6 flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2.5 text-sm text-white/85"><Sparkles className="h-4 w-4 text-teal" />No tenés movimientos por confirmar.</p>
            )}
          </section>
        )}

        <section className={cx('card animate-rise overflow-hidden', !investments && 'xl:col-span-2')} aria-labelledby="act-title">
          <div className={cx('flex items-center justify-between gap-3 border-line px-4 py-3.5 sm:px-5 sm:py-4', showActivity ? 'border-b' : 'lg:border-b')}>
            <div className="flex items-center gap-3">
              <IconTile icon={ActivityIcon} tone="slate" size="sm" />
              <h2 id="act-title" className="section-title">Actividad del equipo</h2>
            </div>
            <Link to="/bitacora" className="link tap -my-2 hidden items-center text-sm lg:flex">Bitácora</Link>
            <button type="button" className="btn btn-ghost tap -my-2 -mr-2 text-brand-ink lg:hidden" aria-expanded={showActivity} aria-controls="activity-list" onClick={() => setShowActivity((v) => !v)}>
              {showActivity ? 'Ocultar' : 'Ver actividad'}
              <ChevronDown className={cx('h-4 w-4 transition', showActivity && 'rotate-180')} />
            </button>
          </div>
          <div id="activity-list" className={cx(!showActivity && 'hidden lg:block')}>
            {activity.length === 0 ? <div className="p-4 sm:p-5"><EmptyState icon={ActivityIcon} tone="slate" title="Todavía no hay actividad" /></div> : (
              <ul className="divide-y divide-line">
                {activity.slice(0, DESKTOP_ACTIVITY).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <Avatar name={a.user_name ?? 'Sistema'} color={a.user_color ?? '#5b6b82'} size={28} />
                    <p className="min-w-0 flex-1 text-sm leading-snug">{a.summary}<span className="mt-0.5 block text-xs text-muted">{timeAgo(a.created_at)}</span></p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/bitacora" className="tap flex items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 px-4 py-3 text-sm font-semibold text-brand-ink">Ver bitácora completa<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>

      <p className="text-xs leading-relaxed text-muted"><Info className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Los avisos y recordatorios automáticos se configuran en <Link to="/automatizaciones" className="link">Automatizaciones</Link>; lo que te llega al celular, en <Link to="/notificaciones" className="link">Avisos y app</Link>.</p>
    </div>
  );
}
