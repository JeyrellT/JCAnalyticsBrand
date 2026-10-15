// Portal de clientes (v5) · Solicitud: el brief creativo del lado del cliente.
//   /cliente/solicitudes/nueva → bienvenida + formulario (guardar borrador o enviar)
//   /cliente/solicitudes/:id   → formulario (borrador u observada) o vista congelada,
//                                etapas, comentarios, versiones con huella y entregables.
import { useEffect, useState } from 'react';
import {
  ArrowLeft, ClipboardList, Printer, Send, Save, Lock, AlertTriangle, MessagesSquare, History, PackageCheck, Target, Megaphone,
  Share2, CalendarClock, MessageCircle, Mail, Ban, FolderKanban, Fingerprint, UserRound,
} from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { api } from '../../lib/api.js';
import { Link, navigate } from '../../lib/router.jsx';
import { PageHeader, PageLoader, Badge, Field, IconTile, Modal, SectionHead, useAction, useConfirm, useToast, cx } from '../../components/ui.jsx';
import { BRIEF_CLIENT_CANCELABLE, BRIEF_FINAL_STATUSES, emptyBriefData, earliestSendDate } from '../../../shared/brief.js';
import { BriefForm, focusBriefField } from '../../components/brief/BriefForm.jsx';
import { BriefView } from '../../components/brief/BriefView.jsx';
import { BriefSteps, BriefStatusBadge } from '../../components/brief/BriefSteps.jsx';
import { BriefTimeline, BriefCommentBox } from '../../components/brief/BriefTimeline.jsx';
import { BriefVersions, BriefDeliverables } from '../../components/brief/BriefVersions.jsx';
import { useBriefEditor } from '../../components/brief/useBriefEditor.js';
import { briefPrintPath, cancelledFrom, lastObservation, shortHash } from '../../components/brief/brief-ui.js';
import { formatDate, timeAgo, todayKey, whatsappLink } from '../../lib/format.js';

// La barra superior del portal de clientes es fija: 68 px en el celular y 119 px con las pestañas (≥1024 px).
const CLIENT_STICKY = { stickyTop: 'calc(env(safe-area-inset-top) + 4.75rem)', stickyTopLg: '8rem', asideStickyTop: '8.5rem' };

const API = '/api/client/briefs';
const backLink = (
  <Link to="/cliente/solicitudes" className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition hover:text-ink">
    <ArrowLeft className="h-4 w-4" />Solicitudes
  </Link>
);

