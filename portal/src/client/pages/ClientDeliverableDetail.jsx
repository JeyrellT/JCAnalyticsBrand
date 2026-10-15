// Detalle de un entregable: abrir la versión, decidir (aprobar o pedir cambios) e historial.
// Se decide sobre la versión exacta que se está viendo (el servidor responde stale_version si cambió).
import { useRef, useState } from 'react';
import {
  PackageCheck, ExternalLink, CircleCheck, PenLine, Send, Layers, History, ClipboardList, FolderKanban, Info, Loader2, ShieldCheck,
} from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, PageLoader, SectionHead, IconTile, RowArrow, Field, useAction, useConfirm, cx } from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/format.js';
import { DELIVERABLE_EVENT_KINDS } from '../../../shared/client-portal.js';
import { BackLink, DeliverableStatusBadge, ExternalAnchor, useClientCounts, dateOf, firstName, safeHref } from '../components.jsx';

const EVENT_META = {
  compartido: { icon: Send, tone: 'blue' },
  nueva_version: { icon: Layers, tone: 'violet' },
  aprobado: { icon: CircleCheck, tone: 'teal' },
  cambios: { icon: PenLine, tone: 'red' },
};

const MIN_NOTE = 5;

/** Panel de decisión: un comentario y dos caminos. Pedir cambios exige contar qué ajustar. */
function DecisionPanel({ d, onDecided }) {
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [pending, setPending] = useState(null);
  const area = useRef(null);

  async function decide(decision) {
    const trimmed = note.trim();
    if (decision === 'cambios' && trimmed.length < MIN_NOTE) {
      setNoteError('Contanos qué te gustaría cambiar (al menos 5 caracteres).');
      area.current?.focus();
      return;
    }
    setNoteError('');
    if (decision === 'aprobado') {
      const ok = await confirm({
        title: `¿Aprobás la versión ${d.version}?`,
        message: `Aprobás la versión ${d.version} de “${d.title}”. El equipo de JC Analytics recibe tu aprobación y queda registrada con la fecha de hoy.`,
        confirmLabel: 'Sí, aprobar',
      });
      if (!ok) return;
    }
    setPending(decision);
    const res = await run(
      () => api(`/api/client/deliverables/${d.id}/decision`, { method: 'POST', body: { decision, note: trimmed || null, version: d.version } }),
      {
        success: decision === 'aprobado' ? `¡Listo! Aprobaste la versión ${d.version}.` : 'Enviamos tus comentarios al equipo. Te avisamos con la versión nueva.',
        onError: (err) => { if (['stale_version', 'already_decided'].includes(err?.data?.error)) onDecided(null); },
      },
    );
    setPending(null);
    if (res) {
      setNote('');
      onDecided(res);
    }
  }

  return (
    <section className="card animate-rise overflow-hidden ring-1 ring-amber/30" aria-labelledby="decision-title">
      <SectionHead flush id="decision-title" icon={PackageCheck} tone="amber" title="Tu decisión" hint={`Sobre la versión ${d.version}`} />
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-sm text-ink-2">Abrí el entregable, revisalo con calma y contanos: ¿está listo o qué ajustarías?</p>
        <Field label="Comentario para el equipo" error={noteError}
          hint="Opcional si aprobás. Si pedís cambios, contanos qué ajustar.">
          {(id) => (
            <textarea id={id} ref={area} className="input" rows={4} maxLength={2000} value={note} aria-invalid={noteError ? true : undefined}
              placeholder="Ej.: El color del botón más oscuro y el logo un poco más grande."
              onChange={(e) => { setNote(e.target.value); if (noteError && e.target.value.trim().length >= MIN_NOTE) setNoteError(''); }} />
          )}
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-teal btn-lg" disabled={busy} onClick={() => decide('aprobado')}>
            {pending === 'aprobado' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CircleCheck className="h-5 w-5" />}Aprobar versión {d.version}
          </button>
          <button type="button" className="btn btn-outline btn-lg" disabled={busy} onClick={() => decide('cambios')}>
            {pending === 'cambios' ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenLine className="h-5 w-5" />}Pedir cambios
          </button>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Tu decisión queda registrada con tu nombre, la fecha y la versión.</p>
      </div>
    </section>
  );
}

