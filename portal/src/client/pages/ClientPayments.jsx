// Pagos del cliente: lo que tiene por pagar, cómo pagar, lo que viene y lo que ya pagó.
// Solo lectura: JC Analytics registra cada pago al recibirlo. "Avisar que pagué" abre
// WhatsApp con el ejecutivo y el detalle del cobro ya escrito (con la referencia SINPE).
import { Wallet, CircleCheck, CalendarClock, Landmark, MessageCircle, History, Repeat, FolderOpen, AlertTriangle } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageHeader, PageLoader, SectionHead, IconTile, cx } from '../../components/ui.jsx';
import { formatMoney, formatDate, whatsappLink } from '../../lib/format.js';
import { PaymentRow, ContactCard, totalsText, plural, firstName } from '../components.jsx';

/** Mosaico del resumen: etiqueta, monto grande y una pista. */
function Tile({ icon, tone, label, value, hint, strong = false, wide = false }) {
  return (
    <div className={cx('card flex min-w-0 flex-col gap-2 p-4 sm:p-5', strong && 'ring-1 ring-coral/30', wide && 'col-span-2 sm:col-span-1')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        <IconTile icon={icon} tone={tone} size="sm" />
      </div>
      <p className={cx('num break-words font-display font-bold leading-tight', wide ? 'text-[26px]' : 'text-[21px] sm:text-[26px]', tone === 'red' ? 'text-coral-ink' : tone === 'teal' ? 'text-teal-ink' : 'text-ink')}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function ClientPayments() {
  const { contact, client } = useSession();
  const { data, error, reload } = useResource('/api/client/payments');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { payments, summary, upcoming, payment_info: paymentInfo } = data;
  const pending = payments.filter((p) => p.status === 'pendiente');
  const paid = payments.filter((p) => p.status === 'pagado');
  const overdue = summary.overdue_count > 0;
  // "Próximo cobro" es lo que viene según el plan (lo pendiente ya está en "Por pagar").
  const nextUp = upcoming[0] ?? null;

  /** WhatsApp al ejecutivo con el cobro ya escrito, para que mande el comprobante. */
  const notifyPaid = (p) => (contact?.phone
    ? whatsappLink(contact.phone, `Hola ${firstName(contact.name)}, ya pagué "${p.concept}" por ${formatMoney(p.amount, p.currency)}${client?.name ? ` (${client.name})` : ''}. Referencia SINPE: `)
    : null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu cuenta con JC Analytics" title="Pagos" icon={Wallet} tone="teal"
        subtitle="Lo que tenés por pagar y lo que ya pagaste. Registramos cada pago apenas lo recibimos." />

      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Resumen de pagos">
        <Tile wide icon={overdue ? AlertTriangle : Wallet} tone={overdue ? 'red' : summary.pending_count ? 'amber' : 'teal'} strong={overdue}
          label={overdue ? 'Vencido' : 'Por pagar'} value={totalsText(overdue ? summary.overdue : summary.pending)}
          hint={summary.pending_count ? `${plural(summary.pending_count, 'pago pendiente', 'pagos pendientes')}${overdue ? ` · ${summary.overdue_count} vencido${summary.overdue_count === 1 ? '' : 's'}` : ''}` : 'Estás al día'} />
        <Tile icon={CalendarClock} tone="blue" label="Próximo cobro" value={nextUp ? formatMoney(nextUp.amount, nextUp.currency) : '—'}
          hint={nextUp ? `${nextUp.concept} · ${formatDate(nextUp.date)}` : 'Nada programado'} />
        <Tile icon={CircleCheck} tone="teal" label={`Pagado en ${summary.year}`} value={totalsText(summary.paid_year)}
          hint={summary.paid_year_count ? plural(summary.paid_year_count, 'pago registrado', 'pagos registrados') : 'Todavía sin pagos este año'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="pending-title">
            <SectionHead flush id="pending-title" icon={Wallet} tone={overdue ? 'red' : 'amber'} title="Por pagar"
              hint={pending.length ? `Total ${totalsText(summary.pending)}` : 'No tenés pagos pendientes'} />
            {pending.length === 0 ? (
              <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
                <IconTile icon={CircleCheck} tone="teal" />
                <div className="min-w-0">
                  <p className="font-semibold text-teal-ink">Estás al día</p>
                  <p className="mt-0.5 text-sm text-muted">Cuando haya un cobro (una cuota o una actualización que aceptaste), aparece aquí con su fecha.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {pending.map((p) => {
                  const wa = notifyPaid(p);
                  return (
                    <PaymentRow key={p.id} p={p} action={wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm tap w-full sm:w-auto lg:min-h-8">
                        <MessageCircle className="h-3.5 w-3.5 text-teal-ink" />Avisar que pagué
                      </a>
                    )} />
                  );
                })}
              </ul>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="card animate-rise overflow-hidden" aria-labelledby="upcoming-title">
              <SectionHead flush id="upcoming-title" icon={Repeat} tone="blue" title="Cobros programados" hint="Lo que viene, según tu plan" />
              <ul className="divide-y divide-line">
                {upcoming.map((u) => (
                  <li key={u.charge_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <IconTile icon={CalendarClock} tone="blue" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{u.concept}</p>
                      <p className="truncate text-xs text-muted">{[u.project_name, u.frequency !== 'unico' && u.every].filter(Boolean).join(' · ')}</p>
                      <p className="text-xs font-semibold text-brand-ink">El {formatDate(u.date)}</p>
                    </div>
                    <p className="num shrink-0 font-display text-[16px] font-bold text-ink">{formatMoney(u.amount, u.currency)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card animate-rise overflow-hidden" aria-labelledby="paid-title">
            <SectionHead flush id="paid-title" icon={History} tone="teal" title="Historial de pagos"
              hint={paid.length ? plural(paid.length, 'pago registrado', 'pagos registrados') : 'Aquí quedan los pagos que recibimos'} />
            {paid.length === 0
              ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Todavía no hay pagos registrados.</p>
              : <ul className="divide-y divide-line">{paid.map((p) => <PaymentRow key={p.id} p={p} />)}</ul>}
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Cómo pagar y contacto">
          <section className="card animate-rise overflow-hidden" aria-labelledby="how-title">
            <SectionHead flush id="how-title" icon={Landmark} tone="violet" title="Cómo pagar" />
            <div className="px-4 py-4 sm:px-5">
              {paymentInfo
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{paymentInfo}</p>
                : <p className="text-sm text-muted">Tu ejecutivo de cuenta te pasa los datos para pagar por SINPE o transferencia.</p>}
              <p className="mt-3 text-xs text-muted">Después de pagar, avisanos con la referencia y lo registramos.</p>
            </div>
          </section>
          <ContactCard contact={contact} clientName={client?.name} title="Dudas sobre un cobro" className="animate-rise" />
          <Link to="/cliente/documentos" className="card card-hover group animate-rise flex items-center gap-3.5 p-4 sm:p-5">
            <IconTile icon={FolderOpen} tone="violet" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">Facturas y contratos</span>
              <span className="block text-sm text-muted">En tus documentos compartidos.</span>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
