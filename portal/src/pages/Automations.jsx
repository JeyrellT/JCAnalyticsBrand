// Automatizaciones: el portal trabaja solo. Vigila plazos, citas y plata y avisa a quien corresponde.
// Admin: pausa/activa, ajusta horarios y prueba cada automatización. Todos: historial y tareas recurrentes.
import { useMemo, useState } from 'react';
import { Zap, Repeat, Plus, ShieldCheck, Bot, Wand2, PauseCircle, Settings2, ArrowUpRight, ArrowRight, Clock3, ScanLine, UsersRound, Play, Loader2, SlidersHorizontal, Workflow, History, Check, Sparkles } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api, errorMessage } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, useAction, useToast, useConfirm, cx } from '../components/ui.jsx';
import {
  AUTOMATION_GROUPS, AUTOMATION_ICONS, groupOf, readConfig, todayActivity, plural, formatClock,
  ConfigEditor, Switch, StatePill, Timeline, RecurringCard,
} from '../components/automations.jsx';
import RecurringTaskForm, { RECURRING_TEMPLATES, recurringBody, recurringSentence } from '../components/RecurringTaskForm.jsx';
import { timeAgo } from '../lib/format.js';
import '../styles/automation-studio.css';

const SUBTITLE = 'El portal vigila plazos, citas y plata, y avisa a la persona correcta en el momento justo.';

const without = (obj, key) => { const next = { ...obj }; delete next[key]; return next; };
const failedResult = (result) => /^(error|fall[óo]|no se pudo|sin conexi[óo]n|respuesta .* no reconocida|valor fuera de rango)/i.test(String(result ?? '').trim());

// Describe el comportamiento del motor; horarios, estados y resultados siempre vienen de la API.
const FLOW_DETAILS = {
  resumen_diario: { condition: 'Un día con pendientes', detail: 'Reúne las citas, tareas y confirmaciones de cada persona. Si no hay pendientes, no envía un resumen.', action: 'Tu resumen personal', audience: 'Cada persona del equipo operativo que tenga activado su resumen.', destination: '/notificaciones', destinationLabel: 'Elegir mi horario' },
  recordatorio_citas: { condition: 'Una cita se acerca', detail: 'Busca citas próximas que siguen pendientes. Cada cita recibe un recordatorio por fecha y hora.', action: 'Avisar a participantes', audience: 'Las personas incluidas en la cita, según sus preferencias de avisos.', destination: '/agenda', destinationLabel: 'Abrir la agenda' },
  cita_sin_confirmar: { condition: 'Falta una confirmación', detail: 'Detecta citas externas de las próximas 24 horas que todavía están programadas sin confirmar.', action: 'Pedir seguimiento', audience: 'Quien creó la cita y sus participantes.', destination: '/agenda', destinationLabel: 'Revisar las citas' },
  avance_72h: { condition: 'Un avance está por vencer', detail: 'Revisa el compromiso de actualización de cada proyecto de cliente activo y distingue avisos próximos de avances vencidos.', action: 'Alertar al responsable', audience: 'El responsable del proyecto. Si el plazo ya venció, también avisa a administradores.', destination: '/proyectos', destinationLabel: 'Ver los proyectos' },
  tareas_vencen: { condition: 'Una tarea vence hoy', detail: 'Encuentra tareas con vencimiento hoy, responsable asignado y trabajo pendiente de completar.', action: 'Recordar la entrega', audience: 'La persona responsable de cada tarea.', destination: '/tablero', destinationLabel: 'Ir al tablero' },
  dinero_pendiente: { condition: 'Más de 24 h por aprobar', detail: 'Revisa movimientos que esperan aprobación desde hace más de un día y se los recuerda a la administración.', action: 'Avisar a la administración', audience: 'Los administradores, que son quienes aprueban la plata.', destination: '/inversiones', destinationLabel: 'Ver las inversiones' },
  fin_soporte: { condition: 'El soporte está por terminar', detail: 'Detecta proyectos entregados cuyo período de soporte de 30 días termina dentro de los próximos 7 días.', action: 'Preparar el siguiente paso', audience: 'El responsable del proyecto o, si no tiene responsable, los administradores.', destination: '/proyectos', destinationLabel: 'Revisar los proyectos' },
  tareas_recurrentes: { condition: 'Hoy toca una regla', detail: 'Comprueba las reglas diarias, semanales y mensuales activas. Cada regla crea como máximo una tarea por día.', action: 'Crear y asignar la tarea', audience: 'La tarea aparece en el tablero y su responsable recibe un aviso, si tiene uno asignado.', destination: '/tablero', destinationLabel: 'Abrir el tablero' },
  tipo_cambio: { condition: 'Consultar dólar venta', detail: 'Consulta el tipo de cambio de Hacienda y valida la respuesta. Si la consulta falla, conserva el valor anterior.', action: 'Actualizar el tipo de cambio', audience: 'El portal guarda el valor y avisa a los administradores cuando cambia.', destination: '/equipo', destinationLabel: 'Ver configuración' },
};

