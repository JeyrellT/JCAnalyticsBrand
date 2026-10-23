// Cobros de un proyecto: pagos únicos y cobros recurrentes (semanal, quincenal, mensual…).
// La tarjeta del proyecto muestra el resumen (recurrente al mes y próximo cobro) y la lista;
// solo socios y admin agregan, editan o quitan cobros. El calendario sale de shared/billing.js.
import { useState } from 'react';
import { Receipt, Plus, Pencil, Trash2, CalendarClock, Repeat, Info } from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Badge, IconTile, Modal, Field, SectionHead, useAction, useConfirm, cx } from './ui.jsx';
import { MoneyInput } from './common.jsx';
import { BILLING_FREQUENCIES, isRecurring } from '../../shared/billing.js';
import { PROJECT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatDate, todayKey } from '../lib/format.js';

/** "₡75 000 cada 15 días" · "₡900 000 una sola vez". */
export const chargeText = (c) => `${formatMoney(c.amount, c.currency)} ${BILLING_FREQUENCIES[c.frequency]?.every ?? ''}`.trim();

/**
 * Lo que se muestra como "valor" de un proyecto en listas: si cobra de forma recurrente,
 * el equivalente mensual; si no, su valor. null si no hay nada que mostrar.
 */
export function projectValueText(p) {
  const recurring = (p.charges ?? []).filter((c) => isRecurring(c) && (!c.end_date || c.end_date >= todayKey()));
  if (recurring.length === 1) return chargeText(recurring[0]);
  if (recurring.length > 1) return `≈ ${formatMoney(p.billing.monthly_crc, 'CRC')} al mes`;
  return p.value_amount != null ? formatMoney(p.value_amount, p.currency) : null;
}

const FREQUENCY_ORDER = ['unico', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];