/** Resumen de la decisión tomada (aprobado o cambios pedidos). */
function DecisionSummary({ d, mine }) {
  const approved = d.status === 'aprobado';
  const who = mine ? 'Aprobaste' : `${d.decided_by_name ?? 'Tu empresa'} aprobó`;
  const whoChanges = mine ? 'Pediste' : `${d.decided_by_name ?? 'Tu empresa'} pidió`;
  return (
    <section className={cx('animate-rise rounded-2xl border p-4 sm:p-5', approved ? 'border-teal/30 bg-teal-soft' : 'border-coral/25 bg-coral-soft')} aria-label="Decisión">
      <div className="flex items-start gap-3">
        <IconTile icon={approved ? CircleCheck : PenLine} tone={approved ? 'teal' : 'red'} className="bg-surface" />
        <div className="min-w-0">
          <p className={cx('font-semibold', approved ? 'text-teal-ink' : 'text-coral-ink')}>
            {approved ? `${who} la versión ${d.version}` : `${whoChanges} cambios en la versión ${d.version}`}
            {d.decided_at && <span className="font-normal"> · {dateOf(d.decided_at)}</span>}
          </p>
          {d.decision_note && <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-sm italic text-ink-2">“{d.decision_note}”</blockquote>}
          <p className="mt-2 text-sm text-ink-2">
            {approved ? 'Gracias. El equipo sigue con el siguiente paso.' : 'El equipo está preparando una versión nueva con tus comentarios. Te avisamos cuando esté lista para revisar.'}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function ClientDeliverableDetail({ params }) {
  const { account, client, contact } = useSession();
  const { refreshCounts } = useClientCounts();
  const { data, error, reload, setData } = useResource(`/api/client/deliverables/${params.id}`);
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { deliverable: d, events, can_approve: canApprove } = data;
  const url = safeHref(d.url);
  const onDecided = (res) => {
    if (res) setData((s) => ({ ...s, deliverable: res.deliverable, events: res.events }));
    else reload();
    refreshCounts();
  };
  const history = [...events].reverse();

  return (
    <div className="space-y-6">
      <PageHeader back={<BackLink to="/cliente/entregables">Entregables</BackLink>} eyebrow={d.project_name ?? 'Entregable'} title={d.title}
        icon={PackageCheck} tone="amber" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise p-4 sm:p-6" aria-label="Versión compartida">
            <div className="flex flex-wrap items-center gap-2">
              <DeliverableStatusBadge status={d.status} />
              <span className="chip tone-slate">Versión {d.version}</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Compartido por <span className="font-semibold text-ink">{d.shared_by_name ?? 'JC Analytics'}</span> el {dateOf(d.shared_at)}
            </p>
            {d.description && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{d.description}</p>}
            {url ? (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <ExternalAnchor href={url} className="btn btn-primary btn-lg">
                  Abrir entregable<ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">(se abre en otra pestaña)</span>
                </ExternalAnchor>
                <p className="text-xs text-muted">Se abre en otra pestaña. Revisalo y volvé aquí para decidir.</p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">Este entregable no tiene un enlace. Tu ejecutivo te lo comparte por otro medio.</p>
            )}
            {d.brief_id && (
              <Link to={`/cliente/solicitudes/${d.brief_id}`} className="group mt-5 flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 transition hover:border-line-strong">
                <IconTile icon={ClipboardList} tone="violet" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Responde a tu solicitud</span>
                  <span className="block truncate text-sm font-semibold text-ink">{d.brief_code} · {d.brief_title}</span>
                </span>
                <RowArrow />
              </Link>
            )}
          </section>

          {d.status === 'en_revision' && canApprove && <DecisionPanel key={`${d.id}-${d.version}`} d={d} onDecided={onDecided} />}
          {d.status === 'en_revision' && !canApprove && (
            <section className="animate-rise flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:p-5" aria-label="Aprobación">
              <IconTile icon={Info} tone="blue" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">Esta versión espera la aprobación de {client?.name ?? 'tu empresa'}</p>
                <p className="mt-1 text-ink-2">
                  Podés abrirla y revisarla. La decisión la toma una persona autorizada de tu empresa.
                  {contact ? <> Si creés que deberías poder aprobar, pedíselo a {firstName(contact.name)}, tu ejecutivo de cuenta.</> : ' Si creés que deberías poder aprobar, pedíselo a tu ejecutivo de cuenta.'}
                </p>
              </div>
            </section>
          )}
          {d.status !== 'en_revision' && <DecisionSummary d={d} mine={d.decided_by_account === account.id} />}
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Historial y proyecto">
          <section className="card animate-rise overflow-hidden" aria-labelledby="history-title">
            <SectionHead flush id="history-title" icon={History} tone="slate" title="Historial" hint="Cada versión y cada decisión" />
            {history.length === 0 ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Sin movimientos todavía.</p> : (
              <ol className="px-4 py-5 sm:px-5">
                {history.map((e, i) => {
                  const meta = EVENT_META[e.kind] ?? EVENT_META.compartido;
                  return (
                    <li key={e.id} className={cx('relative flex gap-3', i < history.length - 1 && 'pb-5')}>
                      {i < history.length - 1 && <span className="absolute bottom-0 left-4 top-9 w-px bg-line" aria-hidden="true" />}
                      <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-ink">{DELIVERABLE_EVENT_KINDS[e.kind] ?? e.kind} <span className="font-normal text-muted">· v{e.version}</span></p>
                        <p className="text-xs text-muted"><span className="font-medium text-ink-2">{e.actor_name ?? (e.actor_type === 'equipo' ? 'JC Analytics' : 'Tu empresa')}</span> · <span className="first-letter:uppercase">{formatDateTime(e.created_at)}</span></p>
                        {e.note && <p className="mt-1.5 rounded-xl rounded-tl-sm bg-surface-2 px-3 py-2 text-sm text-ink-2">{e.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {d.project_id && (
            <Link to={`/cliente/proyectos/${d.project_id}`} className="card card-hover group animate-rise flex items-center gap-3.5 p-4 sm:p-5">
              <IconTile icon={FolderKanban} tone="blue" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Proyecto</span>
                <span className="block truncate font-semibold text-ink">{d.project_name}</span>
              </span>
              <RowArrow />
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