function FlowCanvas({ automation: a, step, onStep }) {
  const details = FLOW_DETAILS[a.key] ?? { condition: 'Revisar condiciones', detail: a.description, action: 'Ejecutar la acción', audience: a.description };
  const stages = [
    { icon: Clock3, label: 'Cuándo', title: 'El momento correcto', subtitle: a.schedule, detail: a.enabled ? (a.next_run_hint ? `Próxima revisión: ${a.next_run_hint}.` : a.schedule) : 'Este flujo está en pausa. No ejecutará acciones hasta que un administrador lo active.' },
    { icon: ScanLine, label: 'Si se cumple', title: details.condition, subtitle: 'Revisa los datos del portal', detail: details.detail },
    { icon: UsersRound, label: 'Entonces', title: details.action, subtitle: 'Una acción con contexto', detail: details.audience },
  ];
  const focused = stages[step];
  return (
    <div className={cx('studio-canvas', !a.enabled && 'studio-canvas-paused')}>
      <div className="studio-canvas-top"><span><Workflow size={14} aria-hidden="true" /> MAPA DEL FLUJO</span><span>Seleccioná un paso para explorarlo</span></div>
      <div className="studio-flow" role="group" aria-label={`Pasos de ${a.name}`}>
        {stages.map((s, i) => (
          <button type="button" key={s.label} className={cx('studio-node', step === i && 'is-selected')} onClick={() => onStep(i)} aria-pressed={step === i}>
            <span className="studio-node-top"><span className="studio-node-icon"><s.icon size={21} aria-hidden="true" /></span><span className="studio-node-number">0{i + 1}</span></span>
            <span className="studio-node-label">{s.label}</span>
            <strong>{s.title}</strong>
            <span className="studio-node-caption">{s.subtitle}</span>
            {i < 2 && <span className="studio-connector" aria-hidden="true"><ArrowRight size={15} /></span>}
          </button>
        ))}
      </div>
      <div className="studio-stage-detail" aria-live="polite">
        <span className="studio-stage-index">0{step + 1}</span><div><h3>{focused.label}</h3><p>{focused.detail}</p></div>
      </div>
      <div className="studio-canvas-footer"><ShieldCheck size={14} aria-hidden="true" /><span>Los avisos respetan las preferencias de cada persona.</span><Link to="/notificaciones">Mis avisos <ArrowUpRight size={13} aria-hidden="true" /></Link></div>
    </div>
  );
}

