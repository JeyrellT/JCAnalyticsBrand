import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDownLeft, Plus, Sparkles, Target, Check, Play, Pause, FolderKanban, CalendarDays, Clock3, BellRing, Bot, Zap, Activity, Wallet, RefreshCw, ChevronRight, CircleCheck, ListChecks, ShieldCheck, Loader2, Users, Pin } from 'lucide-react';
import { useSession, useResource } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { Avatar, AvatarStack, Badge, PageLoader, EmptyState, useAction, cx } from '../components/ui.jsx';
import { formatMoney, formatTime, formatDayLong, dayKey, todayKey, dueLabel, timeAgo, addDays, startOfDayIso } from '../lib/format.js';
import { PROJECT_STATUS, TASK_STATUS } from '../../shared/catalog.js';
import { InstallBanner } from '../components/InstallPrompt.jsx';
import { PortalTodayCard } from '../components/automations.jsx';
import '../styles/dashboard.css';
const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    hour: 'numeric',
    hourCycle: 'h23'
  }).format(new Date()));
  return hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
};
const money = amount => formatMoney(amount, 'CRC', {
  decimals: 0
});
const urgency = {
  red: 0,
  amber: 1,
  violet: 2,
  blue: 3
};
function SectionTitle({
  number,
  title,
  to,
  label = 'Ver todo'
}) {
  return <div className="pulse-section-head">
    <div>
      <span className="pulse-index">
        {number}
      </span>
      <h2 className="section-title">
        {title}
      </h2>
    </div>
    {to && <Link to={to}>
      {label}
      <ArrowUpRight size={15} />
    </Link>}
  </div>;
}
function Orbit({
  projectCount,
  teamCount,
  paused
}) {
  return <div className={cx('pulse-orbit', paused && 'is-still')} aria-hidden="true">
    <div className="orbit-axis orbit-axis-x" />
    <div className="orbit-axis orbit-axis-y" />
    <svg className="orbit-sculpture" viewBox="0 0 420 340" fill="none">
      <defs>
        <linearGradient id="orbit-stroke" x1="70" y1="0" x2="340" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dbf5a2" />
          <stop offset=".48" stopColor="#91b968" />
          <stop offset="1" stopColor="#426d5b" />
        </linearGradient>
      </defs>
      <g transform="translate(210 170) rotate(-28)">
        {Array.from({
          length: 23
        }, (_, index) => <ellipse key={index} rx={60 + index * 4.5} ry={140 - index * 3.8} transform={`rotate(${index * 4.3})`} stroke="url(#orbit-stroke)" strokeWidth=".85" opacity={.3 + index * .025} />)}
      </g>
      <circle cx="210" cy="170" r="164" stroke="#b7d2a4" strokeOpacity=".17" strokeDasharray="2 7" />
      <circle className="orbit-traveler" cx="210" cy="6" r="4" fill="#d4ef9b" />
    </svg>
    <div className="orbit-core">
      <Sparkles size={29} strokeWidth={1.2} />
      <span>JC</span>
    </div>
    <div className="orbit-node orbit-node-project">
      <FolderKanban size={15} />
      <span><strong>
          {projectCount}
        </strong> proyectos activos</span>
    </div>
    <div className="orbit-node orbit-node-team">
      <Users size={15} />
      <span><strong>
          {teamCount}
        </strong> personas · un equipo</span>
    </div>
    <span className="orbit-coordinate">10° N — 84° W</span>
    <span className="orbit-caption">EL SIGUIENTE PASO ES NUESTRO.</span>
  </div>;
}
function ProjectCard({
  project,
  index
}) {
  const total = project.tasks_total ?? 0;
  const completed = project.tasks_done ?? 0;
  const progress = total ? Math.round(completed / total * 100) : 0;
  const people = project.members?.length ? project.members : project.owner_name ? [{
    id: project.owner_id,
    name: project.owner_name,
    color: project.owner_color
  }] : [];
  return <Link to={`/proyectos/${project.id}`} className={`pulse-project project-tone-${index % 3}`}>
    <div className="project-art" aria-hidden="true">
      <span className="project-monogram">
        {project.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="project-art-shape">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <ArrowUpRight size={20} />
    </div>
    <div className="project-content">
      <div className="project-meta">
        <span>
          {project.kind === 'producto' ? 'Producto propio' : project.kind === 'interno' ? 'Equipo JC' : project.client || 'Proyecto de cliente'}
        </span>
        <span className={cx('project-status-dot', project.sla_state === 'late' && 'is-late')} title={PROJECT_STATUS[project.status]?.label} />
      </div>
      <h3>
        {project.name}
      </h3>
      <p className="project-stage">
        {PROJECT_STATUS[project.status]?.label ?? project.status}
      </p>
      <div className="project-progress-label">
        <span>
          {total ? `${completed} de ${total} tareas` : 'Sin tareas registradas'}
        </span>
        <strong>
          {total ? `${progress}%` : '—'}
        </strong>
      </div>
      <div className="project-progress" role="progressbar" aria-label={`Tareas completadas de ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{
          width: `${progress}%`
        }} />
      </div>
      <div className="project-footer">
        <AvatarStack people={people} />
        <span>
          {project.sla_state === 'late' ? 'Avance pendiente' : project.due_date ? dueLabel(project.due_date)?.text : 'Ver proyecto'}
          <ChevronRight size={13} />
        </span>
      </div>
    </div>
  </Link>;
}
function FocusCard({
  tasks,
  total,
  userId,
  onChanged
}) {
  const [pinned, setPinned] = useState(() => {
    try {
      return Number(localStorage.getItem(`jcp:focus:${userId}`)) || null;
    } catch {
      return null;
    }
  });
  const [run, busy] = useAction();
  const task = tasks.find(item => item.id === pinned) ?? tasks[0];
  const select = id => {
    setPinned(id);
    try {
      localStorage.setItem(`jcp:focus:${userId}`, String(id));
    } catch {/* Focus works without storage. */}
  };
  async function move(status) {
    const result = await run(() => api(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: {
        status
      }
    }), {
      success: status === 'hecho' ? 'Un paso más. Tarea completada.' : 'Tu tarea ya está en progreso.'
    });
    if (result) onChanged();
  }
  return <section className="pulse-focus" aria-labelledby="focus-title">
    <div className="focus-top">
      <span><Target size={17} />UN PASO A LA VEZ</span>
      <span>{total} abiertas</span>
    </div>
    <h2 id="focus-title" className="section-title">Tu siguiente avance.</h2>
    {task ? <>
      <div className="focus-task">
        <span className="focus-project">
          {task.project_name || 'Tu espacio de trabajo'}
        </span>
        <Link to={`/tablero?tarea=${task.id}`}>
          <h3>
            {task.title}
          </h3>
          <ArrowUpRight size={19} />
        </Link>
        <div className="focus-badges">
          <span>
            {TASK_STATUS[task.status]?.label ?? task.status}
          </span>
          {task.due_date && <Badge tone={dueLabel(task.due_date)?.tone}>
            {dueLabel(task.due_date)?.text}
          </Badge>}
        </div>
      </div>
      <div className="focus-actions">
        {['backlog', 'por_hacer'].includes(task.status) && <button className="pulse-button pulse-button-light" type="button" disabled={busy} onClick={() => move('en_progreso')}><Play size={14} />Empezar</button>}
        <button className="pulse-button pulse-button-dark" type="button" disabled={busy} onClick={() => move('hecho')}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}Completar tarea</button>
      </div>
      {tasks.length > 1 && <label className="focus-select-label"><Pin size={13} />Elegí tu foco<select aria-label="Elegir tarea de foco" value={task.id} onChange={event => select(Number(event.target.value))}>
          {tasks.map(item => <option key={item.id} value={item.id}>
            {item.title}
          </option>)}
        </select></label>}
      <Link className="focus-all" to="/tablero?mias=1">Ver mis tareas<ArrowRight size={14} /></Link>
    </> : <div className="focus-clear">
      <CircleCheck size={36} strokeWidth={1.4} />
      <h3>Espacio para lo que sigue.</h3>
      <p>No tenés tareas pendientes a tu nombre.</p>
      <Link className="pulse-button pulse-button-dark" to="/tablero?nueva=1"><Plus size={15} />Crear una tarea</Link>
    </div>}
  </section>;
}
export default function Dashboard() {
  const {
    user,
    activeTeam,
    refresh,
    canInvest
  } = useSession();
  const {
    data,
    error,
    reload
  } = useResource('/api/dashboard');
  const projectsResource = useResource('/api/projects');
  const {
    reload: reloadProjects
  } = projectsResource;
  const [scope, setScope] = useState('team');
  const [agendaNow, setAgendaNow] = useState(() => Date.now());
  const agendaDay = todayKey();
  const personalAgenda = useResource(scope === 'mine' ? `/api/appointments?from=${encodeURIComponent(startOfDayIso(agendaDay))}&to=${encodeURIComponent(startOfDayIso(addDays(agendaDay, 8)))}` : null);
  const {
    reload: reloadPersonalAgenda
  } = personalAgenda;
  const [paused, setPaused] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const refreshAll = () => {
    setAgendaNow(Date.now());
    reload();
    reloadProjects();
    reloadPersonalAgenda();
    refresh();
  };
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === 'visible') {
        setAgendaNow(Date.now());
        reload();
        reloadProjects();
        reloadPersonalAgenda();
      }
    };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [reload, reloadProjects, reloadPersonalAgenda]);
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const {
    kpis,
    alerts: allAlerts,
    agenda,
    my_tasks: myTasks,
    investments: investmentData,
    activity,
    client_portal: clientPortal
  } = data;
  const investments = canInvest ? investmentData : null;
  const alerts = canInvest ? allAlerts : allAlerts.filter(alert => alert.kind !== 'movement');
  const today = data.today || todayKey();
  const sortedAlerts = [...alerts].sort((a, b) => (urgency[a.tone] ?? 4) - (urgency[b.tone] ?? 4));
  const priority = sortedAlerts[0];
  const filteredAlerts = sortedAlerts.filter(alert => alertFilter === 'all' || (alertFilter === 'urgent' ? alert.tone === 'red' || alert.tone === 'amber' : alert.kind === 'movement' || alert.kind === 'billing'));
  const visibleAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 3);
  // The dashboard includes only the first eight team appointments. Query the
  // full week before filtering to avoid hiding a person's later meetings.
  const agendaItems = scope === 'mine' ? (personalAgenda.data?.appointments ?? []).filter(item => item.status !== 'cancelada' && new Date(item.ends_at).getTime() >= agendaNow && new Date(item.starts_at).getTime() <= agendaNow + 7 * 86_400_000 && item.attendees?.some(person => person.id === user.id)) : agenda;
  const agendaLoading = scope === 'mine' && !personalAgenda.data && !personalAgenda.error;
  const agendaError = scope === 'mine' && personalAgenda.error;
  const projects = (projectsResource.data?.projects ?? []).filter(project => ['en_curso', 'en_revision', 'soporte'].includes(project.status)).filter(project => scope === 'team' || project.owner_id === user.id || project.members?.some(person => person.id === user.id));
  const focusedProjects = [...projects].sort((a, b) => (a.sla_state === 'late' ? -1 : 0) - (b.sla_state === 'late' ? -1 : 0)).slice(0, 3);
  return <div className="pulse-dashboard">
    <header className="pulse-heading">
      <div>
        <p className="pulse-eyebrow">TU ESPACIO, TU EQUIPO, LO QUE SIGUE.</p>
        <h1>{greeting()}, {user.name.split(' ')[0]}<span className="greeting-dot">.</span></h1>
        <p className="pulse-date">{formatDayLong(today)} <span>·</span> Hagamos que hoy cuente.</p>
      </div>
      <div className="pulse-heading-actions">
        <button type="button" className="pulse-refresh" aria-label="Actualizar inicio" onClick={refreshAll}>
          <RefreshCw size={16} />
        </button>
        <Link to="/tablero?nueva=1" className="pulse-button pulse-button-dark"><Plus size={17} />Nueva tarea</Link>
      </div>
    </header>
    {error && <p className="pulse-error" role="alert">No pudimos actualizar el inicio. Se muestra la última información disponible. <button type="button" onClick={reload}>Reintentar</button></p>}
    <div className="pulse-hero-grid">
      <section className="pulse-hero" aria-label="Tu equipo en movimiento">
        <div className="hero-copy">
          <span className="hero-label"><span />EL PUNTO DE ENCUENTRO</span>
          <h2>Buenas ideas.<br />Grandes <em>pasos.</em></h2>
          <p>El talento se conecta. Los proyectos avanzan.<br className="hero-break" /> Y lo que viene, lo construimos juntos.</p>
          <Link to="/proyectos" className="pulse-button pulse-button-lime">Exploremos los proyectos<ArrowUpRight size={17} /></Link>
          <div className="hero-people">
            <AvatarStack people={activeTeam.slice(0, 5)} />
            <span>Un equipo. Muchas posibilidades.</span>
          </div>
        </div>
        <Orbit projectCount={kpis.active_projects} teamCount={activeTeam.length} paused={paused} />
        <button type="button" className="hero-motion" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Activar movimiento visual' : 'Pausar movimiento visual'}>
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </section>
      <section className="pulse-radar" aria-labelledby="radar-title">
        <div className="radar-kicker">
          <span className="radar-icon">
            <BellRing size={17} />
          </span>
          <span>LO QUE IMPORTA AHORA</span>
          <ArrowDownLeft size={19} />
        </div>
        <div className="radar-count">
          <strong>
            {alerts.length.toString().padStart(2, '0')}
          </strong>
          <span>{alerts.length === 1 ? 'asunto para' : 'asuntos para'}<br />dar el siguiente paso</span>
        </div>
        <h2 id="radar-title">
          {priority ? 'Tu atención mueve todo.' : 'Todo bajo control.'}
        </h2>
        <p>
          {priority ? priority.title : 'No hay alertas pendientes. Buen momento para crear algo nuevo.'}
        </p>
        <Link to={priority?.link || '/tablero'} className="radar-action">
          {priority ? 'Resolver la prioridad' : 'Explorar el tablero'}
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
    <section className="pulse-metrics" aria-label="Indicadores del equipo">
      {[{
        to: '/proyectos',
        icon: FolderKanban,
        value: kpis.active_projects,
        label: 'Proyectos activos',
        hint: kpis.sla_late ? `${kpis.sla_late} necesitan un avance` : 'Avances al día',
        warn: !!kpis.sla_late
      }, {
        to: '/tablero?mias=1',
        icon: ListChecks,
        value: kpis.my_open_tasks,
        label: 'Mis tareas abiertas',
        hint: 'Un paso a la vez'
      }, {
        to: '/agenda',
        icon: CalendarDays,
        value: kpis.today_appointments,
        label: 'Citas de hoy',
        hint: 'Agenda del equipo'
      }, investments ? {
        to: '/inversiones',
        icon: Wallet,
        value: formatMoney(investments.my_contributed_crc, 'CRC', {
          compact: true
        }),
        label: 'Mi capital aportado',
        hint: 'Movimientos confirmados'
      } : {
        to: '/tablero?filtro=vencidas',
        icon: Clock3,
        value: kpis.overdue_tasks,
        label: 'Tareas vencidas',
        hint: 'Pendientes del equipo',
        warn: !!kpis.overdue_tasks
      }].map(({
        to,
        icon: Icon,
        value,
        label,
        hint,
        warn
      }) => <Link to={to} key={label} className="pulse-metric">
        <span className="metric-label">
          <Icon size={15} />
          {label}
          <ArrowUpRight size={13} />
        </span>
        <strong>
          {value}
        </strong>
        <span className={cx('metric-hint', warn && 'has-warning')}>
          <i />
          {hint}
        </span>
      </Link>)}
    </section>
    <div className="pulse-view-bar">
      <div>
        <span className="pulse-eyebrow">MENOS FRICCIÓN. MÁS MOVIMIENTO.</span>
        <p>Acá es donde las cosas pasan.</p>
      </div>
      <div className="pulse-scope" role="group" aria-label="Vista de proyectos y agenda">
        <button type="button" aria-pressed={scope === 'team'} onClick={() => setScope('team')}><Users size={14} />Todo el equipo</button>
        <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}><Target size={14} />Mi espacio</button>
      </div>
    </div>
    <div className="pulse-work-grid">
      <section className="pulse-projects" aria-label="Proyectos en movimiento">
        <SectionTitle number="01" title="En movimiento" to="/proyectos" label="Proyectos" />
        {projectsResource.error ? <div className="pulse-inline-empty">No pudimos cargar los proyectos.<button type="button" className="btn btn-outline" onClick={projectsResource.reload}>Reintentar</button></div> : !projectsResource.data ? <div className="project-skeleton" role="status">Cargando proyectos…</div> : focusedProjects.length ? <div className="pulse-project-grid">
          {focusedProjects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
        </div> : <EmptyState icon={FolderKanban} title={scope === 'mine' ? 'No tenés proyectos activos asignados' : 'El próximo proyecto empieza acá'} action={<Link to="/proyectos" className="btn btn-outline">Ver proyectos</Link>} />}
      </section>
      <FocusCard key={user.id} tasks={myTasks} total={kpis.my_open_tasks} userId={user.id} onChanged={refreshAll} />
    </div>
    <section className="pulse-client-strip" aria-label="Seguimiento del portal de clientes">
      <Link to="/briefs?estado=enviado">
        <strong>
          {clientPortal?.briefs_to_review ?? 0}
        </strong>
        <span>Briefs por revisar</span>
        <ArrowUpRight size={16} />
      </Link>
      <Link to="/briefs?tab=entregables&estado=cambios">
        <strong>
          {clientPortal?.changes_requested ?? 0}
        </strong>
        <span>Entregables con cambios pedidos</span>
        <ArrowUpRight size={16} />
      </Link>
      <Link to="/briefs?tab=entregables&estado=en_revision">
        <strong>
          {clientPortal?.waiting_client ?? 0}
        </strong>
        <span>Entregables en revisión del cliente</span>
        <ArrowUpRight size={16} />
      </Link>
    </section>
    <div className="pulse-detail-grid">
      <section className="pulse-panel pulse-attention" aria-label="Requiere acción">
        <SectionTitle number="02" title="Requiere acción" />
        <div className="pulse-filter" role="group" aria-label="Filtrar pendientes">
          <button type="button" aria-pressed={alertFilter === 'all'} onClick={() => setAlertFilter('all')}>Todo <span>
              {alerts.length}
            </span></button>
          <button type="button" aria-pressed={alertFilter === 'urgent'} onClick={() => setAlertFilter('urgent')}>Prioridad</button>
          {investments && <button type="button" aria-pressed={alertFilter === 'money'} onClick={() => setAlertFilter('money')}>Dinero</button>}
        </div>
        {visibleAlerts.length ? <ul className="pulse-alert-list">
          {visibleAlerts.map((alert, index) => <li key={`${alert.kind}-${alert.link}-${index}`}>
            <Link to={alert.link}>
              <span className={`alert-marker alert-marker-${alert.tone}`} />
              <div>
                <strong>
                  {alert.title}
                </strong>
                <p>
                  {alert.detail}
                </p>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          </li>)}
        </ul> : <div className="pulse-inline-empty">
          <CircleCheck size={23} />
          <span>
            {alerts.length ? 'No hay pendientes en este filtro.' : 'Todo en orden. A seguir creando.'}
          </span>
        </div>}
        {filteredAlerts.length > 3 && <button type="button" className="pulse-more" aria-expanded={showAllAlerts} onClick={() => setShowAllAlerts(!showAllAlerts)}>
          {showAllAlerts ? 'Mostrar menos' : `Ver los ${filteredAlerts.length} pendientes`}
          <ArrowRight size={14} />
        </button>}
      </section>
      <section className="pulse-panel pulse-agenda" aria-label="Próximas citas">
        <SectionTitle number="03" title="Nos encontramos" to="/agenda" label="Agenda" />
        <p className="pulse-section-note">{scope === 'mine' ? 'Tus próximas citas disponibles' : 'Próximas citas del equipo'} · hora de Costa Rica</p>
        {agendaLoading ? <div className="pulse-inline-empty" role="status">Cargando tus próximas citas…</div> : agendaError ? <div className="pulse-inline-empty">
          <span>No pudimos cargar tus citas.</span>
          <button type="button" className="btn btn-outline" onClick={reloadPersonalAgenda}>Reintentar</button>
        </div> : agendaItems.length ? <ul>
          {agendaItems.slice(0, 4).map(item => <li key={item.id}>
            <Link to={`/agenda?cita=${item.id}`}>
              <span className="agenda-time">
                <strong>
                  {formatTime(item.starts_at)}
                </strong>
                <span>
                  {dayKey(item.starts_at) === today ? 'HOY' : formatDayLong(dayKey(item.starts_at)).split(',')[0]}
                </span>
              </span>
              <span className="agenda-line" />
              <div>
                <h3>
                  {item.title}
                </h3>
                <p>
                  {item.client_name || item.project_name || 'Encuentro del equipo'}
                </p>
              </div>
              <AvatarStack people={item.attendees?.slice(0, 2)} />
            </Link>
          </li>)}
        </ul> : <div className="pulse-inline-empty">
          <CalendarDays size={24} />
          <span>Sin citas en esta vista.<Link to="/agenda?nueva=1">Agendemos el próximo encuentro<ArrowRight size={14} /></Link></span>
        </div>}
      </section>
    </div>
    <Link to="/automatizaciones" className="pulse-automation-banner">
      <div className="automation-banner-mark">
        <Bot size={29} strokeWidth={1.4} />
        <span />
      </div>
      <div className="automation-banner-copy">
        <span className="pulse-eyebrow">MENOS REPETIR. MÁS CREAR.</span>
        <h2>Lo rutinario tiene su propio equipo.</h2>
        <p>Recordatorios, avances y tareas recurrentes. Descubrí cómo se conectan.</p>
      </div>
      <div className="automation-banner-flow" aria-hidden="true">
        <span><Clock3 size={17} />Detectar</span>
        <i />
        <span><Zap size={17} />Actuar</span>
        <i />
        <span><Check size={17} />Registrar</span>
      </div>
      <span className="automation-banner-arrow">
        <ArrowUpRight size={23} />
      </span>
    </Link>
    <div className="pulse-bottom-grid" style={!investments ? {
      gridTemplateColumns: '1fr'
    } : undefined}>
      <PortalTodayCard />
      {investments && <section className="pulse-capital" aria-labelledby="capital-title">
        <div className="capital-head">
          <span><Wallet size={16} />ENTRE SOCIOS</span>
          <ShieldCheck size={19} />
        </div>
        <h2 id="capital-title" className="section-title">Pulso de inversiones</h2>
        <p className="capital-note">Tus movimientos, con claridad.</p>
        <dl>
          <div>
            <dt>Mi capital aportado</dt>
            <dd>
              {money(investments.my_contributed_crc)}
            </dd>
          </div>
          <div>
            <dt>Me ha retornado</dt>
            <dd>
              {money(investments.my_returned_crc)}
            </dd>
          </div>
        </dl>
        <div className="capital-foot">
          <span>
            {investments.my_pending_count ? `${investments.my_pending_count} por aprobar` : 'Sin aprobaciones pendientes'}
          </span>
          <Link to={investments.my_pending_count ? '/buzon' : '/inversiones'}>
            {investments.my_pending_count ? 'Revisar' : 'Ver portafolio'}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>}
    </div>
    <section className="pulse-panel pulse-activity" aria-label="Actividad del equipo">
      <SectionTitle number="05" title="Cada paso se comparte" to="/bitacora" label="Bitácora" />
      {activity.length ? <div className="pulse-activity-grid">
        {activity.slice(0, 4).map(item => <div key={item.id} className="activity-event">
          <Avatar name={item.user_name || 'Sistema'} color={item.user_color || '#516a57'} size={30} />
          <div>
            <p>
              {item.summary}
            </p>
            <time dateTime={item.created_at}>
              {timeAgo(item.created_at)}
            </time>
          </div>
        </div>)}
      </div> : <p className="pulse-section-note">Los próximos avances del equipo aparecerán aquí.</p>}
    </section>
    <InstallBanner />
    <footer className="pulse-footer">
      <span><Activity size={13} />Datos reales · se actualizan cada minuto al tener esta página abierta</span>
      <Link to="/notificaciones">Tu portal, a tu ritmo<ArrowUpRight size={13} /></Link>
    </footer>
  </div>;
}
