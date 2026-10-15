// Brief creativo (v5) visto por el equipo: alta (/briefs/nuevo) y ficha (/briefs/:id) con el
// formulario por secciones, envío en nombre del cliente, flujo de estados, bitácora con notas
// internas, versiones congeladas con su huella y entregables ligados.
import { useEffect, useState } from 'react';
import {
  ArrowLeft, ClipboardList, Printer, Flame, Store, Send, Save, Lock, Building2, UserRound, CalendarDays, History,
  MessagesSquare, PackageCheck, AlertTriangle, Info, RotateCcw, Fingerprint, Plus,
} from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, Badge, Field, IconTile, Modal, SectionHead, useAction, useConfirm, useToast, cx } from '../components/ui.jsx';
import { PersonSelect } from '../components/common.jsx';
import { ClientSelect } from '../components/clients.jsx';
import { BRIEF_ACTIONS, BRIEF_FINAL_STATUSES, BRIEF_TEAM_TRANSITIONS, BRIEF_TITLE_MAX, transitionNeedsNote } from '../../shared/brief.js';
import { BriefForm, focusBriefField } from '../components/brief/BriefForm.jsx';
import { BriefView } from '../components/brief/BriefView.jsx';
import { BriefSteps, BriefStatusBadge } from '../components/brief/BriefSteps.jsx';
import { BriefTimeline, BriefCommentBox } from '../components/brief/BriefTimeline.jsx';
import { BriefVersions, BriefDeliverables } from '../components/brief/BriefVersions.jsx';
import { useBriefEditor } from '../components/brief/useBriefEditor.js';
import { briefPrintPath, briefStatusMeta, cancelledFrom, lastObservation, shortHash } from '../components/brief/brief-ui.js';
import { formatDate, formatDateTime, timeAgo, todayKey } from '../lib/format.js';

// ── Alta ────────────────────────────────────────────────────────────────────