export default function Automations() {
  const { user, isAdmin, canInvest, team, refresh } = useSession();
  const { data, error, reload, setData } = useResource('/api/automations');
  const toast = useToast();
  const confirm = useConfirm();
  const [run] = useAction();
  const [togglingKey, setTogglingKey] = useState({});
  const [runningKey, setRunningKey] = useState({});
  const [togglingRule, setTogglingRule] = useState({});
  const [editor, setEditor] = useState(null); // { rule?, template? }
  const [selectedKey, setSelectedKey] = useState(null);
  const [flowFilter, setFlowFilter] = useState('all');
  const [selectedStep, setSelectedStep] = useState(0);
  const [historyScope, setHistoryScope] = useState('all');

  const automations = useMemo(() => data?.automations ?? [], [data]);
  const rules = useMemo(() => [...(data?.recurring ?? [])].sort((a, b) => (Number(!!b.active) - Number(!!a.active)) || String(a.title).localeCompare(String(b.title), 'es')), [data]);
  const colorOf = useMemo(() => new Map(team.map((u) => [u.id, u.color])), [team]);

  const recurringAuto = automations.find((a) => a.key === 'tareas_recurrentes');
  const runTime = readConfig(recurringAuto?.config).time || '06:00';

  // ── Cambios locales (optimistas) ──
  const patchAutomation = (key, fields) => setData((d) => d && ({ ...d, automations: d.automations.map((x) => (x.key === key ? { ...x, ...fields } : x)) }));
  /** Las escrituras de reglas devuelven la lista completa; si no viene, se recarga. */
  const applyRecurring = (res) => {
    if (Array.isArray(res?.recurring)) setData((d) => d && ({ ...d, recurring: res.recurring }));
    else reload();
  };
  const patchRule = (id, fields) => setData((d) => d && ({ ...d, recurring: (d.recurring ?? []).map((x) => (x.id === id ? { ...x, ...fields } : x)) }));

  async function toggleAutomation(a, next) {
    setTogglingKey((s) => ({ ...s, [a.key]: true }));
    patchAutomation(a.key, { enabled: next });
    try {
      const res = await api(`/api/automations/${a.key}`, { method: 'PATCH', body: { enabled: next } });
      if (res?.automation) patchAutomation(a.key, res.automation);
      toast(next ? `«${a.name}» quedó activa` : `«${a.name}» quedó en pausa`);
    } catch (err) {
      patchAutomation(a.key, { enabled: a.enabled });
      toast(errorMessage(err), 'error');
    } finally {
      setTogglingKey((s) => without(s, a.key));
    }
  }

  async function saveConfig(a, config) {
    try {
      const res = await api(`/api/automations/${a.key}`, { method: 'PATCH', body: { config } });
      patchAutomation(a.key, res?.automation ?? { config });
      toast(`Ajustes de «${a.name}» guardados`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function runNow(a) {
    setRunningKey((s) => ({ ...s, [a.key]: true }));
    try {
      const res = await api(`/api/automations/${a.key}/run`, { method: 'POST' });
      const { summary, recipients = 0, error: failed } = res?.result ?? {};
      if (res?.automation) patchAutomation(a.key, res.automation);
      const text = summary || (recipients ? plural(recipients, 'aviso enviado', 'avisos enviados') : 'no había nada que avisar');
      toast(`${a.name}: ${text}`, failed ? 'error' : 'ok');
      reload();
      refresh(); // contadores del buzón y, si cambió, el tipo de cambio
    } catch (err) {
      toast(err?.data?.error === 'automation_disabled' ? `«${a.name}» está en pausa: activala antes de probarla.` : errorMessage(err), 'error');
    } finally {
      setRunningKey((s) => without(s, a.key));
    }
  }

  async function toggleRule(r, next) {
    setTogglingRule((s) => ({ ...s, [r.id]: true }));
    patchRule(r.id, { active: next });
    try {
      const res = await api(`/api/recurring-tasks/${r.id}`, { method: 'PATCH', body: recurringBody({ ...r, active: next }) });
      toast(next ? `«${r.title}» activa` : `«${r.title}» en pausa`);
      applyRecurring(res);
    } catch (err) {
      patchRule(r.id, { active: r.active });
      toast(errorMessage(err), 'error');
    } finally {
      setTogglingRule((s) => without(s, r.id));
    }
  }

  async function deleteRule(r) {
    const ok = await confirm({
      title: 'Eliminar tarea recurrente',
      message: `«${r.title}» deja de crearse. Las tareas que ya creó siguen en el tablero.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await run(() => api(`/api/recurring-tasks/${r.id}`, { method: 'DELETE' }), { success: 'Tarea recurrente eliminada' });
    if (res !== undefined) {
      setData((d) => d && ({ ...d, recurring: (d.recurring ?? []).filter((x) => x.id !== r.id) }));
      applyRecurring(res);
    }
  }

  if (!data) return <><PageHeader eyebrow="Control" title="Automatizaciones" subtitle={SUBTITLE} icon={Bot} tone="teal" /><PageLoader error={error} onRetry={reload} /></>;

  const enabledCount = automations.filter((a) => a.enabled).length;
  const today = todayActivity(data.log ?? []);
  const activeRules = rules.filter((r) => r.active).length;
  const visibleAutomations = automations.filter((a) => flowFilter === 'all' || (flowFilter === 'active' ? a.enabled : !a.enabled));
  const selected = visibleAutomations.find((a) => a.key === selectedKey) ?? visibleAutomations[0];
  const groups = AUTOMATION_GROUPS.map((g) => ({ ...g, items: visibleAutomations.filter((a) => groupOf(a) === g.key) })).filter((g) => g.items.length);
  const selectedDetails = selected && FLOW_DETAILS[selected.key];
  const visibleLog = historyScope === 'selected' ? (data.log ?? []).filter((e) => e.automation_key === selected?.key) : (data.log ?? []);
  const scrollToRules = () => document.getElementById('recurrentes')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  const canEditRule = (r) => isAdmin || r.created_by === user.id;
  const selectFlow = (key) => { setSelectedKey(key); setSelectedStep(0); };

  return (
    <div className="automation-studio">
      <header className="studio-intro">
        <div>
          <p className="studio-eyebrow"><span /> OPERACIÓN EN MOVIMIENTO</p>
          <h1>Automatizaciones<span>Tu equipo, un paso adelante.</span></h1>
          <p className="studio-intro-description">Que los pendientes encuentren a su responsable.<br className="hidden sm:block" /> Y ustedes encuentren tiempo para lo que sigue.</p>
        </div>
        <button type="button" className="studio-create" onClick={() => setEditor({})}><Plus size={17} aria-hidden="true" /><span>Nueva tarea recurrente</span><ArrowUpRight size={17} aria-hidden="true" /></button>
      </header>

      <section className="studio-pulse" aria-label="Resumen de automatizaciones">
        <div className="studio-pulse-heading"><div className="studio-pulse-symbol"><Zap size={24} aria-hidden="true" /></div><div><span className="studio-overline">EL PORTAL SE ENCARGA</span><h2>{enabledCount ? 'El trabajo sigue.' : 'Todo en pausa.'}</h2><p>{enabledCount ? 'Flujos configurados para anticiparse.' : 'Los flujos esperan a que los actives.'}</p></div></div>
        <div className="studio-pulse-stat"><strong>{String(enabledCount).padStart(2, '0')}<span>/{String(automations.length).padStart(2, '0')}</span></strong><span>Flujos activos</span></div>
        <div className="studio-pulse-stat"><strong>{String(today.recipients).padStart(2, '0')}</strong><span>Avisos registrados hoy</span></div>
        <div className="studio-pulse-stat"><strong>{String(activeRules).padStart(2, '0')}</strong><span>Reglas recurrentes activas</span></div>
      </section>

      {!isAdmin && <div className="studio-permissions"><ShieldCheck size={17} aria-hidden="true" /><p>Explorá cómo trabaja el portal. Solo un administrador puede activar, ajustar o ejecutar los flujos. <Link to="/notificaciones">Personalizar mis avisos <ArrowUpRight size={12} aria-hidden="true" /></Link></p></div>}

      <section className="studio-workspace" aria-labelledby="studio-workspace-title">
        <div className="studio-workspace-heading"><div><span className="studio-section-number">01 /</span><h2 id="studio-workspace-title">Estudio de flujos</h2></div><span className="studio-label"><SlidersHorizontal size={14} aria-hidden="true" />{isAdmin ? 'Explorá, ajustá, ejecutá' : 'Explorá cada automatización'}</span></div>
        <div className="studio-workspace-body">
          <aside className="studio-library" aria-label="Biblioteca de flujos">
            <div className="studio-library-head"><span>Biblioteca</span><span>{automations.length}</span></div>
            <div className="studio-filter" role="group" aria-label="Filtrar automatizaciones">
              {[['all', 'Todos'], ['active', 'Activos'], ['paused', 'En pausa']].map(([key, label]) => <button type="button" key={key} onClick={() => setFlowFilter(key)} aria-pressed={flowFilter === key}>{label}</button>)}
            </div>
            {groups.length ? groups.map((g) => <div key={g.key} className="studio-library-group"><h3>{g.label}</h3>{g.items.map((a) => {
              const Icon = AUTOMATION_ICONS[a.key] ?? Bot;
              return <button key={a.key} type="button" className={cx('studio-library-item', selected?.key === a.key && 'is-selected')} aria-pressed={selected?.key === a.key} onClick={() => selectFlow(a.key)}><span className="studio-library-icon"><Icon size={17} aria-hidden="true" /></span><span>{a.name}<small><span className={cx('studio-status-dot', a.enabled && 'is-on')} />{a.enabled ? 'Activo' : 'En pausa'}</small></span><ArrowUpRight size={14} className="studio-library-arrow" aria-hidden="true" /></button>;
            })}</div>) : <p className="studio-no-flows">{automations.length ? 'No hay flujos con este estado.' : 'Los flujos aparecerán cuando el servidor los registre.'}</p>}
          </aside>

          <div className="studio-editor">
            {!selected ? <EmptyState icon={Workflow} tone="teal" title="Tu próximo flujo empieza aquí">{automations.length ? 'Elegí otro filtro para explorar tus automatizaciones.' : 'Cuando haya automatizaciones disponibles, podrás explorar sus pasos y ajustes.'}</EmptyState> : <>
              <div className="studio-selected-heading"><div><p className="studio-overline">{AUTOMATION_GROUPS.find((g) => g.key === groupOf(selected))?.label}</p><h2>{selected.name}</h2><p>{selected.description}</p></div><div className="studio-enable">{isAdmin ? <><span>{selected.enabled ? 'Activo' : 'En pausa'}</span><Switch checked={!!selected.enabled} label={selected.name} disabled={!!togglingKey[selected.key]} onChange={(next) => toggleAutomation(selected, next)} /></> : <StatePill on={!!selected.enabled} />}</div></div>
              <FlowCanvas automation={selected} step={selectedStep} onStep={setSelectedStep} />
              <div className="studio-inspector">
                <section className="studio-config" aria-labelledby="studio-config-title"><h3 id="studio-config-title"><Settings2 size={15} aria-hidden="true" />Ajustes del flujo</h3>
                  {isAdmin && selected.config_schema?.length ? <ConfigEditor key={`${selected.key}-${JSON.stringify(readConfig(selected.config))}`} automation={selected} onSave={(config) => saveConfig(selected, config)} /> : <p>{selected.key === 'resumen_diario' ? 'Cada persona elige la hora de su resumen.' : selected.config_schema?.length ? selected.schedule : 'Este flujo utiliza las reglas de la operación.'}</p>}
                  {selected.key === 'resumen_diario' && <Link to="/notificaciones" className="studio-text-link">Elegir mi horario <ArrowUpRight size={13} aria-hidden="true" /></Link>}
                  {selected.key === 'tareas_recurrentes' && <button type="button" className="studio-text-link" onClick={scrollToRules}>{plural(activeRules, 'regla activa', 'reglas activas')} · Ver reglas <ArrowRight size={13} aria-hidden="true" /></button>}
                  {selectedDetails?.destination && selected.key !== 'resumen_diario' && (selected.key !== 'dinero_pendiente' || canInvest) && <Link to={selectedDetails.destination} className="studio-text-link">{selectedDetails.destinationLabel} <ArrowUpRight size={13} aria-hidden="true" /></Link>}
                </section>
                <section className="studio-result" aria-labelledby="studio-result-title"><h3 id="studio-result-title"><History size={15} aria-hidden="true" />Última revisión</h3>{selected.last_run_at ? <><p className="studio-result-time">{timeAgo(selected.last_run_at)}<span>{plural(Number(selected.runs) || 0, 'revisión total', 'revisiones totales')}</span></p><p className={cx('studio-result-summary', failedResult(selected.last_result) && 'studio-result-error')}>{selected.last_result || 'No hay un resultado visible para tu cuenta.'}</p></> : <p>Todavía no se ha ejecutado este flujo.</p>}</section>
              </div>
              <div className="studio-runbar"><p><span className={cx('studio-status-dot', selected.enabled && 'is-on')} />{selected.enabled ? (selected.next_run_hint || selected.schedule) : 'En pausa. Activá el flujo para ejecutarlo.'}</p>{isAdmin && <div><span>Revisa datos actuales y puede enviar avisos.</span><button type="button" className="studio-run" onClick={() => runNow(selected)} disabled={!!runningKey[selected.key] || !selected.enabled || !!togglingKey[selected.key]} aria-label={`Probar ahora: ${selected.name}`}>{runningKey[selected.key] ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{runningKey[selected.key] ? 'Ejecutando…' : 'Probar ahora'}</button></div>}</div>
            </>}
          </div>
        </div>
      </section>

      <div className="studio-bottom-grid">
        <section id="recurrentes" aria-labelledby="recurrentes-title" className="studio-recurring scroll-mt-20">
          <div className="studio-section-heading"><div><p className="studio-overline">02 / RITUALES DEL EQUIPO</p><h2 id="recurrentes-title">Una vez configurado.<br /><span>Cada vez, resuelto.</span></h2></div><span className="studio-count">{String(rules.length).padStart(2, '0')}</span></div>
          <p className="studio-section-description">Tus tareas recurrentes llegan al tablero a las {formatClock(runTime)} del día que toca, con responsable y fecha.</p>
          {recurringAuto && !recurringAuto.enabled && <p className="studio-paused-notice"><PauseCircle size={17} aria-hidden="true" />La automatización «{recurringAuto.name}» está en pausa. Las reglas crearán tareas cuando un admin la active.</p>}
          <div className="studio-templates" role="group" aria-labelledby="ideas-rapidas"><p id="ideas-rapidas"><Wand2 size={15} aria-hidden="true" />Empezá con una idea</p><div>{RECURRING_TEMPLATES.map((t) => <button key={t.key} type="button" onClick={() => setEditor({ template: t })}><Plus size={14} aria-hidden="true" />{t.label}<ArrowUpRight size={13} aria-hidden="true" /></button>)}</div></div>
          {rules.length === 0 ? <div className="studio-recurring-empty"><Repeat size={25} aria-hidden="true" /><h3>Hacé espacio para lo que importa.</h3><p>Creá tu primera regla y dejá que el portal se ocupe de repetirla.</p><button type="button" className="studio-text-link" onClick={() => setEditor({})}>Crear una tarea recurrente <ArrowRight size={14} aria-hidden="true" /></button></div> : <div className="studio-recurring-grid">{rules.map((r) => <RecurringCard key={r.id} rule={r.summary ? r : { ...r, summary: recurringSentence(r, { time: runTime, assigneeName: r.assignee_name, projectName: r.project_name }) }} canEdit={canEditRule(r)} color={colorOf.get(r.assignee_id)} pending={!!togglingRule[r.id]} onToggle={toggleRule} onEdit={(rule) => setEditor({ rule })} onDelete={deleteRule} />)}</div>}
          <button type="button" className="studio-add-recurring" onClick={() => setEditor({})}><Plus size={16} aria-hidden="true" />Nueva tarea recurrente<ArrowUpRight size={16} aria-hidden="true" /></button>
        </section>

        <section className="studio-history" aria-label="Historial de actividad">
          <div className="studio-history-heading"><div><p className="studio-overline">03 / TRAZABILIDAD</p><h2>Todo deja una huella.</h2></div><History size={20} aria-hidden="true" /></div>
          <div className="studio-filter studio-history-filter" role="group" aria-label="Filtrar historial"><button type="button" aria-pressed={historyScope === 'all'} onClick={() => setHistoryScope('all')}>Todos los flujos</button><button type="button" aria-pressed={historyScope === 'selected'} disabled={!selected} onClick={() => setHistoryScope('selected')}>Flujo seleccionado</button></div>
          {historyScope === 'selected' && selected && <p className="studio-history-context">{selected.name}</p>}
          {visibleLog.length ? <Timeline key={historyScope === 'selected' ? selected?.key : 'all'} log={visibleLog} automations={automations} /> : <div className="studio-history-empty"><Check size={24} aria-hidden="true" /><h3>Sin actividad registrada.</h3><p>{historyScope === 'selected' ? 'Este flujo no tiene acciones en el historial disponible.' : 'Las acciones del portal aparecerán aquí cuando ocurran.'}</p></div>}
          <p className="studio-history-note"><Sparkles size={13} aria-hidden="true" />Actividad disponible para tu cuenta. Las revisiones sin novedades no generan entradas.</p>
        </section>
      </div>

      {editor && <RecurringTaskForm rule={editor.rule ?? null} template={editor.template ?? null} runTime={runTime} onClose={() => setEditor(null)} onSaved={applyRecurring} />}
    </div>
  );
}
