// Portal simple del cliente, lado del EQUIPO (ficha del cliente → "Portal del cliente"):
//   · Actualizaciones: lo que el cliente pidió. Socios y admin ponen el monto (o "sin costo");
//     el cliente lo acepta desde su portal y nace el cobro en Pagos.
//   · Pagos: lo que el cliente debe y lo que pagó. Socios y admin registran pagos (fecha y
//     referencia SINPE), agregan cobros manuales, ajustan, anulan o deshacen con motivo.
// Todo el equipo ve; quien no es socio ni admin ve los botones de dinero deshabilitados con la razón.
import { useState } from 'react';
import {
  Sparkles, Plus, CircleCheck, X, Pencil, Wallet, Receipt, Repeat, History, Undo2, Ban, MessageCircle, Landmark, CalendarClock,
  ChevronDown, Info, HandCoins,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { Badge, Modal, Field, Select, IconTile, EmptyState, useAction, useConfirm, cx } from './ui.jsx';
import { MoneyInput } from './common.jsx';
import { Callout, Layer } from './portal-project.jsx';
import { REQUEST_STATUS, totalsByCurrency, totalsText } from '../../shared/client-portal.js';
import { formatMoney, formatDate, dayKey, todayKey, daysUntil } from '../lib/format.js';

const SMALL_BTN = 'btn btn-sm max-sm:min-h-11';
const MONEY_ONLY = 'Solo socios y la administración manejan montos y pagos.';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

const priceOf = (r) => (r.amount == null ? null : r.amount === 0 ? 'Sin costo' : formatMoney(r.amount, r.currency ?? 'CRC'));

function RequestBadge({ status }) {
  const meta = REQUEST_STATUS[status];
  return meta ? <Badge tone={meta.tone} dot>{meta.label}</Badge> : null;
}

/** Motivo obligatorio (descartar, anular o deshacer): un textarea y confirmar. */
function ReasonModal({ title, label, hint, confirmLabel, tone = 'danger', min = 5, onClose, onSubmit }) {
  const [run, busy] = useAction();
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= min;
  async function save(e) {
    e.preventDefault();
    if (!ok) return;
    if (await run(() => onSubmit(reason.trim()))) onClose();
  }
  return (
    <Modal open onClose={onClose} title={title} size="sm"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="reason-form" className={cx('btn', tone === 'danger' ? 'btn-danger' : 'btn-primary')} disabled={busy || !ok}>{busy ? 'Guardando…' : confirmLabel}</button>
      </>}>
      <form id="reason-form" onSubmit={save} className="space-y-3">
        <Field label={label} hint={hint ?? `Mínimo ${min} caracteres. Queda en la bitácora.`}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} required />}
        </Field>
      </form>
    </Modal>
  );
}

// ── Actualizaciones ─────────────────────────────────────────────────────────

