// Automatizaciones: el portal trabaja solo. Vigila plazos, citas y plata y avisa a quien corresponde.
// Admin: pausa/activa, ajusta horarios y prueba cada automatización. Todos: historial y tareas recurrentes.
import { useMemo, useState } from 'react';
import { Zap, BellRing, Repeat, Plus, ShieldCheck, Bot, Wand2, PauseCircle, Settings2 } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api, errorMessage } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, useAction, useToast, useConfirm, cx } from '../components/ui.jsx';
import {
  AUTOMATION_GROUPS, groupOf, readConfig, todayActivity, plural, formatClock,
  LivePill, MiniStat, HowItWorks, AutomationCard, Timeline, RecurringCard,
} from '../components/automations.jsx';
import RecurringTaskForm, { RECURRING_TEMPLATES, recurringBody, recurringSentence } from '../components/RecurringTaskForm.jsx';

const SUBTITLE = 'El portal vigila plazos, citas y plata, y avisa a la persona correcta en el momento justo.';

const without = (obj, key) => { const next = { ...obj }; delete next[key]; return next; };

export default function Automations() {
  const { user, isAdmin, team, refresh } = useSession();
  const { data, error, reload, setData } = useResource('/api/automations');
  const toast = useToast();
  const confirm = useConfirm();
  const [run] = useAction();
  const [togglingKey, setTogglingKey] = useState({});
  const [runningKey, setRunningKey] = useState({});
  const [togglingRule, setTogglingRule] = useState({});
  const [editor, setEditor] = useState(null); // { rule?, template? }

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

  const header = (
    <PageHeader eyebrow="Control" title="Automatizaciones" subtitle={SUBTITLE}
      actions={data && <LivePill active={automations.filter((a) => a.enabled).length} total={automations.length} />} />
  );
  if (!data) return <>{header}<PageLoader error={error} onRetry={reload} /></>;

  const enabledCount = automations.filter((a) => a.enabled).length;
  const today = todayActivity(data.log ?? []);
  const activeRules = rules.filter((r) => r.active).length;
  const groups = AUTOMATION_GROUPS.map((g) => ({ ...g, items: automations.filter((a) => groupOf(a) === g.key) })).filter((g) => g.items.length);
  const scrollToRules = () => document.getElementById('recurrentes')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  const canEditRule = (r) => isAdmin || r.created_by === user.id;

  const extraFor = (a) => {
    if (a.key === 'resumen_diario') {
      return <Link to="/notificaciones" className="-my-1.5 inline-flex min-h-11 items-center gap-1.5 self-start text-xs font-semibold text-brand hover:underline"><Settings2 className="h-3.5 w-3.5" />Cada persona elige su hora en Avisos y app</Link>;
    }
    if (a.key === 'tareas_recurrentes') {
      return (
        <button type="button" onClick={scrollToRules} className="-my-1.5 inline-flex min-h-11 items-center gap-1.5 self-start text-xs font-semibold text-brand hover:underline">
          <Repeat className="h-3.5 w-3.5" />{plural(activeRules, 'regla activa', 'reglas activas')} · Ver reglas
        </button>
      );
    }
    return null;
  };

  return (
    <>
      {header}
      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Resumen">
            <MiniStat icon={Zap} tone="teal" value={enabledCount} label={'Automatiza­ciones activas'} hint={`de ${automations.length}`} />
            <MiniStat icon={BellRing} tone="blue" value={today.recipients} label="Avisos enviados hoy"
              hint={today.sources ? `de ${plural(today.sources, 'automatización', 'automatizaciones')}` : 'todavía nada'} />
            <MiniStat icon={Repeat} tone="violet" value={activeRules} label="Tareas recurrentes activas" hint={`de ${rules.length}`} />
          </div>
          <HowItWorks />
        </div>

        {!isAdmin && (
          <p className="flex items-start gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark" aria-hidden="true" />
            <span>Solo un admin puede pausarlas, ajustarlas o probarlas. Lo que te llega a vos lo elegís en <Link to="/notificaciones" className="font-semibold text-brand hover:underline">Avisos y app</Link>.</span>
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-[auto_1fr]">
          {/* Automatizaciones por grupo */}
          <div className="space-y-6 xl:col-start-1 xl:row-start-1">
            {groups.length === 0 && <EmptyState icon={Bot} title="Todavía no hay automatizaciones">Cuando el servidor las registre, aparecen acá.</EmptyState>}
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`grupo-${g.key}`}>
                <h2 id={`grupo-${g.key}`} className="section-title mb-3 flex items-center gap-2">
                  <span className={cx('h-2.5 w-2.5 rounded-full', `dot-${g.tone}`)} aria-hidden="true" />
                  {g.label}
                  <span className="text-sm font-normal text-muted">{g.items.length}</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.items.map((a) => (
                    <AutomationCard key={a.key} automation={a} isAdmin={isAdmin}
                      pending={!!togglingKey[a.key]} running={!!runningKey[a.key]}
                      onToggle={toggleAutomation} onRun={runNow} onSaveConfig={saveConfig} extra={extraFor(a)} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Historial (columna lateral en escritorio) */}
          <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
            <Timeline log={data.log ?? []} automations={automations} />
          </div>

          {/* Tareas recurrentes */}
          <section id="recurrentes" aria-labelledby="recurrentes-title" className="scroll-mt-20 xl:col-start-1 xl:row-start-2">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 id="recurrentes-title" className="section-title flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-violet-600" aria-hidden="true" />Tareas recurrentes
                  <span className="text-sm font-normal text-muted">{rules.length}</span>
                </h2>
                <p className="mt-0.5 text-sm text-muted">Lo que se repite, el portal lo pone solo en el tablero a las {formatClock(runTime)} del día que toca.</p>
              </div>
              <button type="button" className="btn btn-primary min-h-11" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Nueva tarea recurrente</button>
            </div>

            {recurringAuto && !recurringAuto.enabled && (
              <p className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                La automatización «{recurringAuto.name}» está en pausa: estas reglas no crean tareas hasta que un admin la active.
              </p>
            )}

            <div className="mb-4" role="group" aria-labelledby="ideas-rapidas">
              <p id="ideas-rapidas" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted"><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Ideas rápidas: un toque y queda lista</p>
              {/* En el celular, una fila que se desliza sola (sin mover la página); en pantallas grandes, se acomoda. */}
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {RECURRING_TEMPLATES.map((t) => (
                  <button key={t.key} type="button" onClick={() => setEditor({ template: t })}
                    className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand">
                    <Plus className="-ml-0.5 mr-1 inline h-3.5 w-3.5 align-[-3px] text-brand" aria-hidden="true" />{t.label}
                  </button>
                ))}
              </div>
            </div>

            {rules.length === 0 ? (
              <EmptyState icon={Repeat} title="Todavía no hay tareas recurrentes">
                Creá una regla (o tocá una idea rápida) y el portal pone la tarea en el tablero el día que toca, con responsable y fecha.
              </EmptyState>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {rules.map((r) => (
                  <RecurringCard key={r.id}
                    rule={r.summary ? r : { ...r, summary: recurringSentence(r, { time: runTime, assigneeName: r.assignee_name, projectName: r.project_name }) }}
                    canEdit={canEditRule(r)} color={colorOf.get(r.assignee_id)} pending={!!togglingRule[r.id]}
                    onToggle={toggleRule} onEdit={(rule) => setEditor({ rule })} onDelete={deleteRule} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {editor && (
        <RecurringTaskForm rule={editor.rule ?? null} template={editor.template ?? null} runTime={runTime}
          onClose={() => setEditor(null)} onSaved={applyRecurring} />
      )}
    </>
  );
}