/** Aviso del navegador si se cierra la pestaña con cambios sin guardar. */
function useLeaveGuard(active) {
  useEffect(() => {
    if (!active) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [active]);
}

/** Proyecto (opcional) al que se liga la solicitud: solo proyectos que el cliente ve. */
function ProjectPicker({ value, onChange, disabled }) {
  const { data } = useResource('/api/client/projects');
  const projects = (data?.projects ?? []).filter((p) => (!p.archived && p.status !== 'cerrado') || p.id === value);
  if (data && !projects.length) return null;
  return (
    <Field label="Proyecto (opcional)" hint="Si la solicitud es parte de un proyecto con JC Analytics.">
      {(id) => (
        <select id={id} className="input" value={value ?? ''} disabled={disabled || !data} onChange={(e) => onChange(Number(e.target.value) || null)}>
          <option value="">{data ? 'Ninguno en particular' : 'Cargando…'}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </Field>
  );
}

/** Ejecutivo de cuenta: a quién escribir con dudas. */
function ContactCard({ contact, code }) {
  if (!contact) return null;
  const wa = whatsappLink(contact.phone, `Hola ${contact.name.split(' ')[0]}, tengo una consulta sobre ${code ? `la solicitud ${code}` : 'una solicitud'} en el portal.`);
  return (
    <section className="card animate-rise p-4 sm:p-5" aria-labelledby="contacto-ejecutivo">
      <p id="contacto-ejecutivo" className="eyebrow">¿Dudas con el brief?</p>
      <div className="mt-2.5 flex items-center gap-3">
        <IconTile icon={UserRound} tone="teal" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{contact.name}</p>
          <p className="text-xs text-muted">Tu ejecutivo en JC Analytics</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm min-h-9"><MessageCircle className="h-3.5 w-3.5 text-teal-ink" />WhatsApp</a>}
        {contact.email && <a href={`mailto:${contact.email}`} className="btn btn-ghost btn-sm min-h-9"><Mail className="h-3.5 w-3.5" />Correo</a>}
      </div>
    </section>
  );
}

// ── Nueva solicitud ─────────────────────────────────────────────────────────

function ClientBriefNew() {
  const { client, contact, leadDays = 3, today: serverToday } = useSession();
  const today = serverToday ?? todayKey();
  const [initial] = useState(() => ({ title: '', data: emptyBriefData({ brand: client?.name ?? null }) }));
  const editor = useBriefEditor({ brief: null, initial, today, leadDays });
  const [projectId, setProjectId] = useState(null);
  const [run, busy] = useAction();
  const toast = useToast();
  const confirm = useConfirm();
  useLeaveGuard(editor.dirty && !busy);

  async function create(success) {
    const body = { ...editor.payload() };
    if (projectId) body.project_id = projectId;
    return run(() => api(API, { method: 'POST', body }), { success, onError: (err) => focusBriefField(editor.applyError(err)) });
  }

  async function saveDraft() {
    const check = editor.prepare('save');
    if (!check.ok) { focusBriefField(check.field); toast('Revisá los campos marcados.', 'error'); return; }
    const res = await create('Borrador guardado. Podés terminarlo cuando quieras.');
    if (res?.brief) navigate(`/cliente/solicitudes/${res.brief.id}`, { replace: true });
  }

  async function submit() {
    const check = editor.prepare('submit');
    if (!check.ok) { focusBriefField(check.field); toast('Faltan datos para enviar: revisá los campos marcados.', 'error'); return; }
    const ok = await confirm({
      title: 'Enviar solicitud',
      message: 'Se la enviamos al equipo de JC Analytics y queda guardada una copia congelada (versión 1). Si hace falta ajustar algo, te avisamos por aquí.',
      confirmLabel: 'Enviar solicitud',
    });
    if (!ok) return;
    const created = await create();
    if (!created?.brief) return;
    const res = await run(() => api(`${API}/${created.brief.id}/submit`, { method: 'POST', body: { if_updated_at: created.brief.updated_at } }));
    if (res) toast(`¡Listo! Recibimos tu solicitud ${res.brief.code}.`);
    navigate(`/cliente/solicitudes/${created.brief.id}`, { replace: true });
  }

  const items = [
    [Target, 'Qué necesitás y para qué', 'El material (correo, redes, pauta…) y el objetivo.'],
    [Megaphone, 'La oferta y el mensaje', 'Lo que la pieza tiene que comunicar y lograr.'],
    [Share2, 'Dónde sale y a quién', 'Redes, base de datos y los enlaces de destino.'],
    [CalendarClock, 'Cuándo sale', `Pedimos al menos ${leadDays} días de producción: hoy, desde el ${formatDate(earliestSendDate(today, leadDays))}.`],
  ];

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader eyebrow="Brief creativo" title="Nueva solicitud" icon={ClipboardList} tone="violet" back={backLink}
        subtitle="Contanos qué necesitás con el formato CREATIVIDAD de JC Analytics. Con esto arrancamos a producir sin idas y vueltas." />

      <section className="card animate-rise overflow-hidden" aria-labelledby="que-necesitamos">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,17rem)_1fr]">
          <div className="border-b border-line bg-surface-2/70 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <h2 id="que-necesitamos" className="section-title">Lo que nos ayuda a arrancar</h2>
            <p className="mt-1 text-sm text-muted">Son 6 pasos cortos. Los marcados con <span className="font-semibold text-coral-ink">*</span> hacen falta para enviar.</p>
            <p className="mt-2 text-xs text-muted">Podés guardar como borrador y terminarlo después: nadie lo revisa hasta que lo enviés.</p>
          </div>
          <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
            {items.map(([Icon, t, d]) => (
              <li key={t} className="flex gap-3 bg-surface p-4 sm:p-5">
                <IconTile icon={Icon} tone="violet" size="sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{t}</span>
                  <span className="block text-xs leading-relaxed text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BriefForm {...CLIENT_STICKY} value={editor.draft.data} onChange={editor.setData} title={editor.draft.title} onTitleChange={editor.setTitle}
        errors={editor.errors} showErrors={!!editor.attempt} audience="client" today={today} leadDays={leadDays}
        meta={<ProjectPicker value={projectId} onChange={setProjectId} disabled={busy} />}
        asideTop={contact ? <ContactCard contact={contact} /> : null}
        actions={<>
          <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={busy}><Send className="h-4 w-4" />Enviar solicitud</button>
          <button type="button" className="btn btn-outline w-full" onClick={saveDraft} disabled={busy}><Save className="h-4 w-4" />Guardar borrador</button>
          <p className="text-center text-xs text-muted">El borrador queda en «Solicitudes» para terminarlo después.</p>
        </>}
        quickActions={<button type="button" className="btn btn-outline btn-icon shrink-0" onClick={saveDraft} disabled={busy} aria-label="Guardar borrador" title="Guardar borrador"><Save className="h-4 w-4" /></button>}
        disabled={busy} />
    </div>
  );
}

// ── Solicitud existente ─────────────────────────────────────────────────────

function CancelModal({ brief, onClose, onDone }) {
  const [run, busy] = useAction();
  const [note, setNote] = useState('');
  async function cancel(e) {
    e.preventDefault();
    const body = note.trim() ? { note: note.trim() } : {};
    const res = await run(() => api(`${API}/${brief.id}/cancel`, { method: 'POST', body }), { success: 'Solicitud cancelada' });
    if (res) { onDone(res); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title="Cancelar solicitud" size="sm"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button>
        <button type="submit" form="cancelar-solicitud" className="btn btn-danger" disabled={busy}>{busy ? 'Cancelando…' : 'Cancelar solicitud'}</button>
      </>}>
      <form id="cancelar-solicitud" onSubmit={cancel} className="space-y-4">
        <p className="text-sm text-ink-2">
          <span className="font-semibold">{brief.code} · {brief.title}</span> no se va a producir. Queda en tu historial y ya no admite cambios.
          {brief.status !== 'borrador' && ' Le avisamos al equipo de JC Analytics.'}
        </p>
        <Field label="Motivo (opcional)">
          {(id) => <textarea id={id} className="input" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Pospusimos la promoción para noviembre." />}
        </Field>
      </form>
    </Modal>
  );
}

function ClientBriefScreen({ id }) {
  const { data, error, reload, setData } = useResource(`${API}/${id}`);
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  return <ClientBriefView data={data} reload={reload} setData={setData} />;
}

function ClientBriefView({ data, reload, setData }) {
  const { contact, leadDays: sessionLead, today: serverToday } = useSession();
  const { brief: b, events, versions, deliverables } = data;
  const leadDays = data.lead_days ?? sessionLead ?? 3;
  const today = serverToday ?? todayKey();
  const editor = useBriefEditor({ brief: b, today, leadDays, urgent: b.urgent });
  const [run, busy] = useAction();
  const [runMeta, metaBusy] = useAction();
  const [runComment, commentBusy] = useAction();
  const toast = useToast();
  const confirm = useConfirm();
  const [cancelling, setCancelling] = useState(false);
  useLeaveGuard(b.editable && editor.dirty && !busy);

  const closed = BRIEF_FINAL_STATUSES.includes(b.status);
  const cancelable = BRIEF_CLIENT_CANCELABLE.includes(b.status);
  const observation = b.status === 'observado' ? lastObservation(events) : null;
  const latest = versions[0] ?? null;

  async function save({ quiet = false } = {}) {
    const check = editor.prepare('save');
    if (!check.ok) { focusBriefField(check.field); toast('Revisá los campos marcados.', 'error'); return null; }
    const sentKey = editor.key;
    const res = await run(() => api(`${API}/${b.id}`, { method: 'PATCH', body: { ...editor.payload(), if_updated_at: editor.updatedAt } }), {
      success: quiet ? undefined : 'Cambios guardados',
      onError: (err) => focusBriefField(editor.applyError(err)),
    });
    if (!res?.brief) return null;
    editor.markSaved(res.brief, sentKey);
    setData(res);
    return res.brief;
  }

  async function submit() {
    const check = editor.prepare('submit');
    if (!check.ok) { focusBriefField(check.field); toast('Faltan datos para enviar: revisá los campos marcados.', 'error'); return; }
    const ok = await confirm({
      title: b.status === 'observado' ? 'Reenviar solicitud' : 'Enviar solicitud',
      message: `Se la enviamos al equipo de JC Analytics y queda guardada una copia congelada (versión ${b.version + 1}). Si hace falta ajustar algo, te avisamos por aquí.`,
      confirmLabel: b.status === 'observado' ? 'Reenviar' : 'Enviar solicitud',
    });
    if (!ok) return;
    let updatedAt = editor.updatedAt;
    if (editor.dirty) {
      const saved = await save({ quiet: true });
      if (!saved) return;
      updatedAt = saved.updated_at;
    }
    const res = await run(() => api(`${API}/${b.id}/submit`, { method: 'POST', body: { if_updated_at: updatedAt } }), {
      onError: (err) => focusBriefField(editor.applyError(err)),
    });
    if (res) {
      setData(res);
      toast(`¡Listo! Recibimos tu solicitud (versión ${res.version}).`);
    }
  }

  async function reloadLatest() {
    const fresh = await run(() => api(`${API}/${b.id}`));
    if (fresh) { setData(fresh); editor.discard(fresh.brief); }
  }

  async function changeProject(projectId) {
    const res = await runMeta(() => api(`${API}/${b.id}`, { method: 'PATCH', body: { project_id: projectId } }), { success: 'Proyecto actualizado' });
    if (res) setData(res);
  }

  async function comment(body) {
    const res = await runComment(() => api(`${API}/${b.id}/comments`, { method: 'POST', body: { body } }), { success: 'Comentario enviado al equipo' });
    if (!res) return false;
    setData((d) => ({ ...d, events: res.events }));
    reload(); // el comentario cambia la marca de actualización del brief
    return true;
  }

  const timelineCard = (
    <section className="card animate-rise overflow-hidden" aria-labelledby="solicitud-comentarios">
      <SectionHead flush id="solicitud-comentarios" icon={MessagesSquare} tone="blue" title="Comentarios e historial" hint="Lo que pasó con tu solicitud y la conversación con el equipo." />
      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <BriefTimeline events={events} audience="client" />
        {closed ? <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">Esta solicitud está finalizada: ya no admite comentarios.</p>
          : <BriefCommentBox audience="client" onSubmit={comment} busy={commentBusy} />}
      </div>
    </section>
  );
  const sideCards = (
    <>
      <section className="card animate-rise overflow-hidden" aria-labelledby="solicitud-versiones">
        <SectionHead flush id="solicitud-versiones" icon={History} tone="slate" title="Versiones enviadas" hint={versions.length ? 'Cada envío queda congelado con su huella.' : undefined} />
        <BriefVersions briefId={b.id} versions={versions} audience="client" approvedVersion={b.approved_version}
          emptyText="Cuando la enviés, guardamos una copia congelada con su huella digital." />
      </section>
      <section className="card animate-rise overflow-hidden" aria-labelledby="solicitud-entregables">
        <SectionHead flush id="solicitud-entregables" icon={PackageCheck} tone="teal" title="Entregables" />
        <BriefDeliverables deliverables={deliverables} audience="client" />
      </section>
    </>
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="animate-rise">
        {backLink}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Brief creativo · <span className="font-mono">{b.code}</span></p>
            <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight sm:text-[32px]">{b.title}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <BriefStatusBadge status={b.status} audience="client" />
              {b.version > 0 && <Badge>Versión {b.version}</Badge>}
              {b.project_name && <Badge tone="blue"><FolderKanban className="h-3 w-3" aria-hidden="true" />{b.project_name}</Badge>}
              {b.send_start && <span className="text-xs text-muted">Sale el {formatDate(b.send_start)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Link to={briefPrintPath('client', b.id)} className="btn btn-outline"><Printer className="h-4 w-4" />Imprimir / PDF</Link>
            {cancelable && <button type="button" className="btn btn-ghost text-coral-ink hover:bg-coral-soft" onClick={() => setCancelling(true)}><Ban className="h-4 w-4" />Cancelar solicitud</button>}
          </div>
        </div>
      </header>

      <section className="card card-pad animate-rise" aria-label="Etapas de la solicitud">
        <BriefSteps status={b.status} audience="client" cancelledFrom={cancelledFrom(events)} />
        {observation && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber/30 bg-amber-soft px-3.5 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-ink">Te pedimos estos ajustes{observation.actor_name ? ` · ${observation.actor_name}` : ''}</p>
              {observation.body && <p className="mt-0.5 whitespace-pre-line break-words text-ink">{observation.body}</p>}
              <p className="mt-1 text-xs text-muted">Corregí el brief abajo y volvé a enviarlo. {timeAgo(observation.created_at)}.</p>
            </div>
          </div>
        )}
      </section>

      {b.editable && editor.stale && (
        <div className="card animate-pop flex flex-col gap-3 border-amber/40 bg-amber-soft p-4 sm:flex-row sm:items-center" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-ink" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="font-semibold">Alguien más guardó cambios en esta solicitud mientras la editabas.</span> Recargá para ver la última versión; lo que no guardaste se descarta.
          </p>
          <button type="button" className="btn btn-dark shrink-0" onClick={reloadLatest} disabled={busy}>Recargar</button>
        </div>
      )}

      {b.editable ? (
        <>
          <BriefForm {...CLIENT_STICKY} value={editor.draft.data} onChange={editor.setData} title={editor.draft.title} onTitleChange={editor.setTitle}
            errors={editor.errors} showErrors={!!editor.attempt} audience="client" today={today} leadDays={leadDays} urgent={b.urgent}
            meta={<ProjectPicker value={b.project_id} onChange={changeProject} disabled={metaBusy || busy} />}
            asideTop={contact ? <ContactCard contact={contact} code={b.code} /> : null}
            actions={<>
              <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={busy}><Send className="h-4 w-4" />{b.status === 'observado' ? 'Reenviar con los ajustes' : 'Enviar solicitud'}</button>
              <button type="button" className="btn btn-outline w-full" onClick={() => save()} disabled={busy || !editor.dirty}><Save className="h-4 w-4" />{editor.dirty ? 'Guardar cambios' : 'Sin cambios por guardar'}</button>
              <p className={cx('text-center text-xs', editor.dirty ? 'font-semibold text-amber-ink' : 'text-muted')} aria-live="polite">
                {editor.dirty ? 'Tenés cambios sin guardar.' : `Guardado ${timeAgo(b.updated_at)}.`}
              </p>
            </>}
            quickActions={<button type="button" className="btn btn-outline btn-icon shrink-0" onClick={() => save()} disabled={busy || !editor.dirty} aria-label="Guardar cambios" title="Guardar cambios"><Save className="h-4 w-4" /></button>}
            disabled={busy} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
            <div className="min-w-0">{timelineCard}</div>
            <div className="min-w-0 space-y-5 xl:space-y-6">{sideCards}</div>
          </div>
        </>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
          <div className="min-w-0 space-y-5 xl:space-y-6">
            <div className="card animate-rise flex items-start gap-3 p-4">
              <IconTile icon={Lock} tone="slate" size="sm" />
              <div className="min-w-0 text-sm">
                {b.version > 0 ? (
                  <>
                    <p className="font-semibold text-ink">Esta es la versión {b.version} que nos enviaste{b.approved_version === b.version ? ', aprobada' : ''}.</p>
                    <p className="mt-0.5 text-muted">
                      Queda congelada para que los dos trabajemos sobre lo mismo. {!closed && 'Si necesitás cambiar algo, dejanos un comentario.'}
                      {latest && <span className="ml-1 inline-flex items-center gap-1 font-mono text-xs text-muted-2"><Fingerprint className="h-3 w-3" aria-hidden="true" />{shortHash(latest.hash)}</span>}
                    </p>
                  </>
                ) : <p className="text-muted">Esta solicitud se canceló antes de enviarse.</p>}
              </div>
            </div>
            <BriefView data={b.data} locked={b.version > 0} />
            {timelineCard}
          </div>
          <div className="min-w-0 space-y-5 xl:space-y-6">
            {contact && !closed && <ContactCard contact={contact} code={b.code} />}
            {sideCards}
          </div>
        </div>
      )}

      {cancelling && <CancelModal brief={b} onClose={() => setCancelling(false)} onDone={setData} />}
    </div>
  );
}

/**
 * @param {{ params?: { id?: string } }} p  id numérico, o 'nueva' / sin id para crear.
 */
export default function ClientBriefDetail({ params }) {
  const id = params?.id;
  if (!id || id === 'nueva') return <ClientBriefNew key="nueva" />;
  return <ClientBriefScreen key={id} id={id} />;
}