export function ChargeModal({ project, charge, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    concept: charge?.concept ?? '',
    amount: charge?.amount ?? (charge ? null : project.value_amount ?? null),
    currency: charge?.currency ?? project.currency ?? 'CRC',
    frequency: charge?.frequency ?? 'mensual',
    start_date: charge?.start_date ?? todayKey(),
    end_date: charge?.end_date ?? '',
  }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const recurring = form.frequency !== 'unico';
  const monthly = recurring && form.amount > 0 ? Math.round((form.amount * BILLING_FREQUENCIES[form.frequency].perYear) / 12) : null;
  const valid = form.amount > 0 && form.start_date && (!form.end_date || form.end_date >= form.start_date);

  async function save(e) {
    e.preventDefault();
    if (!valid || busy) return;
    const body = { concept: form.concept.trim() || null, amount: form.amount, currency: form.currency, frequency: form.frequency, start_date: form.start_date, end_date: recurring ? form.end_date || null : null };
    const res = await run(() => api(charge ? `/api/charges/${charge.id}` : `/api/projects/${project.id}/charges`, { method: charge ? 'PATCH' : 'POST', body }), { success: charge ? 'Cobro actualizado' : 'Cobro agregado' });
    if (res) { onSaved(res.project); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={charge ? 'Editar cobro' : 'Agregar cobro'}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="charge-form" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Guardando…' : 'Guardar cobro'}</button></>}>
      <form id="charge-form" onSubmit={save} className="space-y-4">
        <Field label="¿Cada cuánto se cobra?">
          {() => (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Frecuencia del cobro">
              {FREQUENCY_ORDER.map((key) => (
                <button key={key} type="button" role="radio" aria-checked={form.frequency === key} onClick={() => set('frequency')(key)}
                  className={cx('chip tap border px-3 text-sm', form.frequency === key ? 'border-brand bg-brand-soft font-semibold text-brand-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}>
                  {BILLING_FREQUENCIES[key].label}
                </button>
              ))}
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label={recurring ? 'Monto de cada cobro' : 'Monto'}>{(id) => <MoneyInput key={form.currency} id={id} currency={form.currency} value={form.amount} onChange={set('amount')} />}</Field>
          <Field label="Moneda">
            {(id) => <select id={id} className="input" value={form.currency} onChange={(e) => set('currency')(e.target.value)}><option value="CRC">Colones (₡)</option><option value="USD">Dólares ($)</option></select>}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={recurring ? 'Primer cobro' : 'Fecha del cobro'} hint={form.frequency === 'quincenal' ? 'Se cobra ese día y 15 días después, cada mes.' : undefined}>
            {(id) => <input id={id} type="date" className="input" value={form.start_date} onChange={(e) => set('start_date')(e.target.value)} required />}
          </Field>
          {recurring && (
            <Field label="Hasta (opcional)" hint="Vacío: sigue hasta que lo quitás.">
              {(id) => <input id={id} type="date" className="input" min={form.start_date} value={form.end_date} onChange={(e) => set('end_date')(e.target.value)} />}
            </Field>
          )}
        </div>
        <Field label="Concepto (opcional)">{(id) => <input id={id} className="input" maxLength={120} value={form.concept} onChange={(e) => set('concept')(e.target.value)} placeholder={recurring ? 'Ej.: Mensualidad de community manager' : 'Ej.: Sitio web, 50 % de anticipo'} />}</Field>
        {monthly != null && (
          <p className="flex items-start gap-2 rounded-xl bg-teal-soft px-3 py-2.5 text-sm text-teal-ink">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{form.frequency === 'mensual' ? 'Equivale a' : 'En promedio equivale a'} <strong className="num">{formatMoney(monthly, form.currency)} al mes</strong> · {formatMoney(monthly * 12, form.currency)} al año.</span>
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Tarjeta "Cobros" del detalle del proyecto. `onProject` recibe el proyecto ya recalculado por el servidor. */
export function ChargesCard({ project: p, onProject }) {
  const { canInvest } = useSession();
  const confirm = useConfirm();
  const [run] = useAction();
  const [editing, setEditing] = useState(null); // null | 'new' | charge
  const charges = p.charges ?? [];
  const billing = p.billing;
  const today = todayKey();

  async function remove(c) {
    const ok = await confirm({ title: '¿Quitar este cobro?', message: `${chargeText(c)}${c.concept ? ` · ${c.concept}` : ''}. Deja de aparecer en el calendario de cobros.`, confirmLabel: 'Quitar', tone: 'danger' });
    if (!ok) return;
    const res = await run(() => api(`/api/charges/${c.id}`, { method: 'DELETE' }), { success: 'Cobro quitado' });
    if (res) onProject(res.project);
  }

  const hint = billing?.recurring_count
    ? `≈ ${formatMoney(billing.monthly_crc, 'CRC')} al mes`
    : charges.length ? 'Pagos únicos' : 'Pago único o recurrente';

  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="charges-title">
      <SectionHead flush id="charges-title" icon={Receipt} tone="teal" title="Cobros" hint={hint}
        action={canInvest && <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing('new')}><Plus className="h-3.5 w-3.5" />Agregar</button>} />
      {charges.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted sm:px-5">
          {canInvest ? 'Indicá cómo paga este cliente: una sola vez o cada semana, quincena, mes…' : 'Todavía no hay cobros configurados.'}
          {p.value_amount ? <> El proyecto vale <span className="num font-semibold text-ink">{formatMoney(p.value_amount, p.currency)}</span>.</> : null}
        </p>
      ) : (
        <>
          {billing?.next && (
            <p className="flex items-center gap-2.5 border-b border-line bg-teal-soft/50 px-4 py-3 text-sm sm:px-5">
              <CalendarClock className="h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />
              <span className="min-w-0 flex-1">Próximo cobro: <span className="font-semibold text-ink first-letter:uppercase">{formatDate(billing.next.date)}</span></span>
              <span className="num shrink-0 font-bold text-ink">{formatMoney(billing.next.amount, billing.next.currency)}</span>
            </p>
          )}
          {billing && !billing.counts && (
            <p className="flex items-start gap-2 border-b border-line bg-surface-2/70 px-4 py-2.5 text-xs text-muted sm:px-5">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              No suma en los totales de cobros mientras el proyecto esté {p.archived ? 'archivado' : `en «${PROJECT_STATUS[p.status]?.label ?? p.status}»`}.
            </p>
          )}
          <ul className="divide-y divide-line">
            {charges.map((c) => {
              const ended = isRecurring(c) ? c.end_date && c.end_date < today : c.start_date < today;
              return (
                <li key={c.id} className={cx('flex items-start gap-3 px-4 py-3 sm:px-5', ended && 'opacity-60')}>
                  <IconTile icon={isRecurring(c) ? Repeat : Receipt} tone={isRecurring(c) ? 'teal' : 'slate'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{chargeText(c)}</p>
                    <p className="text-xs leading-relaxed text-muted">
                      {c.concept ? `${c.concept} · ` : ''}
                      {isRecurring(c)
                        ? <>desde {formatDate(c.start_date)}{c.end_date ? ` hasta ${formatDate(c.end_date)}` : ''}{c.frequency !== 'mensual' ? ` · ≈ ${formatMoney(c.monthly_amount, c.currency)} al mes` : ''}</>
                        : formatDate(c.start_date)}
                    </p>
                    {ended && <Badge className="mt-1">{isRecurring(c) ? 'Terminó' : 'Fecha pasada'}</Badge>}
                  </div>
                  {canInvest && (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" className="btn btn-ghost btn-sm tap" onClick={() => setEditing(c)} aria-label={`Editar cobro ${chargeText(c)}`}><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" className="btn btn-ghost btn-sm tap text-muted hover:text-coral-ink" onClick={() => remove(c)} aria-label={`Quitar cobro ${chargeText(c)}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {canInvest && <p className="border-t border-line bg-surface-2/60 px-4 py-2.5 text-xs text-muted sm:px-5">Todos los cobros del equipo, mes a mes, en <Link to="/cobros" className="link">Cobros</Link>.</p>}
        </>
      )}
      {editing && <ChargeModal project={p} charge={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onProject} />}
    </section>
  );
}