/** Poner o cambiar el monto. "Sin costo" la arranca de una vez, sin cobro. */
function QuoteModal({ request: r, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [free, setFree] = useState(r.amount === 0);
  const [amount, setAmount] = useState(r.amount > 0 ? r.amount : null);
  const [currency, setCurrency] = useState(r.currency ?? 'CRC');
  const [note, setNote] = useState(r.quote_note ?? '');
  const valid = free || amount > 0;
  async function save(e) {
    e.preventDefault();
    if (!valid) return;
    const res = await run(() => api(`/api/client-requests/${r.id}/quote`, { method: 'POST', body: { amount: free ? 0 : amount, currency, note: clean(note) } }),
      { success: free ? 'Marcada sin costo: ya está en proceso' : 'Monto enviado: el cliente lo aprueba desde su portal' });
    if (res) { onSaved(); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title={r.amount != null ? 'Cambiar monto' : 'Poner monto'}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="quote-form" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Enviando…' : free ? 'Hacerla sin costo' : 'Enviar monto al cliente'}</button>
      </>}>
      <form id="quote-form" onSubmit={save} className="space-y-4">
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-sm font-semibold text-ink">{r.title}</p>
          {r.detail && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-muted">{r.detail}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="¿Tiene costo?">
          {[[false, 'Con costo'], [true, 'Sin costo']].map(([value, label]) => (
            <button key={label} type="button" role="radio" aria-checked={free === value} onClick={() => setFree(value)}
              className={cx('chip tap border px-3 text-sm', free === value ? 'border-brand bg-brand-soft font-semibold text-brand-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}>{label}</button>
          ))}
        </div>
        {!free && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Monto">{(id) => <MoneyInput key={currency} id={id} currency={currency} value={amount} onChange={setAmount} />}</Field>
            <Field label="Moneda">
              {(id) => <select id={id} className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="CRC">Colones (₡)</option><option value="USD">Dólares ($)</option></select>}
            </Field>
          </div>
        )}
        <Field label="Qué incluye (opcional)" hint="El cliente lo ve junto al monto.">
          {(id) => <textarea id={id} className="input" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Diseño, carga de 6 combos y publicación." />}
        </Field>
        <Callout tone={free ? 'teal' : 'blue'} icon={Info}>
          {free ? 'Pasa a "En proceso" de una vez y el cliente recibe el aviso. No genera cobro.' : 'El cliente recibe el aviso y la acepta desde su portal. Al aceptarla, el cobro queda "por pagar" en Pagos.'}
        </Callout>
      </form>
    </Modal>
  );
}

/** El equipo registra una actualización que el cliente pidió por WhatsApp o en una reunión. */
function NewRequestModal({ clientId, projects, canBill, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState({ title: '', detail: '', project_id: projects.length === 1 ? String(projects[0].id) : '', amount: null, currency: 'CRC' });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim().length >= 3;
  async function save(e) {
    e.preventDefault();
    if (!valid) return;
    const body = { title: form.title.trim(), detail: clean(form.detail), project_id: form.project_id ? Number(form.project_id) : null };
    if (canBill && form.amount > 0) Object.assign(body, { amount: form.amount, currency: form.currency });
    const res = await run(() => api(`/api/clients/${clientId}/requests`, { method: 'POST', body }),
      { success: body.amount ? 'Registrada con monto: el cliente la aprueba desde su portal' : 'Actualización registrada' });
    if (res) { onSaved(); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar actualización"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="new-request-form" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Guardando…' : 'Registrar'}</button>
      </>}>
      <form id="new-request-form" onSubmit={save} className="space-y-4">
        <Field label="¿Qué pidió el cliente?">{(id) => <input id={id} className="input" maxLength={120} value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Cambiar las fotos del menú" required />}</Field>
        <Field label="Detalle (opcional)">{(id) => <textarea id={id} className="input" rows={2} maxLength={2000} value={form.detail} onChange={(e) => set('detail')(e.target.value)} />}</Field>
        <Field label="Proyecto">
          {(id) => <Select id={id} options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id} onChange={set('project_id')} placeholder="General (sin proyecto)" />}
        </Field>
        {canBill && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Monto (opcional)" hint="Si lo ponés, el cliente lo ve para aprobarlo.">{(id) => <MoneyInput key={form.currency} id={id} currency={form.currency} value={form.amount} onChange={set('amount')} />}</Field>
            <Field label="Moneda">
              {(id) => <select id={id} className="input" value={form.currency} onChange={(e) => set('currency')(e.target.value)}><option value="CRC">Colones (₡)</option><option value="USD">Dólares ($)</option></select>}
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}

function RequestItem({ r, canBill, busy, onQuote, onAcceptedOutside, onDone, onReject }) {
  const price = priceOf(r);
  const by = r.created_by?.type === 'cliente' ? `Pidió ${r.created_by.name}` : `Registró ${r.created_by?.name ?? 'el equipo'}`;
  const notes = [
    r.quote_note && ['Cotización', r.quote_note],
    r.decision_note && [r.status === 'rechazada' ? 'El cliente dijo' : 'Nota del cliente', r.decision_note],
    r.closed_note && [r.status === 'rechazada' ? 'Motivo' : 'Cierre', r.closed_note],
  ].filter(Boolean);
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <IconTile icon={Sparkles} tone={REQUEST_STATUS[r.status]?.tone ?? 'slate'} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold leading-snug text-ink">{r.title}</p>
            <RequestBadge status={r.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted">{[r.project_name, `${by} · ${formatDate(dayKey(r.created_at))}`, r.decided_by_name && r.status === 'en_proceso' && `Aceptó ${r.decided_by_name}`].filter(Boolean).join(' · ')}</p>
          {r.detail && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink-2">{r.detail}</p>}
          {notes.map(([label, text]) => <p key={label} className="mt-1 text-xs text-ink-2"><span className="font-semibold">{label}:</span> {text}</p>)}
        </div>
        <p className={cx('num shrink-0 text-right font-display text-[16px] font-bold', price ? 'text-ink' : 'text-muted')}>{price ?? 'Sin monto'}</p>
      </div>
      {['pendiente', 'cotizada', 'en_proceso'].includes(r.status) && (
        <div className="mt-2.5 flex flex-wrap justify-end gap-2">
          {r.status === 'pendiente' && (
            <button type="button" className={cx(SMALL_BTN, 'btn-primary')} onClick={onQuote} disabled={!canBill || busy} title={canBill ? undefined : MONEY_ONLY}><HandCoins className="h-3.5 w-3.5" />Poner monto</button>
          )}
          {r.status === 'cotizada' && (
            <>
              <button type="button" className={cx(SMALL_BTN, 'btn-outline')} onClick={onQuote} disabled={!canBill || busy} title={canBill ? undefined : MONEY_ONLY}><Pencil className="h-3.5 w-3.5" />Cambiar monto</button>
              <button type="button" className={cx(SMALL_BTN, 'btn-outline')} onClick={onAcceptedOutside} disabled={!canBill || busy} title={canBill ? 'El cliente aceptó por WhatsApp o en persona' : MONEY_ONLY}><MessageCircle className="h-3.5 w-3.5" />Aceptó por WhatsApp</button>
            </>
          )}
          {r.status === 'en_proceso' && <button type="button" className={cx(SMALL_BTN, 'btn-teal')} onClick={onDone} disabled={busy}><CircleCheck className="h-3.5 w-3.5" />Marcar lista</button>}
          {r.status !== 'en_proceso' && <button type="button" className={cx(SMALL_BTN, 'btn-ghost text-muted')} onClick={onReject} disabled={busy}><X className="h-3.5 w-3.5" />Descartar</button>}
        </div>
      )}
      {r.status === 'pendiente' && !canBill && <p className="mt-2 text-right text-xs text-muted">{MONEY_ONLY}</p>}
    </li>
  );
}

/** Pestaña "Actualizaciones" del portal del cliente (equipo). */
export function RequestsPanel({ client, requests, projects, canBill, onReload }) {
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [modal, setModal] = useState(null); // { kind: 'new' | 'quote' | 'reject', request? }
  const [showClosed, setShowClosed] = useState(false);
  const open = requests.filter((r) => ['pendiente', 'cotizada', 'en_proceso'].includes(r.status));
  const closed = requests.filter((r) => !open.includes(r));
  const toQuote = open.filter((r) => r.status === 'pendiente').length;
  const waiting = open.filter((r) => r.status === 'cotizada').length;
  const openProjects = projects.filter((p) => !p.archived && !['cerrado', 'prospecto'].includes(p.status));

  async function acceptedOutside(r) {
    const ok = await confirm({ title: '¿El cliente la aceptó?', message: `Registrás que ${client.name} aceptó "${r.title}" por ${priceOf(r)} fuera del portal. Pasa a "En proceso" y el cobro queda por pagar.`, confirmLabel: 'Sí, la aceptó' });
    if (ok && await run(() => api(`/api/client-requests/${r.id}/status`, { method: 'POST', body: { to: 'en_proceso' } }), { success: 'Aceptada: el cobro quedó en Pagos' })) onReload();
  }
  async function done(r) {
    const ok = await confirm({ title: '¿Actualización lista?', message: `"${r.title}" pasa a lista y ${client.name} recibe el aviso en su portal.`, confirmLabel: 'Marcar lista' });
    if (ok && await run(() => api(`/api/client-requests/${r.id}/status`, { method: 'POST', body: { to: 'lista' } }), { success: 'Marcada como lista' })) onReload();
  }
  const item = (r) => (
    <RequestItem key={r.id} r={r} canBill={canBill} busy={busy} onQuote={() => setModal({ kind: 'quote', request: r })}
      onAcceptedOutside={() => acceptedOutside(r)} onDone={() => done(r)} onReject={() => setModal({ kind: 'reject', request: r })} />
  );

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted">
          {open.length ? [toQuote && `${toQuote} por poner monto`, waiting && `${waiting} esperando al cliente`].filter(Boolean).join(' · ') || plural(open.length, 'en proceso', 'en proceso') : 'El cliente las pide desde su portal'}
          {'. '}Vos ponés el monto; el cliente lo acepta y queda en Pagos.
        </p>
        <button type="button" className="btn btn-soft shrink-0" onClick={() => setModal({ kind: 'new' })}><Plus className="h-4 w-4" />Registrar actualización</button>
      </div>
      {requests.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={Sparkles} tone="violet" title="Sin actualizaciones todavía">
            Cuando el cliente pida un cambio desde su portal, llega aquí y te avisamos para que le pongás el monto.
          </EmptyState>
        </div>
      ) : (
        <>
          {open.length > 0 ? <ul className="divide-y divide-line">{open.map(item)}</ul>
            : <p className="px-4 py-4 text-sm text-muted sm:px-5">No hay actualizaciones abiertas.</p>}
          {closed.length > 0 && (
            <>
              <button type="button" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed}
                className="flex w-full items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted hover:text-ink sm:px-5">
                Cerradas · {closed.length}<ChevronDown className={cx('h-4 w-4 transition', showClosed && 'rotate-180')} aria-hidden="true" />
              </button>
              {showClosed && <ul className="divide-y divide-line border-t border-line">{closed.map(item)}</ul>}
            </>
          )}
        </>
      )}
      {modal?.kind === 'new' && <Layer><NewRequestModal clientId={client.id} projects={openProjects} canBill={canBill} onClose={() => setModal(null)} onSaved={onReload} /></Layer>}
      {modal?.kind === 'quote' && <Layer><QuoteModal request={modal.request} onClose={() => setModal(null)} onSaved={onReload} /></Layer>}
      {modal?.kind === 'reject' && (
        <Layer>
          <ReasonModal title="Descartar actualización" label="¿Por qué no se hace?" hint="El cliente ve este motivo en su portal." confirmLabel="Descartar"
            onClose={() => setModal(null)}
            onSubmit={async (note) => { const res = await api(`/api/client-requests/${modal.request.id}/status`, { method: 'POST', body: { to: 'rechazada', note } }); onReload(); return res; }} />
        </Layer>
      )}
    </>
  );
}

// ── Pagos ───────────────────────────────────────────────────────────────────

/** Nuevo cobro (o pago recibido directo) y edición de un cobro pendiente. */
function PaymentModal({ clientId, payment, projects, received = false, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    concept: payment?.concept ?? '', amount: payment?.amount ?? null, currency: payment?.currency ?? 'CRC',
    due_date: payment?.due_date ?? todayKey(), project_id: payment?.project_id ? String(payment.project_id) : '', note: payment?.note ?? '',
    paid: received, reference: '',
  }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const scheduled = payment?.source === 'programado';
  const valid = form.concept.trim().length >= 2 && form.amount > 0 && form.due_date;
  async function save(e) {
    e.preventDefault();
    if (!valid) return;
    const body = { concept: form.concept.trim(), amount: form.amount, currency: form.currency, note: clean(form.note) };
    if (!scheduled) body.due_date = form.due_date;
    if (!payment) {
      body.project_id = form.project_id ? Number(form.project_id) : null;
      if (form.paid) Object.assign(body, { paid_date: form.due_date, reference: clean(form.reference) });
    }
    const res = await run(() => api(payment ? `/api/client-payments/${payment.id}` : `/api/clients/${clientId}/payments`, { method: payment ? 'PATCH' : 'POST', body }),
      { success: payment ? 'Cobro actualizado' : form.paid ? 'Pago registrado: el cliente recibe el aviso' : 'Cobro agregado: el cliente lo ve en Pagos' });
    if (res) { onSaved(); onClose(); }
  }
  const title = payment ? 'Editar cobro' : form.paid ? 'Registrar pago recibido' : 'Nuevo cobro';
  return (
    <Modal open onClose={onClose} title={title}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="payment-form" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Guardando…' : payment ? 'Guardar' : form.paid ? 'Registrar pago' : 'Agregar cobro'}</button>
      </>}>
      <form id="payment-form" onSubmit={save} className="space-y-4">
        <Field label="Concepto" hint="El cliente lo ve tal cual.">{(id) => <input id={id} className="input" maxLength={160} value={form.concept} onChange={(e) => set('concept')(e.target.value)} placeholder="Ej.: Hosting anual 2027" required />}</Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Monto">{(id) => <MoneyInput key={form.currency} id={id} currency={form.currency} value={form.amount} onChange={set('amount')} />}</Field>
          <Field label="Moneda">
            {(id) => <select id={id} className="input" value={form.currency} onChange={(e) => set('currency')(e.target.value)}><option value="CRC">Colones (₡)</option><option value="USD">Dólares ($)</option></select>}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={form.paid ? 'Fecha del pago' : 'Vence'} hint={scheduled ? 'Sale del cobro programado del proyecto.' : undefined}>
            {(id) => <input id={id} type="date" className="input" value={form.due_date} max={form.paid ? todayKey() : undefined} disabled={scheduled} onChange={(e) => set('due_date')(e.target.value)} required />}
          </Field>
          {!payment && (
            <Field label="Proyecto">
              {(id) => <Select id={id} options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id} onChange={set('project_id')} placeholder="General (sin proyecto)" />}
            </Field>
          )}
        </div>
        {!payment && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="¿Ya está pagado?">
            {[[false, 'Queda por pagar'], [true, 'Ya lo pagó']].map(([value, label]) => (
              <button key={label} type="button" role="radio" aria-checked={form.paid === value} onClick={() => set('paid')(value)}
                className={cx('chip tap border px-3 text-sm', form.paid === value ? 'border-brand bg-brand-soft font-semibold text-brand-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}>{label}</button>
            ))}
          </div>
        )}
        {form.paid && !payment && <Field label="Referencia (opcional)">{(id) => <input id={id} className="input" maxLength={80} value={form.reference} onChange={(e) => set('reference')(e.target.value)} placeholder="Ej.: SINPE 12345678" />}</Field>}
        <Field label="Nota (opcional)" hint="El cliente la ve junto al cobro.">{(id) => <textarea id={id} className="input" rows={2} maxLength={500} value={form.note} onChange={(e) => set('note')(e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

/** Registrar que el cliente pagó un cobro: fecha (hoy por defecto) y referencia. */
function PayModal({ payment: p, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [paidDate, setPaidDate] = useState(todayKey());
  const [reference, setReference] = useState('');
  async function save(e) {
    e.preventDefault();
    const res = await run(() => api(`/api/client-payments/${p.id}/pay`, { method: 'POST', body: { paid_date: paidDate, reference: clean(reference) } }),
      { success: 'Pago registrado: el cliente recibe el aviso' });
    if (res) { onSaved(); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar pago" size="sm"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="pay-form" className="btn btn-teal" disabled={busy || !paidDate}><CircleCheck className="h-4 w-4" />{busy ? 'Guardando…' : 'Registrar pago'}</button>
      </>}>
      <form id="pay-form" onSubmit={save} className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="min-w-0 text-sm font-semibold text-ink">{p.concept}</p>
          <p className="num shrink-0 font-display font-bold">{formatMoney(p.amount, p.currency)}</p>
        </div>
        <Field label="Fecha del pago">{(id) => <input id={id} type="date" className="input" value={paidDate} max={todayKey()} onChange={(e) => setPaidDate(e.target.value)} required />}</Field>
        <Field label="Referencia (opcional)" hint="SINPE, transferencia o recibo.">{(id) => <input id={id} className="input" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej.: SINPE 12345678" />}</Field>
      </form>
    </Modal>
  );
}

const SOURCE_LABEL = { actualizacion: 'Actualización', programado: 'Programado', manual: 'Cobro manual' };

function PaymentItem({ p, canBill, busy, onPay, onEdit, onVoid, onReopen }) {
  const due = p.status === 'pagado'
    ? `Pagado el ${formatDate(p.paid_date)}${p.reference ? ` · Ref. ${p.reference}` : ''}`
    : p.status === 'anulado' ? `Anulado: ${p.void_reason ?? ''}`
      : (() => { const d = daysUntil(p.due_date); return d < 0 ? `Venció hace ${-d} d · ${formatDate(p.due_date)}` : d === 0 ? 'Vence hoy' : `Vence el ${formatDate(p.due_date)}`; })();
  const tone = p.status === 'pagado' ? 'teal' : p.status === 'anulado' ? 'slate' : p.overdue ? 'red' : 'amber';
  return (
    <li className={cx('flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5', p.status === 'anulado' && 'opacity-70')}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconTile icon={p.status === 'pagado' ? CircleCheck : p.status === 'anulado' ? Ban : p.source === 'programado' ? Repeat : Receipt} tone={tone} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={cx('text-sm font-semibold leading-snug text-ink', p.status === 'anulado' && 'line-through')}>{p.concept}</p>
          <p className="truncate text-xs text-muted">{[SOURCE_LABEL[p.source], p.project_name, p.recorded_by_name && p.status !== 'pendiente' && `por ${p.recorded_by_name}`].filter(Boolean).join(' · ')}</p>
          <p className={cx('text-xs font-semibold', tone === 'red' ? 'text-coral-ink' : tone === 'teal' ? 'text-teal-ink' : tone === 'amber' ? 'text-amber-ink' : 'text-muted')}>{due}</p>
        </div>
        <p className="num shrink-0 font-display text-[16px] font-bold text-ink">{formatMoney(p.amount, p.currency)}</p>
      </div>
      {p.status !== 'anulado' && (
        <div className="flex flex-wrap justify-end gap-1.5 sm:shrink-0">
          {p.status === 'pendiente' ? (
            <>
              <button type="button" className={cx(SMALL_BTN, 'btn-teal')} onClick={onPay} disabled={!canBill || busy} title={canBill ? undefined : MONEY_ONLY}><CircleCheck className="h-3.5 w-3.5" />Registrar pago</button>
              <button type="button" className="btn btn-ghost btn-icon tap text-muted hover:text-ink" onClick={onEdit} disabled={!canBill || busy} aria-label={`Editar "${p.concept}"`} title={canBill ? 'Editar' : MONEY_ONLY}><Pencil className="h-4 w-4" /></button>
              <button type="button" className="btn btn-ghost btn-icon tap text-muted hover:text-coral-ink" onClick={onVoid} disabled={!canBill || busy} aria-label={`Anular "${p.concept}"`} title={canBill ? 'Anular' : MONEY_ONLY}><Ban className="h-4 w-4" /></button>
            </>
          ) : (
            <button type="button" className={cx(SMALL_BTN, 'btn-ghost text-muted')} onClick={onReopen} disabled={!canBill || busy} title={canBill ? 'Si se registró por error' : MONEY_ONLY}><Undo2 className="h-3.5 w-3.5" />Deshacer</button>
          )}
        </div>
      )}
    </li>
  );
}

/** Pestaña "Pagos" del portal del cliente (equipo). billing = { payments, summary, upcoming, payment_info }. */
export function PaymentsPanel({ client, billing, projects, canBill, onReload }) {
  const { user } = useSession();
  const [modal, setModal] = useState(null); // { kind, payment? }
  const [showVoid, setShowVoid] = useState(false);
  const { payments = [], summary, upcoming = [], payment_info: paymentInfo } = billing ?? {};
  const pending = payments.filter((p) => p.status === 'pendiente');
  const paid = payments.filter((p) => p.status === 'pagado');
  const voided = payments.filter((p) => p.status === 'anulado');
  const overdue = pending.filter((p) => p.overdue);
  const clientProjects = projects.filter((p) => p.status !== 'prospecto');
  const item = (p) => (
    <PaymentItem key={p.id} p={p} canBill={canBill} busy={false} onPay={() => setModal({ kind: 'pay', payment: p })} onEdit={() => setModal({ kind: 'edit', payment: p })}
      onVoid={() => setModal({ kind: 'void', payment: p })} onReopen={() => setModal({ kind: 'reopen', payment: p })} />
  );
  const close = () => setModal(null);
  const post = (path, body) => api(path, { method: 'POST', body }).then((res) => { onReload(); return res; });

  return (
    <>
      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
        {[
          ['Por cobrar', totalsText(totalsByCurrency(pending)), plural(pending.length, 'pendiente', 'pendientes'), pending.length ? 'text-ink' : 'text-muted'],
          ['Vencido', totalsText(totalsByCurrency(overdue)), overdue.length ? plural(overdue.length, 'cobro', 'cobros') : 'Al día', overdue.length ? 'text-coral-ink' : 'text-teal-ink'],
          [`Cobrado ${summary?.year ?? ''}`, totalsText(summary?.paid_year), plural(summary?.paid_year_count ?? 0, 'pago', 'pagos'), 'text-teal-ink'],
        ].map(([label, value, hint, color]) => (
          <div key={label} className="min-w-0 px-3 py-3 sm:px-5">
            <dt className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
            <dd className={cx('num mt-0.5 break-words text-[15px] font-bold sm:text-lg', color)}>{value}</dd>
            <dd className="truncate text-[11px] text-muted">{hint}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted">{canBill ? 'Las cuotas de cada proyecto (Cobros) aparecen solas el día que tocan; las actualizaciones aceptadas, al aceptarse.' : MONEY_ONLY}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setModal({ kind: 'received' })} disabled={!canBill}><CircleCheck className="h-4 w-4" />Pago recibido</button>
          <button type="button" className="btn btn-soft" onClick={() => setModal({ kind: 'new' })} disabled={!canBill}><Plus className="h-4 w-4" />Nuevo cobro</button>
        </div>
      </div>

      <p className="flex items-center gap-2 bg-surface-2/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5"><Wallet className="h-3.5 w-3.5" aria-hidden="true" />Por pagar · {pending.length}</p>
      {pending.length ? <ul className="divide-y divide-line border-t border-line">{pending.map(item)}</ul>
        : <p className="border-t border-line px-4 py-4 text-sm text-muted sm:px-5">{client.name} está al día.</p>}

      {upcoming.length > 0 && (
        <>
          <p className="flex items-center gap-2 border-t border-line bg-surface-2/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />Próximos programados</p>
          <ul className="divide-y divide-line border-t border-line">
            {upcoming.map((u) => (
              <li key={u.charge_id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{u.concept}</span>
                  <span className="block truncate text-xs text-muted">{[u.project_name, u.every].filter(Boolean).join(' · ')} · {formatDate(u.date)}</span>
                </span>
                <span className="num shrink-0 text-sm font-semibold">{formatMoney(u.amount, u.currency)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="flex items-center gap-2 border-t border-line bg-surface-2/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5"><History className="h-3.5 w-3.5" aria-hidden="true" />Pagado · {paid.length}</p>
      {paid.length ? <ul className="divide-y divide-line border-t border-line">{paid.map(item)}</ul>
        : <p className="border-t border-line px-4 py-4 text-sm text-muted sm:px-5">Todavía sin pagos registrados.</p>}

      {voided.length > 0 && (
        <>
          <button type="button" onClick={() => setShowVoid((v) => !v)} aria-expanded={showVoid}
            className="flex w-full items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted hover:text-ink sm:px-5">
            Anulados · {voided.length}<ChevronDown className={cx('h-4 w-4 transition', showVoid && 'rotate-180')} aria-hidden="true" />
          </button>
          {showVoid && <ul className="divide-y divide-line border-t border-line">{voided.map(item)}</ul>}
        </>
      )}

      <div className="flex items-start gap-3 border-t border-line px-4 py-3 sm:px-5">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <p className="min-w-0 text-xs text-muted">
          <span className="font-semibold text-ink-2">Cómo pagar (lo ve el cliente): </span>
          {paymentInfo ? <span className="whitespace-pre-line">{paymentInfo}</span> : 'Sin definir.'}
          {user.role === 'admin' ? ' Se cambia en Equipo → Ajustes.' : ''}
        </p>
      </div>

      {modal?.kind === 'pay' && <Layer><PayModal payment={modal.payment} onClose={close} onSaved={onReload} /></Layer>}
      {(modal?.kind === 'new' || modal?.kind === 'received' || modal?.kind === 'edit') && (
        <Layer>
          <PaymentModal clientId={client.id} payment={modal.kind === 'edit' ? modal.payment : null} received={modal.kind === 'received'} projects={clientProjects} onClose={close} onSaved={onReload} />
        </Layer>
      )}
      {modal?.kind === 'void' && (
        <Layer>
          <ReasonModal title="Anular cobro" label="Motivo" hint="El cliente deja de verlo. Queda en la bitácora." confirmLabel="Anular cobro" onClose={close}
            onSubmit={(reason) => post(`/api/client-payments/${modal.payment.id}/void`, { reason })} />
        </Layer>
      )}
      {modal?.kind === 'reopen' && (
        <Layer>
          <ReasonModal title="Deshacer pago" label="¿Por qué se deshace?" hint="Vuelve a “por pagar”. Queda en la bitácora." confirmLabel="Deshacer pago" onClose={close}
            onSubmit={(reason) => post(`/api/client-payments/${modal.payment.id}/reopen`, { reason })} />
        </Layer>
      )}
    </>
  );
}
