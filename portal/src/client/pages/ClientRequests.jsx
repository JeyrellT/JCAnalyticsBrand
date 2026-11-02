// Actualizaciones: el cliente pide un cambio o mejora, JC Analytics le pone el monto
// y el cliente lo acepta (queda como cobro en "Pagos") o lo rechaza.
//   ?nueva=1[&proyecto=ID] abre el formulario · ?ver=ID resalta una actualización.
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Plus, CircleCheck, X, Loader2, Info, Send, Undo2, FolderKanban, Clock } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { useLocation, navigate } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, PageLoader, EmptyState, IconTile, Field, useAction, useConfirm, cx } from '../../components/ui.jsx';
import { RequestStatusBadge, useClientCounts, requestPrice, dateOf, plural } from '../components.jsx';

const OPEN = ['cotizada', 'pendiente', 'en_proceso'];

/** Formulario corto: qué necesita, detalle opcional y a qué proyecto va. */
function NewRequestForm({ projects, initialProject, onCancel, onCreated }) {
  const [run, busy] = useAction();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [projectId, setProjectId] = useState(() => {
    if (initialProject && projects.some((p) => String(p.id) === String(initialProject))) return String(initialProject);
    return projects.length === 1 ? String(projects[0].id) : '';
  });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 3) { setError('Contanos en pocas palabras qué necesitás.'); return; }
    setError('');
    const res = await run(() => api('/api/client/requests', {
      method: 'POST', body: { title: title.trim(), detail: detail.trim() || null, project_id: projectId ? Number(projectId) : null },
    }), { success: 'Listo. Te avisamos cuando tenga monto.' });
    if (res) onCreated(res.request);
  }

  return (
    <form onSubmit={submit} className="card animate-rise space-y-4 p-4 ring-1 ring-brand/25 sm:p-6" aria-labelledby="new-request-title">
      <div className="flex items-start gap-3">
        <IconTile icon={Plus} tone="blue" />
        <div className="min-w-0">
          <h2 id="new-request-title" className="font-display text-lg font-bold text-ink">Pedir una actualización</h2>
          <p className="text-sm text-muted">Contanos qué querés cambiar o agregar. Te respondemos con el monto y vos decidís.</p>
        </div>
      </div>
      <Field label="¿Qué necesitás?" error={error}>
        {(id) => (
          <input id={id} className="input" maxLength={120} value={title} autoFocus aria-invalid={error ? true : undefined}
            placeholder="Ej.: Agregar una sección de combos al menú" onChange={(e) => { setTitle(e.target.value); if (error) setError(''); }} />
        )}
      </Field>
      <Field label="Detalles (opcional)" hint="Lo que nos ayude a entenderlo: dónde va, cómo lo imaginás, para cuándo.">
        {(id) => <textarea id={id} className="input" rows={3} maxLength={2000} value={detail} onChange={(e) => setDetail(e.target.value)} />}
      </Field>
      {projects.length > 1 && (
        <Field label="Proyecto">
          {(id) => (
            <select id={id} className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">General (no es de un proyecto en particular)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </Field>
      )}
      {projects.length === 1 && <p className="flex items-center gap-2 text-sm text-muted"><FolderKanban className="h-4 w-4 shrink-0" aria-hidden="true" />Para <span className="font-semibold text-ink">{projects[0].name}</span></p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar pedido
        </button>
      </div>
    </form>
  );
}

/** Lo que pasa con la actualización, en una línea, según su estado. */
function statusHint(r, canApprove) {
  switch (r.status) {
    case 'pendiente': return 'JC Analytics la está revisando para darte el monto.';
    case 'cotizada': return canApprove ? 'Si te parece, aceptala y arrancamos. El cobro queda en Pagos.' : 'Quien aprueba en tu empresa puede aceptarla desde su portal.';
    case 'en_proceso': return r.amount ? 'Aceptada. Ya la estamos trabajando; el cobro está en Pagos.' : 'Ya la estamos trabajando.';
    case 'lista': return r.done_at ? `Terminada el ${dateOf(r.done_at)}.` : 'Terminada.';
    case 'rechazada': return r.closed_note ? `No se hará: ${r.closed_note}` : 'No se hará.';
    case 'cancelada': return 'La retiraste antes de que tuviera monto.';
    default: return null;
  }
}

/** Tarjeta de una actualización con sus acciones (aceptar/rechazar o retirar). */
function RequestCard({ r, canApprove, highlighted, onChanged }) {
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(null);
  const ref = useRef(null);
  const price = requestPrice(r);
  const quoted = r.status === 'cotizada';

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  async function decide(decision) {
    if (decision === 'aceptar') {
      const ok = await confirm({
        title: `¿Aceptás ${price}?`,
        message: `Aceptás “${r.title}” por ${price}. Arrancamos con el trabajo y el cobro queda en tu sección Pagos.`,
        confirmLabel: 'Sí, aceptar',
      });
      if (!ok) return;
    }
    setPending(decision);
    const res = await run(() => api(`/api/client/requests/${r.id}/decision`, {
      method: 'POST', body: { decision, note: note.trim() || null, amount: r.amount, currency: r.currency },
    }), {
      success: decision === 'aceptar' ? '¡Aceptada! Ya arrancamos.' : 'Listo, le avisamos al equipo.',
      onError: (err) => { if (['stale_quote', 'already_decided'].includes(err?.data?.error)) onChanged(); },
    });
    setPending(null);
    if (res) { setRejecting(false); setNote(''); onChanged(res.request); }
  }

  async function retire() {
    const ok = await confirm({ title: '¿Retirar este pedido?', message: `“${r.title}” deja de estar en la lista de JC Analytics.`, confirmLabel: 'Retirar', tone: 'danger' });
    if (!ok) return;
    const res = await run(() => api(`/api/client/requests/${r.id}/cancel`, { method: 'POST' }), { success: 'Pedido retirado' });
    if (res) onChanged(res.request);
  }

  return (
    <li ref={ref} id={`actualizacion-${r.id}`} className={cx('card scroll-mt-28 overflow-hidden transition', quoted && 'ring-1 ring-amber/40', highlighted && 'ring-2 ring-brand')}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={r.status} />
            {r.project_name && <span className="truncate text-xs font-semibold text-brand-ink">{r.project_name}</span>}
          </div>
          <h3 className="mt-1.5 font-display text-[17px] font-bold leading-snug text-ink">{r.title}</h3>
          {r.detail && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink-2">{r.detail}</p>}
          <p className="mt-1.5 text-xs text-muted">Pedida {dateOf(r.created_at)}{r.created_by?.name ? ` por ${r.created_by.type === 'equipo' ? 'JC Analytics' : r.created_by.name}` : ''}</p>
        </div>
        <div className={cx('shrink-0 rounded-2xl px-4 py-3 sm:min-w-[170px] sm:text-right', price ? 'bg-surface-2' : 'border border-dashed border-line-strong')}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Monto</p>
          {price
            ? <p className={cx('num mt-0.5 font-display text-[24px] font-bold leading-tight', r.amount === 0 ? 'text-teal-ink' : 'text-ink')}>{price}</p>
            : <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-muted sm:justify-end"><Clock className="h-4 w-4" aria-hidden="true" />Por definir</p>}
        </div>
      </div>

      {r.quote_note && (r.status === 'cotizada' || r.status === 'en_proceso') && (
        <p className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-ink sm:mx-5"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{r.quote_note}</p>
      )}
      <p className="px-4 pb-3 text-sm text-muted sm:px-5">{statusHint(r, canApprove)}</p>

      {quoted && canApprove && (
        <div className="border-t border-line bg-surface-2/60 p-3 sm:px-5 sm:py-4">
          {rejecting ? (
            <div className="space-y-3">
              <Field label="¿Por qué no? (opcional)" hint="Nos ayuda a proponerte otra opción.">
                {(id) => <textarea id={id} className="input" rows={2} maxLength={1000} value={note} autoFocus onChange={(e) => setNote(e.target.value)} />}
              </Field>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => { setRejecting(false); setNote(''); }} disabled={busy}>Volver</button>
                <button type="button" className="btn btn-outline text-coral-ink" onClick={() => decide('rechazar')} disabled={busy}>
                  {pending === 'rechazar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}Rechazar el monto
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:flex sm:justify-end">
              <button type="button" className="btn btn-outline" onClick={() => setRejecting(true)} disabled={busy}><X className="h-4 w-4" />No, gracias</button>
              <button type="button" className="btn btn-teal" onClick={() => decide('aceptar')} disabled={busy}>
                {pending === 'aceptar' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CircleCheck className="h-5 w-5" />}Aceptar {price}
              </button>
            </div>
          )}
        </div>
      )}
      {r.status === 'pendiente' && (
        <div className="flex justify-end border-t border-line px-3 py-2 sm:px-4">
          <button type="button" className="btn btn-ghost btn-sm tap text-muted" onClick={retire} disabled={busy}><Undo2 className="h-3.5 w-3.5" />Retirar pedido</button>
        </div>
      )}
    </li>
  );
}

export default function ClientRequests() {
  const { account } = useSession();
  const { refreshCounts } = useClientCounts();
  const { query } = useLocation();
  const { data, error, reload, setData } = useResource('/api/client/requests');
  const [formOpen, setFormOpen] = useState(query.get('nueva') === '1');
  const [seenQuery, setSeenQuery] = useState(query.toString());
  // Volver a tocar "Pedir una actualización" estando aquí abre el formulario otra vez.
  if (seenQuery !== query.toString()) {
    setSeenQuery(query.toString());
    if (query.get('nueva') === '1') setFormOpen(true);
  }
  const highlighted = Number(query.get('ver')) || null;
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const canApprove = data.can_approve ?? !!account.can_approve;
  const open = data.requests.filter((r) => OPEN.includes(r.status));
  const history = data.requests.filter((r) => !OPEN.includes(r.status));
  const toDecide = open.filter((r) => r.status === 'cotizada').length;

  const closeForm = () => {
    setFormOpen(false);
    if (query.get('nueva')) navigate('/cliente/actualizaciones', { replace: true });
  };
  const onCreated = (request) => {
    setData((s) => ({ ...s, requests: [request, ...s.requests] }));
    closeForm();
  };
  const onChanged = (request) => {
    if (request) setData((s) => ({ ...s, requests: s.requests.map((r) => (r.id === request.id ? request : r)) }));
    else reload();
    refreshCounts();
  };
  const card = (r) => <RequestCard key={r.id} r={r} canApprove={canApprove} highlighted={highlighted === r.id} onChanged={onChanged} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu proyecto con JC Analytics" title="Actualizaciones" icon={Sparkles} tone="violet"
        subtitle="Pedí cambios o mejoras. Te decimos el monto y vos decidís si lo hacemos."
        actions={!formOpen && <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Pedir una actualización</button>} />

      {formOpen && <NewRequestForm projects={data.projects ?? []} initialProject={query.get('proyecto')} onCancel={closeForm} onCreated={onCreated} />}

      {data.requests.length === 0 && !formOpen ? (
        <EmptyState icon={Sparkles} tone="violet" title="Todavía no pediste actualizaciones"
          action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Pedir la primera</button>}>
          Cuando quieras cambiar o agregar algo a tu proyecto, pedilo aquí. Vas a ver el monto antes de que empecemos.
        </EmptyState>
      ) : (
        <>
          {open.length > 0 && (
            <section aria-labelledby="open-title" className="space-y-3">
              <h2 id="open-title" className="section-title flex items-center gap-2">
                Abiertas<span className="text-sm font-normal text-muted">· {toDecide ? `${plural(toDecide, 'por aprobar', 'por aprobar')}` : plural(open.length, 'actualización', 'actualizaciones')}</span>
              </h2>
              <ul className="stagger space-y-3">{open.map(card)}</ul>
            </section>
          )}
          {history.length > 0 && (
            <section aria-labelledby="history-title" className="space-y-3">
              <h2 id="history-title" className="section-title">Historial</h2>
              <ul className="space-y-3">{history.map(card)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