function NewBrief() {
  const { query } = useLocation();
  const [clientId, setClientId] = useState(() => Number(query.get('cliente')) || null);
  const [projectId, setProjectId] = useState(() => Number(query.get('proyecto')) || null);
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState(null);
  const [errors, setErrors] = useState({});
  const [run, busy] = useAction();

  // ?proyecto=ID sin cliente: el cliente sale del proyecto.
  const fromProject = useResource(projectId && !clientId ? `/api/projects/${projectId}` : null);
  const inferred = fromProject.data?.project?.client_id ?? null;
  if (!clientId && inferred) setClientId(inferred);

  const client = useResource(clientId ? `/api/clients/${clientId}` : null);
  const projects = (client.data?.projects ?? []).filter((p) => !p.archived || p.id === projectId);
  const name = client.data?.client?.name ?? clientName;

  function pickClient(id, c) {
    setClientId(id);
    setClientName(c?.name ?? '');
    setProjectId(null);
    setErrors((e) => ({ ...e, client_id: null, project_id: null }));
  }

  async function create(e) {
    e.preventDefault();
    const errs = {};
    if (!clientId) errs.client_id = 'Elegí el cliente del requerimiento.';
    if (title.trim().length < 3) errs.title = 'Ponele un nombre (mínimo 3 caracteres).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { client_id: clientId, title: title.trim() };
    if (projectId) body.project_id = projectId;
    if (ownerId) body.owner_id = ownerId;
    const res = await run(() => api('/api/briefs', { method: 'POST', body }), {
      success: 'Borrador creado',
      onError: (err, msg) => { if (err?.data?.field) setErrors({ [err.data.field]: msg }); },
    });
    if (res?.brief) navigate(`/briefs/${res.brief.id}`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Briefs" title="Nuevo brief" icon={ClipboardList} tone="violet"
        back={<Link to="/briefs" className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Briefs</Link>}
        subtitle="Creá el borrador con el formato CREATIVIDAD. Lo completás vos o el cliente desde su portal." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={create} className="card animate-rise space-y-4 p-4 sm:p-6" noValidate>
          <Field label="Cliente" error={errors.client_id} hint="La marca del cliente queda escrita en el brief.">
            {(id) => <ClientSelect id={id} value={clientId} selectedLabel={name} onChange={pickClient} />}
          </Field>
          <Field label="Proyecto (opcional)" error={errors.project_id} hint={clientId && client.data && !projects.length ? 'Este cliente no tiene proyectos activos.' : 'Liga el brief a un proyecto para verlo en su ficha.'}>
            {(id) => (
              <select id={id} className="input" value={projectId ?? ''} disabled={!clientId || !client.data} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
                <option value="">{!clientId ? 'Elegí primero el cliente' : !client.data ? 'Cargando proyectos…' : 'Sin proyecto'}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Nombre del requerimiento" error={errors.title}>
            {(id) => <input id={id} className="input" value={title} maxLength={BRIEF_TITLE_MAX} onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: null })); }}
              placeholder="Ej.: Giveaway Tacos · promoción de octubre" autoComplete="off" aria-invalid={!!errors.title} />}
          </Field>
          <Field label="Responsable" hint="Si lo dejás en automático, queda quien lleva el proyecto o el cliente." error={errors.owner_id}>
            {(id) => <PersonSelect id={id} value={ownerId} onChange={setOwnerId} placeholder="Automático" />}
          </Field>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Link to="/briefs" className="btn btn-ghost">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Creando…' : 'Crear borrador'}</button>
          </div>
        </form>
        <aside className="card-sunken animate-rise h-fit p-4 sm:p-5">
          <p className="eyebrow">Cómo sigue</p>
          <ol className="mt-3 space-y-3 text-sm text-ink-2">
            {[
              ['Borrador', 'Arranca con la marca del cliente. Nadie lo revisa todavía.'],
              ['Se completa', 'Lo llenás vos o el cliente desde su portal (Solicitudes).'],
              ['Se envía', 'Se congela la versión con su huella SHA-256 y pasa a revisión.'],
              ['Aprobación', 'Aprobás o pedís ajustes; después, producción y entrega.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand-ink shadow-card">{i + 1}</span>
                <span><span className="font-semibold text-ink">{t}.</span> {d}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

// ── Ficha ───────────────────────────────────────────────────────────────────

const ACTION_BTN = { teal: 'btn-teal', violet: 'btn-primary', ink: 'btn-dark', amber: 'btn-outline', red: 'btn-ghost text-coral-ink hover:bg-coral-soft' };
const CONFIRM_BTN = { teal: 'btn-teal', violet: 'btn-primary', ink: 'btn-dark', amber: 'btn-primary', red: 'btn-danger' };

/** Textos del diálogo de cada transición del equipo. */
function transitionCopy(from, to, version) {
  if (to === 'observado') return { title: 'Pedir ajustes', lead: 'El brief vuelve al cliente para que lo corrija y lo reenvíe. La nota le llega como aviso.', label: '¿Qué tiene que ajustar?', placeholder: 'Ej.: Falta la URL de WhatsApp y la fecha final de la promoción.' };
  if (to === 'aprobado') return { title: 'Aprobar brief', lead: `Se aprueba la versión ${version}: queda congelada como alcance del trabajo y el cliente recibe un aviso.`, label: 'Nota para el cliente (opcional)', placeholder: 'Ej.: ¡Listo! Arrancamos el lunes con las piezas.' };
  if (to === 'en_produccion' && from === 'entregado') return { title: 'Reabrir producción', lead: 'Vuelve a producción para corregir piezas ya entregadas. El cliente lo ve en su portal.', label: '¿Qué hay que corregir?', placeholder: 'Ej.: Ajustar el texto legal en las historias 2 y 3.' };
  if (to === 'en_produccion') return { title: 'Pasar a producción', lead: 'El equipo empieza a crear las piezas. El cliente ve su solicitud en producción.', label: 'Nota para el cliente (opcional)' };
  if (to === 'entregado') return { title: 'Marcar entregado', lead: 'Marcalo cuando las piezas estén compartidas para la revisión del cliente (pestaña Entregables del proyecto).', label: 'Nota para el cliente (opcional)' };
  if (to === 'cerrado') return { title: 'Cerrar requerimiento', lead: 'El requerimiento queda finalizado: ya no admite cambios ni comentarios.', label: 'Nota de cierre (opcional)' };
  if (to === 'cancelado') return { title: 'Cancelar brief', lead: 'El brief no se va a producir. Queda en el historial y ya no admite cambios. Al cliente le llega el motivo.', label: 'Motivo de la cancelación', placeholder: 'Ej.: El cliente decidió posponer la promoción.' };
  return { title: BRIEF_ACTIONS[to]?.label ?? 'Cambiar estado', lead: '', label: 'Nota (opcional)' };
}

function TransitionModal({ brief, to, onClose, onDone }) {
  const [run, busy] = useAction();
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const needs = transitionNeedsNote(brief.status, to);
  const copy = transitionCopy(brief.status, to, brief.version);
  const tone = BRIEF_ACTIONS[to]?.tone ?? 'violet';
  const short = needs && note.trim().length < 5;

  async function save(e) {
    e.preventDefault();
    if (short) { setError('Escribí el motivo (mínimo 5 caracteres).'); return; }
    const body = { to };
    if (note.trim()) body.note = note.trim();
    const res = await run(() => api(`/api/briefs/${brief.id}/transition`, { method: 'POST', body }), {
      success: `Brief en «${briefStatusMeta(to).label}»`,
      onError: (err, msg) => setError(err?.data?.field === 'note' ? msg : null),
    });
    if (res) { onDone(res); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={copy.title}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button>
        <button type="submit" form="brief-transition" className={cx('btn', CONFIRM_BTN[tone])} disabled={busy}>{busy ? 'Guardando…' : copy.title}</button>
      </>}>
      <form id="brief-transition" onSubmit={save} className="space-y-4" noValidate>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BriefStatusBadge status={brief.status} /><span className="text-muted" aria-hidden="true">→</span><BriefStatusBadge status={to} />
          <span className="font-mono text-xs text-muted">{brief.code}</span>
        </div>
        {copy.lead && <p className="text-sm text-ink-2">{copy.lead}</p>}
        <Field label={copy.label} error={error}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={2000} value={note} placeholder={copy.placeholder}
            onChange={(e) => { setNote(e.target.value); setError(null); }} aria-required={needs || undefined} aria-invalid={!!error} />}
        </Field>
      </form>
    </Modal>
  );
}

/** Fila de la ficha: etiqueta y valor. */
function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <dt className="flex shrink-0 items-center gap-1.5 text-muted">{Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

/** Ficha del brief: cliente, proyecto, responsable, urgencia y fechas. */
function FichaCard({ brief: b, onPatch, busy }) {
  const closed = BRIEF_FINAL_STATUSES.includes(b.status);
  const client = useResource(`/api/clients/${b.client_id}`);
  const projects = (client.data?.projects ?? []).filter((p) => !p.archived || p.id === b.project_id);
  const [reason, setReason] = useState(null); // null = sin editar el motivo de urgencia
  const editingUrgent = reason !== null;

  async function saveUrgent(e) {
    e.preventDefault();
    if (reason.trim().length < 5) return;
    if (await onPatch({ urgent: true, urgent_reason: reason.trim() }, 'Brief marcado urgente')) setReason(null);
  }

  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="brief-ficha">
      <SectionHead flush id="brief-ficha" icon={ClipboardList} tone="violet" title="Ficha" hint={closed ? 'Cerrado: ya no admite cambios.' : 'Cambios al instante.'} />
      <div className="space-y-3.5 px-4 py-4 sm:px-5">
        <Link to={`/clientes/${b.client_id}`} className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-line-strong hover:bg-surface-2">
          <IconTile icon={Building2} tone="amber" size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold group-hover:text-brand-ink">{b.client_name}</span>
            <span className="block text-xs text-muted">Ver ficha del cliente</span>
          </span>
        </Link>
        <Field label="Proyecto">
          {(id) => (
            <select id={id} className="input" value={b.project_id ?? ''} disabled={closed || busy || !client.data}
              onChange={(e) => onPatch({ project_id: Number(e.target.value) || null }, 'Proyecto actualizado')}>
              <option value="">{client.data ? 'Sin proyecto' : 'Cargando…'}</option>
              {!client.data && b.project_id && <option value={b.project_id}>{b.project_name}</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="Responsable">
          {(id) => <PersonSelect id={id} value={b.owner_id} placeholder="Sin asignar" onChange={(v) => onPatch({ owner_id: v }, 'Responsable actualizado')} />}
        </Field>

        <div className={cx('rounded-xl border p-3', b.urgent ? 'border-coral/40 bg-coral-soft/60' : 'border-line')}>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Flame className={cx('h-4 w-4', b.urgent ? 'text-coral' : 'text-muted-2')} aria-hidden="true" />Urgente</span>
              <span className="block text-xs text-muted">Se salta el plazo mínimo de producción. Pide motivo.</span>
            </span>
            <input type="checkbox" role="switch" aria-checked={b.urgent || editingUrgent} className="peer sr-only" checked={b.urgent || editingUrgent} disabled={closed || busy}
              onChange={(e) => {
                if (e.target.checked) setReason(b.urgent_reason ?? '');
                else if (b.urgent) onPatch({ urgent: false }, 'Ya no es urgente');
                else setReason(null);
              }} />
            <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:shadow-[0_0_0_4px_var(--ring)]', b.urgent || editingUrgent ? 'bg-coral' : 'bg-line-strong')} aria-hidden="true">
              <span className={cx('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform', (b.urgent || editingUrgent) && 'translate-x-5')} />
            </span>
          </label>
          {editingUrgent ? (
            <form onSubmit={saveUrgent} className="mt-3 space-y-2">
              <label htmlFor="brief-urgent-reason" className="label">Motivo de la urgencia</label>
              <input id="brief-urgent-reason" className="input" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: El cliente adelantó la promoción" autoComplete="off" />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReason(null)}>Cancelar</button>
                <button type="submit" className="btn btn-dark btn-sm" disabled={busy || reason.trim().length < 5}>Guardar motivo</button>
              </div>
            </form>
          ) : b.urgent && b.urgent_reason ? (
            <p className="mt-2 flex items-start justify-between gap-2 text-sm text-ink-2">
              <span className="min-w-0 break-words">«{b.urgent_reason}»</span>
              {!closed && <button type="button" className="link shrink-0 text-xs" onClick={() => setReason(b.urgent_reason)}>Editar</button>}
            </p>
          ) : null}
        </div>

        <dl className="divide-y divide-line border-t border-line">
          <Row icon={CalendarDays} label="Envío">{b.send_start ? `${formatDate(b.send_start)}${b.send_end && b.send_end !== b.send_start ? ` → ${formatDate(b.send_end)}` : ''}` : <span className="text-muted-2">Sin fecha</span>}</Row>
          <Row icon={b.created_by?.type === 'cliente' ? Store : UserRound} label="Creado por">
            <span className="block truncate">{b.created_by?.name ?? '—'}{b.created_by?.type === 'cliente' ? ' (cliente)' : ''}</span>
            <span className="block text-xs font-normal text-muted">{formatDateTime(b.created_at)}</span>
          </Row>
          {b.submitted_at && <Row icon={Send} label="Enviado">{timeAgo(b.submitted_at)}</Row>}
          {b.approved_version && <Row icon={Lock} label="Aprobada">v{b.approved_version}{b.approved_at ? ` · ${formatDate(b.approved_at.slice(0, 10))}` : ''}</Row>}
        </dl>
      </div>
    </section>
  );
}

function BriefScreen({ id }) {
  const { data, error, reload, setData } = useResource(`/api/briefs/${id}`);
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  return <BriefDetailView data={data} reload={reload} setData={setData} />;
}

function BriefDetailView({ data, reload, setData }) {
  const { brief: b, events, versions, deliverables, lead_days: leadDays } = data;
  const today = todayKey();
  const editor = useBriefEditor({ brief: b, today, leadDays, urgent: b.urgent });
  const [run, busy] = useAction();
  const [runMeta, metaBusy] = useAction();
  const [runComment, commentBusy] = useAction();
  const toast = useToast();
  const confirm = useConfirm();
  const [transition, setTransition] = useState(null);

  const closed = BRIEF_FINAL_STATUSES.includes(b.status);
  const meta = briefStatusMeta(b.status);
  const observation = b.status === 'observado' ? lastObservation(events) : null;
  const latest = versions[0] ?? null;
  const actions = BRIEF_TEAM_TRANSITIONS[b.status] ?? [];
  const editing = b.editable;

  // Cambios sin guardar: el navegador pregunta antes de cerrar la pestaña.
  const unsaved = editing && editor.dirty;
  useEffect(() => {
    if (!unsaved) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [unsaved]);

  const mergeBrief = (brief) => setData((d) => ({ ...d, brief }));

  async function patchMeta(body, success) {
    const res = await runMeta(() => api(`/api/briefs/${b.id}`, { method: 'PATCH', body }), { success });
    if (res?.brief) { mergeBrief(res.brief); return true; }
    return false;
  }

  async function save({ quiet = false } = {}) {
    const check = editor.prepare('save');
    if (!check.ok) { focusBriefField(check.field); toast('Revisá los campos marcados.', 'error'); return null; }
    const sentKey = editor.key;
    const res = await run(() => api(`/api/briefs/${b.id}`, { method: 'PATCH', body: { ...editor.payload(), if_updated_at: editor.updatedAt } }), {
      success: quiet ? undefined : 'Cambios guardados',
      onError: (err) => focusBriefField(editor.applyError(err)),
    });
    if (!res?.brief) return null;
    editor.markSaved(res.brief, sentKey);
    mergeBrief(res.brief);
    return res.brief;
  }

  async function submit() {
    const check = editor.prepare('submit');
    if (!check.ok) { focusBriefField(check.field); toast('Faltan datos para enviar: revisá los campos marcados.', 'error'); return; }
    const ok = await confirm({
      title: 'Enviar en nombre del cliente',
      message: `Se congela la versión ${b.version + 1} con su huella SHA-256 y el brief pasa a revisión. Al cliente le llega un aviso de que registramos su solicitud.`,
      confirmLabel: 'Enviar brief',
    });
    if (!ok) return;
    let updatedAt = editor.updatedAt;
    if (editor.dirty) {
      const saved = await save({ quiet: true });
      if (!saved) return;
      updatedAt = saved.updated_at;
    }
    const res = await run(() => api(`/api/briefs/${b.id}/submit`, { method: 'POST', body: { if_updated_at: updatedAt } }), {
      onError: (err) => focusBriefField(editor.applyError(err)),
    });
    if (res) {
      toast(`Brief enviado · versión ${res.version} congelada`);
      reload();
    }
  }

  async function reloadLatest() {
    const fresh = await run(() => api(`/api/briefs/${b.id}`));
    if (fresh) { setData(fresh); editor.discard(fresh.brief); }
  }

  async function comment(body, internal) {
    const res = await runComment(() => api(`/api/briefs/${b.id}/comments`, { method: 'POST', body: { body, internal } }), {
      success: internal ? 'Nota interna guardada' : 'Comentario enviado al cliente',
    });
    if (!res) return false;
    setData((d) => ({ ...d, events: res.events }));
    reload(); // el comentario cambia updated_at del brief (bloqueo optimista)
    return true;
  }

  const panelActions = (
    <>
      <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={busy}><Send className="h-4 w-4" />Enviar en nombre del cliente</button>
      <button type="button" className="btn btn-outline w-full" onClick={() => save()} disabled={busy || !editor.dirty}><Save className="h-4 w-4" />{editor.dirty ? 'Guardar cambios' : 'Sin cambios por guardar'}</button>
      <p className={cx('text-center text-xs', editor.dirty ? 'font-semibold text-amber-ink' : 'text-muted')} aria-live="polite">
        {editor.dirty ? 'Tenés cambios sin guardar.' : `Guardado ${timeAgo(b.updated_at)}.`}
      </p>
    </>
  );
  const quickSave = (
    <button type="button" className="btn btn-outline btn-icon shrink-0" onClick={() => save()} disabled={busy || !editor.dirty} aria-label="Guardar cambios" title="Guardar cambios">
      <Save className="h-4 w-4" />
    </button>
  );
  const ficha = <FichaCard brief={b} onPatch={patchMeta} busy={metaBusy} />;
  const timelineCard = (
    <section className="card animate-rise overflow-hidden" aria-labelledby="brief-bitacora">
      <SectionHead flush id="brief-bitacora" icon={MessagesSquare} tone="blue" title="Bitácora y comentarios" hint="El cliente ve los comentarios; las notas internas, no." />
      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <BriefTimeline events={events} audience="team" />
        {closed ? <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">El brief está {meta.label.toLowerCase()}: ya no admite comentarios.</p>
          : <BriefCommentBox audience="team" onSubmit={comment} busy={commentBusy} />}
      </div>
    </section>
  );
  const versionsCard = (
    <section className="card animate-rise overflow-hidden" aria-labelledby="brief-versiones">
      <SectionHead flush id="brief-versiones" icon={History} tone="slate" title="Versiones" hint={versions.length ? 'Cada envío queda congelado con su huella.' : undefined} />
      <BriefVersions briefId={b.id} versions={versions} audience="team" approvedVersion={b.approved_version} />
    </section>
  );
  const deliverablesCard = (
    <section className="card animate-rise overflow-hidden" aria-labelledby="brief-entregables">
      <SectionHead flush id="brief-entregables" icon={PackageCheck} tone="teal" title="Entregables" hint={deliverables.length ? `${deliverables.length} ligados a este brief` : undefined}
        action={b.project_id && <Link to={`/proyectos/${b.project_id}`} className="link tap -my-2 flex items-center text-sm">Proyecto</Link>} />
      <BriefDeliverables deliverables={deliverables} audience="team" />
    </section>
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="animate-rise">
        <Link to="/briefs" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Briefs</Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={ClipboardList} tone={meta.tone} size="lg" className="mt-1 hidden sm:inline-flex" />
            <div className="min-w-0">
              <Link to={`/clientes/${b.client_id}`} className="eyebrow inline-block max-w-full truncate hover:underline">{b.client_name}{b.project_name ? ` · ${b.project_name}` : ''}</Link>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight sm:text-[32px]">{b.title}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="chip tone-slate font-mono">{b.code}</span>
                <BriefStatusBadge status={b.status} />
                {b.version > 0 && <Badge>v{b.version}</Badge>}
                {b.urgent && <Badge tone="red"><Flame className="h-3 w-3" aria-hidden="true" />Urgente</Badge>}
                {b.created_by?.type === 'cliente' && <Badge tone="amber"><Store className="h-3 w-3" aria-hidden="true" />Creado por el cliente</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Link to={briefPrintPath('team', b.id)} className="btn btn-outline"><Printer className="h-4 w-4" />Imprimir / PDF</Link>
          </div>
        </div>
      </header>

      <section className="card card-pad animate-rise" aria-label="Etapas del brief">
        <BriefSteps status={b.status} cancelledFrom={cancelledFrom(events)} />
        {observation && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber/30 bg-amber-soft px-3.5 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-ink">Ajustes pedidos por {observation.actor_name ?? 'el equipo'} · {timeAgo(observation.created_at)}</p>
              {observation.body && <p className="mt-0.5 whitespace-pre-line break-words text-ink-2">{observation.body}</p>}
              <p className="mt-1 text-xs text-muted">El cliente puede corregirlo y reenviarlo desde su portal, o lo ajustás vos y lo enviás en su nombre.</p>
            </div>
          </div>
        )}
        {actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {actions.map((to) => {
              const a = BRIEF_ACTIONS[to];
              return (
                <button key={to} type="button" className={cx('btn', ACTION_BTN[a.tone] ?? 'btn-outline', to === 'cancelado' && 'sm:ml-auto')} onClick={() => setTransition(to)}>
                  {a.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {editing && editor.stale && (
        <div className="card animate-pop flex flex-col gap-3 border-amber/40 bg-amber-soft p-4 sm:flex-row sm:items-center" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-ink" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="font-semibold">Alguien guardó cambios en este brief mientras editabas.</span> Recargá para ver la última versión; lo que escribiste y no guardaste se descarta.
          </p>
          <button type="button" className="btn btn-dark shrink-0" onClick={reloadLatest} disabled={busy}><RotateCcw className="h-4 w-4" />Recargar</button>
        </div>
      )}

      {editing ? (
        <>
          <BriefForm value={editor.draft.data} onChange={editor.setData} title={editor.draft.title} onTitleChange={editor.setTitle}
            errors={editor.errors} showErrors={!!editor.attempt} audience="team" today={today} leadDays={leadDays} urgent={b.urgent}
            asideTop={ficha} actions={panelActions} quickActions={quickSave} disabled={busy} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
            <div className="min-w-0">{timelineCard}</div>
            <div className="min-w-0 space-y-5 xl:space-y-6">{versionsCard}{deliverablesCard}</div>
          </div>
        </>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
          <div className="min-w-0 space-y-5 xl:space-y-6">
            <div className="card animate-rise flex items-start gap-3 p-4">
              <IconTile icon={b.version > 0 ? Lock : Info} tone="slate" size="sm" />
              <div className="min-w-0 text-sm">
                {b.version > 0 ? (
                  <>
                    <p className="font-semibold text-ink">Contenido congelado en la versión {b.version}{b.approved_version === b.version ? ' (aprobada)' : ''}.</p>
                    <p className="mt-0.5 text-muted">
                      {closed ? 'El brief ya no admite cambios.' : b.status === 'enviado' ? 'Para cambiarlo, pedí ajustes: vuelve a ser editable y el cliente lo reenvía.' : 'Para cambiar el alcance, pedí ajustes y se envía una versión nueva.'}
                      {latest && <span className="ml-1 inline-flex items-center gap-1 font-mono text-xs text-muted-2"><Fingerprint className="h-3 w-3" aria-hidden="true" />{shortHash(latest.hash)}</span>}
                    </p>
                  </>
                ) : <p className="text-muted">Este brief se canceló antes de enviarse.</p>}
              </div>
            </div>
            <BriefView data={b.data} locked={b.version > 0} />
            {timelineCard}
          </div>
          <div className="min-w-0 space-y-5 xl:space-y-6">{ficha}{versionsCard}{deliverablesCard}</div>
        </div>
      )}

      {transition && <TransitionModal brief={b} to={transition} onClose={() => setTransition(null)} onDone={(res) => setData((d) => ({ ...d, brief: res.brief, events: res.events }))} />}
    </div>
  );
}

export default function BriefDetail({ params }) {
  if (!params?.id || params.id === 'nuevo') return <NewBrief />;
  return <BriefScreen key={params.id} id={params.id} />;
}
